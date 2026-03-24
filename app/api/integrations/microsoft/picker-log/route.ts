import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

const PayloadSchema = z.object({
  level: z.enum(['info', 'warn', 'error']).default('info'),
  event: z.string().min(1).max(120),
  sessionTraceId: z.string().min(1).max(120),
  pickerTraceId: z.string().max(120).optional().nullable(),
  path: z.string().max(300).optional().nullable(),
  at: z.string().max(80).optional().nullable(),
  appId: z.string().max(64).optional().nullable(),
  data: z.record(z.any()).optional().nullable(),
  client: z.object({
    href: z.string().max(500).optional().nullable(),
    referrer: z.string().max(500).optional().nullable(),
    userAgent: z.string().max(500).optional().nullable(),
    visibilityState: z.string().max(32).optional().nullable(),
    online: z.boolean().optional().nullable(),
    language: z.string().max(32).optional().nullable(),
  }).optional().nullable(),
});

function sanitizeRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string') {
      out[key] = raw.length > 1000 ? `${raw.slice(0, 1000)}...[truncated]` : raw;
      continue;
    }
    if (typeof raw === 'number' || typeof raw === 'boolean' || raw === null) {
      out[key] = raw;
      continue;
    }
    if (Array.isArray(raw)) {
      out[key] = raw.slice(0, 50);
      continue;
    }
    if (typeof raw === 'object') {
      out[key] = '[object]';
      continue;
    }
    out[key] = String(raw);
  }
  return out;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const rateLimit = checkRateLimit(request, { key: 'ms-picker-log', limit: 240, windowMs: 60_000 });
    if (!rateLimit.ok) return rateLimit.response;

    let userId: string | null = null;
    try {
      const cookieStore = cookies();
      const supabase = await createClient(cookieStore);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      userId = null;
    }

    const origin = request.headers.get('origin') || null;
    const referer = request.headers.get('referer') || null;
    const secFetchSite = request.headers.get('sec-fetch-site') || null;
    const secFetchMode = request.headers.get('sec-fetch-mode') || null;
    const userAgent = request.headers.get('user-agent') || null;
    const contentLength = request.headers.get('content-length') || null;

    const body = await request.json().catch(() => null);
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      console.warn('[microsoft-picker-client-log] invalid-payload', {
        requestId,
        userId,
        issues: parsed.error.issues.map((issue) => issue.message),
      });
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const payload = parsed.data;
    const baseLog = {
      requestId,
      userId,
      origin,
      referer,
      secFetchSite,
      secFetchMode,
      userAgent,
      contentLength,
      level: payload.level,
      event: payload.event,
      sessionTraceId: payload.sessionTraceId,
      pickerTraceId: payload.pickerTraceId || null,
      appId: payload.appId || null,
      path: payload.path || null,
      at: payload.at || null,
      client: sanitizeRecord(payload.client || {}),
      data: sanitizeRecord(payload.data || {}),
    };

    if (payload.level === 'error') {
      console.error('[microsoft-picker-client-log] event', baseLog);
    } else if (payload.level === 'warn') {
      console.warn('[microsoft-picker-client-log] event', baseLog);
    } else {
      console.info('[microsoft-picker-client-log] event', baseLog);
    }

    return NextResponse.json({ ok: true, requestId });
  } catch (error: any) {
    console.error('[microsoft-picker-client-log] failed', {
      requestId,
      message: String(error?.message || 'unknown'),
      code: String(error?.code || ''),
      stack: error?.stack || null,
    });
    return NextResponse.json({ error: 'Failed to record picker log' }, { status: 500 });
  }
}
