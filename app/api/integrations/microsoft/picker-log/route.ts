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

function sanitizeUnknown(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 3000 ? `${value.slice(0, 3000)}...[truncated]` : value;
  if (typeof value === 'function') return `[function ${value.name || 'anonymous'}]`;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ? String(value.stack).slice(0, 3000) : null,
    };
  }
  if (Array.isArray(value)) {
    if (depth >= 3) return `[array:${value.length}]`;
    return value.slice(0, 50).map((entry) => sanitizeUnknown(entry, depth + 1));
  }
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (depth >= 3) return { kind: 'object', keys: Object.keys(rec).slice(0, 30) };
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(rec)) {
      out[key] = sanitizeUnknown(raw, depth + 1);
    }
    return out;
  }
  return String(value);
}

function sanitizeRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return sanitizeUnknown(value, 0) as Record<string, unknown>;
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
