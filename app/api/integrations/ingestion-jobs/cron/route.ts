import { NextRequest, NextResponse } from 'next/server';
import { getProviderAdapter } from '@/lib/integrations/providers/registry';
import { getValidMicrosoftAccessToken } from '@/lib/integrations/microsoft-store';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getIntegrationSourceById,
  updateIntegrationIngestionJob,
  updateIntegrationSourceExtraction,
} from '@/lib/integrations/source-store';

export const dynamic = 'force-dynamic';

function computeNextAttempt(attempts: number) {
  const seconds = Math.min(3600, Math.max(20, Math.pow(2, attempts) * 15));
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function hasValidCronSecret(request: NextRequest) {
  const vercelCron = request.headers.get('x-vercel-cron');
  if (vercelCron === '1') return true;
  const secret = process.env.INTEGRATION_CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!hasValidCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data: jobs, error } = await supabase
      .from('external_integration_ingestion_jobs')
      .select('id, user_id, source_id, provider, app, status, attempts, max_attempts')
      .in('status', ['queued', 'error'])
      .lte('next_attempt_at', nowIso)
      .order('updated_at', { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message || 'Failed to load jobs');
    if (!Array.isArray(jobs) || jobs.length === 0) return NextResponse.json({ processed: 0 });

    const adapter = getProviderAdapter('microsoft');
    let processed = 0;

    for (const job of jobs) {
      const nextAttempts = Number(job.attempts || 0) + 1;
      await updateIntegrationIngestionJob(supabase, {
        jobId: String(job.id),
        status: 'processing',
        attempts: nextAttempts,
        nextAttemptAt: null,
      });

      const userId = String(job.user_id || '');
      const sourceId = String(job.source_id || '');
      const source = await getIntegrationSourceById(supabase, userId, sourceId);
      if (!source) {
        await updateIntegrationIngestionJob(supabase, {
          jobId: String(job.id),
          status: nextAttempts >= Number(job.max_attempts || 5) ? 'dead' : 'error',
          attempts: nextAttempts,
          nextAttemptAt: nextAttempts >= Number(job.max_attempts || 5) ? null : computeNextAttempt(nextAttempts),
          lastError: 'Source not found',
        });
        processed += 1;
        continue;
      }

      const tokenState = await getValidMicrosoftAccessToken(supabase, userId);
      if (!tokenState) {
        await updateIntegrationIngestionJob(supabase, {
          jobId: String(job.id),
          status: nextAttempts >= Number(job.max_attempts || 5) ? 'dead' : 'error',
          attempts: nextAttempts,
          nextAttemptAt: nextAttempts >= Number(job.max_attempts || 5) ? null : computeNextAttempt(nextAttempts),
          lastError: 'Microsoft account not connected',
        });
        processed += 1;
        continue;
      }

      try {
        const extractedText = await adapter.extractContent({
          accessToken: tokenState.accessToken,
          app: source.app as 'word' | 'powerpoint' | 'excel',
          fileId: source.provider_item_id,
        });
        await updateIntegrationSourceExtraction(supabase, {
          sourceId: source.id,
          extractedText: extractedText || null,
          extractionStatus: extractedText.trim() ? 'ready' : 'empty',
          metadata: {
            ...(source.metadata || {}),
            last_ingested_at: new Date().toISOString(),
          },
        });
        await updateIntegrationIngestionJob(supabase, {
          jobId: String(job.id),
          status: 'done',
          attempts: nextAttempts,
          nextAttemptAt: null,
          lastError: null,
        });
      } catch (e: any) {
        await updateIntegrationSourceExtraction(supabase, {
          sourceId: source.id,
          extractedText: source.extracted_text || null,
          extractionStatus: 'error',
          metadata: {
            ...(source.metadata || {}),
            last_ingested_at: new Date().toISOString(),
            ingest_error: String(e?.message || 'Extraction failed'),
          },
        });
        await updateIntegrationIngestionJob(supabase, {
          jobId: String(job.id),
          status: nextAttempts >= Number(job.max_attempts || 5) ? 'dead' : 'error',
          attempts: nextAttempts,
          nextAttemptAt: nextAttempts >= Number(job.max_attempts || 5) ? null : computeNextAttempt(nextAttempts),
          lastError: String(e?.message || 'Extraction failed'),
        });
      }
      processed += 1;
    }

    return NextResponse.json({ processed });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || 'Cron processing failed') }, { status: 500 });
  }
}
