import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listIntegrationIngestionJobs } from '@/lib/integrations/source-store';
import { checkRateLimit } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, { key: 'integration-jobs-get', limit: 120, windowMs: 60_000 });
    if (!rateLimit.ok) return rateLimit.response;

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = request.nextUrl.searchParams.get('provider') || undefined;
    const app = request.nextUrl.searchParams.get('app') || undefined;
    const jobs = await listIntegrationIngestionJobs(supabase, {
      userId: user.id,
      provider,
      app,
      limit: 50,
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || 'Failed to load ingestion jobs') }, { status: 500 });
  }
}
