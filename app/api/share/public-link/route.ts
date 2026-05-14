import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

type SharePayload = {
  kind: 'tool_run' | 'link';
  id?: string;
  title: string;
  href: string;
  exp: number;
};

const SENSITIVE_KEY_PATTERN = /(token|secret|password|api[-_]?key|authorization|cookie|session)/i;

function redactSensitive(value: any): any {
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item));
  if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactSensitive(val);
      }
    }
    return result;
  }
  if (typeof value === 'string' && value.length > 4000) {
    return `${value.slice(0, 4000)}...[TRUNCATED]`;
  }
  return value;
}

function getSecret() {
  return (
    process.env.SHARE_LINK_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'cautie-share-fallback-secret'
  );
}

function b64urlEncode(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function b64urlDecode(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(payloadB64: string) {
  return createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
}

function makeToken(payload: SharePayload) {
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

function parseAndVerifyToken(token: string): SharePayload | null {
  const [payloadB64, sig] = String(token || '').split('.');
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  const actualBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(actualBuf, expectedBuf)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(payloadB64)) as SharePayload;
    if (!payload?.kind || !payload?.title || !payload?.href) return null;
    if (!payload?.exp || Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

function sanitizeShareHref(input: unknown): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const source = String(body?.source || '').toLowerCase();
    const id = String(body?.id || '');
    const title = String(body?.title || 'Shared item').slice(0, 180);
    const href = sanitizeShareHref(body?.href);
    if (!href) return NextResponse.json({ error: 'Invalid share URL' }, { status: 400 });
    const expiresInDaysRaw = Number(body?.expiresInDays || 30);
    const expiresInDays = Number.isFinite(expiresInDaysRaw)
      ? Math.min(30, Math.max(1, Math.floor(expiresInDaysRaw)))
      : 30;
    const expiresMs = 1000 * 60 * 60 * 24 * expiresInDays;

    if (source === 'tool_run') {
      if (!id) return NextResponse.json({ error: 'run id missing' }, { status: 400 });
      const { data: run, error } = await (supabase as any)
        .from('tool_runs')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error || !run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
      const token = makeToken({
        kind: 'tool_run',
        id,
        title,
        href,
        exp: Date.now() + expiresMs,
      });
      return NextResponse.json({ token, url: `/shared/view?token=${encodeURIComponent(token)}` });
    }

    const token = makeToken({
      kind: 'link',
      title,
      href,
      exp: Date.now() + expiresMs,
    });
    return NextResponse.json({ token, url: `/shared/view?token=${encodeURIComponent(token)}` });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    const payload = parseAndVerifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });

    if (payload.kind === 'tool_run' && payload.id) {
      const cookieStore = cookies();
      const supabase = await createClient(cookieStore);
      const { data: run, error } = await (supabase as any)
        .from('tool_runs')
        .select('id, tool_id, mode, input_payload, options_payload, output_payload, created_at, finished_at')
        .eq('id', payload.id)
        .maybeSingle();
      if (error || !run) return NextResponse.json({ error: 'Shared run not found' }, { status: 404 });
      return NextResponse.json({
        kind: 'tool_run',
        title: payload.title,
        href: payload.href,
        run: {
          ...run,
          input_payload: redactSensitive((run as any).input_payload),
          options_payload: redactSensitive((run as any).options_payload),
          output_payload: redactSensitive((run as any).output_payload),
        },
      });
    }

    return NextResponse.json({
      kind: 'link',
      title: payload.title,
      href: payload.href,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
