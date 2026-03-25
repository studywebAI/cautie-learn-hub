import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeMicrosoftCodeForToken, fetchMicrosoftProfile } from '@/lib/integrations/microsoft';
import { upsertMicrosoftConnection } from '@/lib/integrations/microsoft-store';
import { checkRateLimit, sanitizeMicrosoftErrorCode } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

function getOrigin(request: NextRequest) {
  // Prefer the runtime request host to avoid OAuth/picker redirect mismatches on preview domains.
  return request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set('ms_oauth_state', '', { path: '/', maxAge: 0 });
  response.cookies.set('ms_oauth_return_to', '', { path: '/', maxAge: 0 });
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const rateLimit = checkRateLimit(request, { key: 'ms-callback', limit: 30, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimit.response;

  const cookieStorePromise = cookies();
  const cookieStore = await cookieStorePromise;
  const supabase = await createClient(cookieStorePromise);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const expectedState = cookieStore.get('ms_oauth_state')?.value || '';
  const returnTo = cookieStore.get('ms_oauth_return_to')?.value || '/tools/studyset';
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const oauthError = request.nextUrl.searchParams.get('error_description') || request.nextUrl.searchParams.get('error');
  const oauthErrorCode = request.nextUrl.searchParams.get('error') || '';

  const doneUrl = new URL(returnTo.startsWith('/') ? returnTo : '/tools/studyset', getOrigin(request));
  const redirectUri = `${getOrigin(request)}/api/integrations/microsoft/callback`;

  console.info('[microsoft-callback] request', {
    requestId,
    hasCode: Boolean(code),
    hasState: Boolean(state),
    hasExpectedState: Boolean(expectedState),
    hasOAuthError: Boolean(oauthError),
    returnTo,
  });

  if (!user) {
    console.warn('[microsoft-callback] unauthorized', { requestId });
    doneUrl.searchParams.set('ms_error', sanitizeMicrosoftErrorCode('unauthorized'));
    const response = NextResponse.redirect(doneUrl);
    clearOAuthCookies(response);
    return response;
  }

  if (oauthError) {
    console.warn('[microsoft-callback] provider-error', { requestId, oauthError });
    doneUrl.searchParams.set('ms_error', sanitizeMicrosoftErrorCode(oauthError));
    if (oauthErrorCode) doneUrl.searchParams.set('ms_error_code', oauthErrorCode.slice(0, 80));
    const response = NextResponse.redirect(doneUrl);
    clearOAuthCookies(response);
    return response;
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    console.warn('[microsoft-callback] invalid-state', {
      requestId,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasExpectedState: Boolean(expectedState),
      stateMatches: Boolean(state && expectedState && state === expectedState),
    });
    doneUrl.searchParams.set('ms_error', sanitizeMicrosoftErrorCode('invalid_state'));
    doneUrl.searchParams.set('ms_error_code', 'invalid_state');
    const response = NextResponse.redirect(doneUrl);
    clearOAuthCookies(response);
    return response;
  }

  try {
    const token = await exchangeMicrosoftCodeForToken({ code, redirectUri });
    const profile = await fetchMicrosoftProfile(token.access_token);
    const expiresAt = new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString();
    const grantedScopes = String(token.scope || '')
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean);
    const grantedSet = new Set(grantedScopes.map((scope) => scope.toLowerCase()));
    const requiredScopes = ['user.read', 'files.read'];
    const missingScopes = requiredScopes.filter((scope) => !grantedSet.has(scope));

    await upsertMicrosoftConnection(supabase, {
      userId: user.id,
      providerAccountId: profile.id || null,
      accountEmail: profile.mail || profile.userPrincipalName || null,
      scope: token.scope || null,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || null,
      expiresAt,
      metadata: {
        display_name: profile.displayName || null,
      },
    });

    doneUrl.searchParams.set('ms', 'connected');
    console.info('[microsoft-callback] success', {
      requestId,
      userId: user.id,
      accountEmail: profile.mail || profile.userPrincipalName || null,
      scope: token.scope || null,
      grantedScopes,
      missingScopes,
      returnTo,
    });
    const response = NextResponse.redirect(doneUrl);
    clearOAuthCookies(response);
    return response;
  } catch (error: any) {
    console.error('[microsoft-callback] failed', {
      requestId,
      message: String(error?.message || 'callback_failed'),
      code: String(error?.code || ''),
      stack: error?.stack || null,
    });
    doneUrl.searchParams.set('ms_error', sanitizeMicrosoftErrorCode(error?.message || 'callback_failed'));
    if (error?.code) doneUrl.searchParams.set('ms_error_code', String(error.code).slice(0, 80));
    const response = NextResponse.redirect(doneUrl);
    clearOAuthCookies(response);
    return response;
  }
}
