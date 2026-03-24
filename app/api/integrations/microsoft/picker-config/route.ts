import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

function getOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const rateLimit = checkRateLimit(request, { key: 'ms-picker-config', limit: 60, windowMs: 60_000 });
    if (!rateLimit.ok) return rateLimit.response;

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[microsoft-picker-config] unauthorized', { requestId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID || '';
    if (!clientId) {
      console.error('[microsoft-picker-config] missing client id', { requestId, userId: user.id });
      return NextResponse.json({ error: 'Microsoft app credentials are missing on server.' }, { status: 500 });
    }

    const redirectUri = `${getOrigin(request)}/integrations/microsoft/picker`;
    console.info('[microsoft-picker-config] ok', {
      requestId,
      userId: user.id,
      redirectUri,
    });

    return NextResponse.json({
      clientId,
      redirectUri,
    });
  } catch (error: any) {
    console.error('[microsoft-picker-config] failed', {
      requestId,
      message: String(error?.message || 'unknown'),
      code: String(error?.code || ''),
      stack: error?.stack || null,
    });
    return NextResponse.json({ error: 'Failed to load picker config' }, { status: 500 });
  }
}

