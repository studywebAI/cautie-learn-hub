import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeMicrosoftCodeForToken, fetchMicrosoftProfile } from '@/lib/integrations/microsoft';
import { upsertMicrosoftConnection } from '@/lib/integrations/microsoft-store';

export const dynamic = 'force-dynamic';

function getOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set('ms_oauth_state', '', { path: '/', maxAge: 0 });
  response.cookies.set('ms_oauth_return_to', '', { path: '/', maxAge: 0 });
}

export async function GET(request: NextRequest) {
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

  const doneUrl = new URL(returnTo.startsWith('/') ? returnTo : '/tools/studyset', getOrigin(request));
  const redirectUri = `${getOrigin(request)}/api/integrations/microsoft/callback`;

  if (!user) {
    doneUrl.searchParams.set('ms_error', 'unauthorized');
    const response = NextResponse.redirect(doneUrl);
    clearOAuthCookies(response);
    return response;
  }

  if (oauthError) {
    doneUrl.searchParams.set('ms_error', oauthError);
    const response = NextResponse.redirect(doneUrl);
    clearOAuthCookies(response);
    return response;
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    doneUrl.searchParams.set('ms_error', 'invalid_state');
    const response = NextResponse.redirect(doneUrl);
    clearOAuthCookies(response);
    return response;
  }

  try {
    const token = await exchangeMicrosoftCodeForToken({ code, redirectUri });
    const profile = await fetchMicrosoftProfile(token.access_token);
    const expiresAt = new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString();

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
    const response = NextResponse.redirect(doneUrl);
    clearOAuthCookies(response);
    return response;
  } catch (error: any) {
    doneUrl.searchParams.set('ms_error', error?.message || 'callback_failed');
    const response = NextResponse.redirect(doneUrl);
    clearOAuthCookies(response);
    return response;
  }
}
