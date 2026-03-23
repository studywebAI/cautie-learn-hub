import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationAppById, isEnabledIntegrationAppId } from '@/lib/integrations/catalog';
import { createClient } from '@/lib/supabase/server';
import { getValidMicrosoftAccessToken } from '@/lib/integrations/microsoft-store';
import { listMicrosoftFiles, MicrosoftFileKind } from '@/lib/integrations/microsoft';
import { checkRateLimit } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, { key: 'ms-files', limit: 40, windowMs: 60_000 });
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

    const kind = request.nextUrl.searchParams.get('kind');
    const appConfig = kind && isEnabledIntegrationAppId(kind) ? getIntegrationAppById(kind) : null;
    if (!appConfig || appConfig.provider !== 'microsoft') {
      return NextResponse.json({ error: "Query param 'kind' must be a supported Microsoft app" }, { status: 400 });
    }
    const query = request.nextUrl.searchParams.get('q') || '';

    const tokenState = await getValidMicrosoftAccessToken(supabase, user.id);
    if (!tokenState) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 404 });
    }

    const items = await listMicrosoftFiles({
      accessToken: tokenState.accessToken,
      kind: kind as MicrosoftFileKind,
      query,
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}
