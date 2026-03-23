import { NextRequest, NextResponse } from 'next/server';

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type CounterBucket = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __rateLimitStore?: Map<string, CounterBucket>;
};

function getStore() {
  if (!globalStore.__rateLimitStore) {
    globalStore.__rateLimitStore = new Map<string, CounterBucket>();
  }
  return globalStore.__rateLimitStore;
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

export function checkRateLimit(request: NextRequest, options: RateLimitOptions) {
  const now = Date.now();
  const store = getStore();
  const scope = `${options.key}:${request.nextUrl.pathname}:${getClientIp(request)}`;
  const existing = store.get(scope);

  if (!existing || existing.resetAt <= now) {
    store.set(scope, { count: 1, resetAt: now + options.windowMs });
    return { ok: true as const };
  }

  if (existing.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }),
    };
  }

  existing.count += 1;
  store.set(scope, existing);
  return { ok: true as const };
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function verifySameOrigin(request: NextRequest) {
  const originHeader = request.headers.get('origin');
  if (!originHeader) return { ok: false as const };

  const requestOrigin = request.nextUrl.origin;
  const allowed = new Set<string>([requestOrigin]);

  const envOrigins = [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_SITE_URL]
    .map((value) => (value ? normalizeOrigin(value) : null))
    .filter(Boolean) as string[];
  for (const origin of envOrigins) allowed.add(origin);

  const normalizedOrigin = normalizeOrigin(originHeader);
  if (!normalizedOrigin) return { ok: false as const };
  return { ok: allowed.has(normalizedOrigin) };
}

export function sanitizeMicrosoftErrorCode(input: unknown) {
  const value = String(input || '').toLowerCase();
  if (!value) return 'microsoft_connect_failed';
  if (value.includes('invalid_state')) return 'invalid_state';
  if (value.includes('access_denied') || value.includes('user canceled')) return 'access_denied';
  if (value.includes('unauthorized')) return 'unauthorized';
  if (value.includes('missing env')) return 'integration_not_configured';
  if (value.includes('token')) return 'token_exchange_failed';
  if (value.includes('invalid_client')) return 'invalid_client';
  return 'microsoft_connect_failed';
}
