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
