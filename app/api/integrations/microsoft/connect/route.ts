import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildMicrosoftAuthUrl } from '@/lib/integrations/microsoft';
import { checkRateLimit, sanitizeMicrosoftErrorCode } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

function getOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, { key: 'ms-connect', limit: 20, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimit.response;

  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL('/login?error=unauthorized', getOrigin(request)));
    }

    const returnToRaw = request.nextUrl.searchParams.get('returnTo') || '/tools/studyset';
    const returnTo = returnToRaw.startsWith('/') ? returnToRaw : '/tools/studyset';
    const state = randomBytes(24).toString('hex');
    const redirectUri = `${getOrigin(request)}/api/integrations/microsoft/callback`;

    const authUrl = buildMicrosoftAuthUrl({ redirectUri, state });
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

    return response;
  } catch (error: any) {
    const url = new URL('/tools/studyset', getOrigin(request));
    url.searchParams.set('ms_error', sanitizeMicrosoftErrorCode(error?.message));
    return NextResponse.redirect(url);
  }
}
