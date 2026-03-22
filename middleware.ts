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

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const cookieHeader = request.headers.get('cookie') || '';
  console.log('[request-debug] middleware', {
    ts: new Date().toISOString(),
    correlationId: request.headers.get('x-debug-request-id') || '',
    debugPagePath: request.headers.get('x-debug-page-path') || '',
    method: request.method,
    path: request.nextUrl.pathname,
    search: request.nextUrl.search,
    host: request.headers.get('host') || '',
    referer: request.headers.get('referer') || '',
    origin: request.headers.get('origin') || '',
    userAgent: request.headers.get('user-agent') || '',
    secFetchMode: request.headers.get('sec-fetch-mode') || '',
    secFetchDest: request.headers.get('sec-fetch-dest') || '',
    secFetchSite: request.headers.get('sec-fetch-site') || '',
    hasAuthorization: Boolean(authHeader),
    authorizationPreview: authHeader ? `${authHeader.slice(0, 24)}...` : '',
    cookiePreview: cookieHeader ? `${cookieHeader.slice(0, 160)}...` : '',
  });

  const canonicalHost = parseCanonicalHost();
  if (!canonicalHost) return NextResponse.next();

  const requestHost = request.nextUrl.host.toLowerCase();
  if (requestHost === canonicalHost) return NextResponse.next();

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.host = canonicalHost;
  redirectUrl.protocol = canonicalHost.includes('localhost') ? 'http:' : 'https:';

  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
