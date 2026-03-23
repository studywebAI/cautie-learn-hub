import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { retryIntegrationIngestionJobs } from '@/lib/integrations/source-store';
import { checkRateLimit, verifySameOrigin } from '@/lib/security/request-guards';

const BodySchema = z.object({
  provider: z.enum(['microsoft']).optional(),
  app: z.enum(['word', 'powerpoint', 'excel']).optional(),
  statuses: z.array(z.enum(['error', 'dead'])).optional(),
  limit: z.number().int().min(1).max(200).optional().default(100),
});

export async function POST(request: NextRequest) {
  try {
    const sameOrigin = verifySameOrigin(request);
    if (!sameOrigin.ok) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const rateLimit = checkRateLimit(request, { key: 'integration-jobs-retry', limit: 20, windowMs: 60_000 });
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

    const retried = await retryIntegrationIngestionJobs(supabase, {
      userId: user.id,
      provider: body.provider,
      app: body.app,
      statuses: body.statuses,
      limit: body.limit,
    });

    return NextResponse.json({ retried });
  } catch (error: any) {
    if (error?.issues) {
      return NextResponse.json({ error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error?.message || 'Failed to retry ingestion jobs') }, { status: 500 });
  }
}
