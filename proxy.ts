import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const parseCanonicalHost = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return null;
  try {
    return new URL(siteUrl).host.toLowerCase();
  } catch {
    return null;
  }
};

const PUBLIC_ROUTES = ['/login', '/auth', '/api/auth', '/share'];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const userAgent = request.headers.get('user-agent') || '';
  const isNoisePath =
    path === '/manifest.json' ||
    path === '/favicon.ico' ||
    path.startsWith('/_next/') ||
    path.startsWith('/images/') ||
    path.startsWith('/icons/');
  const isKnownBotUa = /(vercel-screenshot|vercel-favicon|HeadlessChrome|bot|crawler|spider)/i.test(userAgent);
  const debugRequestsEnabled = String(process.env.REQUEST_DEBUG_LOGS || '').toLowerCase() === 'true';
  const shouldLog = debugRequestsEnabled && !isNoisePath && !isKnownBotUa;

  if (shouldLog) {
    const authHeader = request.headers.get('authorization') || '';
    const cookieHeader = request.headers.get('cookie') || '';
    console.log({
      ts: new Date().toISOString(),
      correlationId: request.headers.get('x-debug-request-id') || '',
      debugPagePath: request.headers.get('x-debug-page-path') || '',
      method: request.method,
      path,
      search: request.nextUrl.search,
      host: request.headers.get('host') || '',
      referer: request.headers.get('referer') || '',
      origin: request.headers.get('origin') || '',
      userAgent,
      secFetchMode: request.headers.get('sec-fetch-mode') || '',
      secFetchDest: request.headers.get('sec-fetch-dest') || '',
      secFetchSite: request.headers.get('sec-fetch-site') || '',
      hasAuthorization: Boolean(authHeader),
      authorizationPreview: authHeader ? `${authHeader.slice(0, 24)}...` : '',
      cookiePreview: cookieHeader ? `${cookieHeader.slice(0, 160)}...` : '',
    });
  }

  // Canonical host redirect (e.g. non-www -> www, or custom domain enforcement)
  const canonicalHost = parseCanonicalHost();
  if (canonicalHost) {
    const requestHost = request.nextUrl.host.toLowerCase();
    if (requestHost !== canonicalHost) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.host = canonicalHost;
      redirectUrl.protocol = canonicalHost.includes('localhost') ? 'http:' : 'https:';
      return NextResponse.redirect(redirectUrl, 308);
    }
  }

  const withToolHeaders = (response: NextResponse) => {
    if (path.startsWith('/tools/') || path === '/integrations/microsoft/picker') {
      response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
      response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
    }
    return response;
  };

  // Auth check does not apply to API routes, public routes, or static/noise paths
  const isPublicRoute = PUBLIC_ROUTES.some(route => path.startsWith(route));
  if (isPublicRoute || path.startsWith('/api') || isNoisePath) {
    return withToolHeaders(NextResponse.next());
  }

  let response = withToolHeaders(NextResponse.next());

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set(name, value);
          response = withToolHeaders(NextResponse.next());
          response.cookies.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.delete(name);
          response = withToolHeaders(NextResponse.next());
          response.cookies.delete(name);
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
