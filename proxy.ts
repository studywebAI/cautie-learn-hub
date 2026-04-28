import { NextRequest, NextResponse } from 'next/server';

const parseCanonicalHost = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return null;
  try {
    return new URL(siteUrl).host.toLowerCase();
  } catch {
    return null;
  }
};

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const userAgent = request.headers.get('user-agent') || '';
  const isNoisePath =
    path === '/manifest.json' ||
    path === '/favicon.ico' ||
    path.startsWith('/_next/') ||
    path.startsWith('/images/') ||
    path.startsWith('/icons/');
  const isKnownBotUa = /(vercel-screenshot|vercel-favicon|HeadlessChrome|bot|crawler|spider)/i.test(userAgent);
  const shouldLog = !isNoisePath && !isKnownBotUa;

  if (shouldLog) {
    const authHeader = request.headers.get('authorization') || '';
    const cookieHeader = request.headers.get('cookie') || '';
    console.log('[request-debug] proxy', {
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

  const canonicalHost = parseCanonicalHost();
  if (!canonicalHost) {
    const response = NextResponse.next();
    if (path.startsWith('/tools/') || path === '/integrations/microsoft/picker') {
      response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
      response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
    }
    return response;
  }

  const requestHost = request.nextUrl.host.toLowerCase();
  if (requestHost === canonicalHost) {
    const response = NextResponse.next();
    if (path.startsWith('/tools/') || path === '/integrations/microsoft/picker') {
      response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
      response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
    }
    return response;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.host = canonicalHost;
  redirectUrl.protocol = canonicalHost.includes('localhost') ? 'http:' : 'https:';

  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
