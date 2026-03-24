import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildMicrosoftAuthUrl } from '@/lib/integrations/microsoft';
import { getValidMicrosoftAccessToken } from '@/lib/integrations/microsoft-store';
import { checkRateLimit, sanitizeMicrosoftErrorCode } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

function getOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
}

function parseScopeSet(value: string | null | undefined) {
  return new Set(
    String(value || '')
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean)
      .map((scope) => scope.toLowerCase())
  );
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const traceId = request.nextUrl.searchParams.get('traceId') || crypto.randomUUID();
  const rateLimit = checkRateLimit(request, { key: 'ms-connect', limit: 20, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimit.response;

  try {
    console.info('[microsoft-connect] request', {
      requestId,
      traceId,
      path: request.nextUrl.pathname,
      search: request.nextUrl.search,
    });
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[microsoft-connect] unauthorized', { requestId, traceId });
      return NextResponse.redirect(new URL('/login?error=unauthorized', getOrigin(request)));
    }

    const returnToRaw = request.nextUrl.searchParams.get('returnTo') || '/tools/studyset';
    const returnTo = returnToRaw.startsWith('/') ? returnToRaw : '/tools/studyset';

    // If already connected with a usable token and required scopes, skip OAuth roundtrip.
    const existingToken = await getValidMicrosoftAccessToken(supabase, user.id).catch((error: any) => {
      console.warn('[microsoft-connect] existing-token-check-failed', {
        requestId,
        traceId,
        userId: user.id,
        message: String(error?.message || 'unknown'),
      });
      return null;
    });
    const requiredScopes = ['files.read.all'];
    const existingScopes = parseScopeSet(existingToken?.connection?.scope || '');
    const missingScopes = requiredScopes.filter((scope) => !existingScopes.has(scope));
    const needsScopeUpgrade = missingScopes.length > 0;
    if (existingToken?.accessToken && !needsScopeUpgrade) {
      const doneUrl = new URL(returnTo, getOrigin(request));
      doneUrl.searchParams.set('ms', 'connected');
      console.info('[microsoft-connect] already-connected-short-circuit', {
        requestId,
        traceId,
        userId: user.id,
        returnTo,
        scope: existingToken.connection?.scope || null,
        tokenExpiresAt: existingToken.connection?.expires_at || null,
      });
      return NextResponse.redirect(doneUrl);
    }

    if (existingToken?.accessToken && needsScopeUpgrade) {
      console.info('[microsoft-connect] scope-upgrade-required', {
        requestId,
        traceId,
        userId: user.id,
        currentScope: existingToken.connection?.scope || null,
        missingScopes,
      });
    }

    const state = randomBytes(24).toString('hex');
    const redirectUri = `${getOrigin(request)}/api/integrations/microsoft/callback`;

    const authUrl = buildMicrosoftAuthUrl({
      redirectUri,
      state,
      prompt: needsScopeUpgrade ? 'consent' : undefined,
    });
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('ms_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    });
    response.cookies.set('ms_oauth_return_to', returnTo, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    });

    console.info('[microsoft-connect] redirect', {
      requestId,
      traceId,
      userId: user.id,
      returnTo,
      redirectUri,
    });
    return response;
  } catch (error: any) {
    console.error('[microsoft-connect] failed', {
      requestId,
      traceId,
      message: String(error?.message || 'unknown'),
      code: String(error?.code || ''),
      stack: error?.stack || null,
    });
    const url = new URL('/tools/studyset', getOrigin(request));
    url.searchParams.set('ms_error', sanitizeMicrosoftErrorCode(error?.message));
    return NextResponse.redirect(url);
  }
}
