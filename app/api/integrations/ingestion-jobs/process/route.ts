import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getValidMicrosoftAccessToken } from '@/lib/integrations/microsoft-store';
import { getProviderAdapter } from '@/lib/integrations/providers/registry';
import {
  getIntegrationSourceById,
  listIntegrationIngestionJobs,
  updateIntegrationIngestionJob,
  updateIntegrationSourceExtraction,
} from '@/lib/integrations/source-store';
import { checkRateLimit, verifySameOrigin } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  provider: z.enum(['microsoft']).optional(),
  app: z.enum(['word', 'powerpoint', 'excel']).optional(),
  maxJobs: z.number().int().min(1).max(25).optional().default(10),
});

function computeNextAttempt(attempts: number) {
  const seconds = Math.min(3600, Math.max(20, Math.pow(2, attempts) * 15));
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const sameOrigin = verifySameOrigin(request);
    if (!sameOrigin.ok) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const rateLimit = checkRateLimit(request, { key: 'integration-jobs-process', limit: 30, windowMs: 60_000 });
    if (!rateLimit.ok) return rateLimit.response;

    const body = BodySchema.parse(await request.json().catch(() => ({})));
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await listIntegrationIngestionJobs(supabase, {
      userId: user.id,
      provider: body.provider,
      app: body.app,
      statuses: ['queued', 'error'],
      runnableOnly: true,
      limit: body.maxJobs,
    });
    if (jobs.length === 0) return NextResponse.json({ processed: 0, jobs: [] });

    const tokenState = await getValidMicrosoftAccessToken(supabase, user.id);
    if (!tokenState) return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 404 });

    const adapter = getProviderAdapter('microsoft');
    const results: Array<{ jobId: string; status: string; sourceId: string }> = [];

    for (const job of jobs) {
      const nextAttempts = (job.attempts || 0) + 1;
      await updateIntegrationIngestionJob(supabase, {
        jobId: job.id,
        status: 'processing',
        attempts: nextAttempts,
        nextAttemptAt: null,
      });

      const source = await getIntegrationSourceById(supabase, user.id, job.source_id);
      if (!source) {
        await updateIntegrationIngestionJob(supabase, {
          jobId: job.id,
          status: nextAttempts >= (job.max_attempts || 5) ? 'dead' : 'error',
          attempts: nextAttempts,
          nextAttemptAt: nextAttempts >= (job.max_attempts || 5) ? null : computeNextAttempt(nextAttempts),
          lastError: 'Source not found',
        });
        results.push({ jobId: job.id, status: nextAttempts >= (job.max_attempts || 5) ? 'dead' : 'error', sourceId: job.source_id });
        continue;
      }

      try {
        const extractedText = await adapter.extractContent({
          accessToken: tokenState.accessToken,
          app: source.app as 'word' | 'powerpoint' | 'excel',
          fileId: source.provider_item_id,
        });
        const nextStatus = extractedText.trim().length > 0 ? 'ready' : 'empty';
        await updateIntegrationSourceExtraction(supabase, {
          sourceId: source.id,
          extractedText: extractedText || null,
          extractionStatus: nextStatus,
          metadata: {
            ...(source.metadata || {}),
            last_ingested_at: new Date().toISOString(),
          },
        });
        await updateIntegrationIngestionJob(supabase, {
          jobId: job.id,
          status: 'done',
          attempts: nextAttempts,
          nextAttemptAt: null,
          lastError: null,
        });
        results.push({ jobId: job.id, status: 'done', sourceId: job.source_id });
      } catch (error: any) {
        await updateIntegrationSourceExtraction(supabase, {
          sourceId: source.id,
          extractedText: source.extracted_text || null,
          extractionStatus: 'error',
          metadata: {
            ...(source.metadata || {}),
            last_ingested_at: new Date().toISOString(),
            ingest_error: String(error?.message || 'Extraction failed'),
          },
        });
        await updateIntegrationIngestionJob(supabase, {
          jobId: job.id,
          status: nextAttempts >= (job.max_attempts || 5) ? 'dead' : 'error',
          attempts: nextAttempts,
          nextAttemptAt: nextAttempts >= (job.max_attempts || 5) ? null : computeNextAttempt(nextAttempts),
          lastError: String(error?.message || 'Extraction failed'),
        });
        results.push({ jobId: job.id, status: nextAttempts >= (job.max_attempts || 5) ? 'dead' : 'error', sourceId: job.source_id });
      }
    }

    return NextResponse.json({ processed: results.length, jobs: results });
  } catch (error: any) {
    if (error?.issues) {
      return NextResponse.json({ error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error?.message || 'Failed to process ingestion jobs') }, { status: 500 });
  }
}
