import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidMicrosoftAccessToken } from '@/lib/integrations/microsoft-store';
import { checkRateLimit } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

function getOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const traceId = request.nextUrl.searchParams.get('traceId') || crypto.randomUUID();
  const appId = request.nextUrl.searchParams.get('app') || 'unknown';
  try {
    console.info('[microsoft-picker-config] request', {
      requestId,
      traceId,
      appId,
      method: request.method,
      path: request.nextUrl.pathname,
      search: request.nextUrl.search,
    });

    const rateLimit = checkRateLimit(request, { key: 'ms-picker-config', limit: 60, windowMs: 60_000 });
    if (!rateLimit.ok) {
      console.warn('[microsoft-picker-config] rate-limited', { requestId, traceId, appId });
      return rateLimit.response;
    }

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[microsoft-picker-config] unauthorized', { requestId, traceId, appId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID || '';
    if (!clientId) {
      console.error('[microsoft-picker-config] missing client id', { requestId, traceId, appId, userId: user.id });
      return NextResponse.json({ error: 'Microsoft app credentials are missing on server.' }, { status: 500 });
    }

    const tokenState = await getValidMicrosoftAccessToken(supabase, user.id).catch((error: any) => {
      console.error('[microsoft-picker-config] token-load-failed', {
        requestId,
        traceId,
        appId,
        userId: user.id,
        message: String(error?.message || 'unknown'),
      });
      return null;
    });

    const loginHint = tokenState?.connection?.account_email || null;
    const scope = tokenState?.connection?.scope || null;
    const metadataKeys = tokenState?.connection?.metadata ? Object.keys(tokenState.connection.metadata) : [];
    const endpointHint = typeof tokenState?.connection?.metadata?.endpoint_hint === 'string'
      ? String(tokenState.connection.metadata.endpoint_hint)
      : null;
    const isConsumerAccount = typeof tokenState?.connection?.metadata?.is_consumer_account === 'boolean'
      ? Boolean(tokenState.connection.metadata.is_consumer_account)
      : null;

    const redirectUri = `${getOrigin(request)}/integrations/microsoft/picker`;
    console.info('[microsoft-picker-config] ok', {
      requestId,
      traceId,
      appId,
      userId: user.id,
      origin: getOrigin(request),
      redirectUri,
      clientIdSuffix: clientId.slice(-6),
      hasAccessToken: Boolean(tokenState?.accessToken),
      hasLoginHint: Boolean(loginHint),
      hasEndpointHint: Boolean(endpointHint),
      scope,
      metadataKeys,
      isConsumerAccount,
      tokenExpiresAt: tokenState?.connection?.expires_at || null,
      tokenLength: tokenState?.accessToken ? tokenState.accessToken.length : 0,
    });

    return NextResponse.json({
      clientId,
      redirectUri,
      accessToken: tokenState?.accessToken || null,
      loginHint,
      endpointHint,
      scope,
      isConsumerAccount,
      tokenExpiresAt: tokenState?.connection?.expires_at || null,
    });
  } catch (error: any) {
    console.error('[microsoft-picker-config] failed', {
      requestId,
      traceId,
      appId,
      message: String(error?.message || 'unknown'),
      code: String(error?.code || ''),
      stack: error?.stack || null,
    });
    return NextResponse.json({ error: 'Failed to load picker config' }, { status: 500 });
  }
}
