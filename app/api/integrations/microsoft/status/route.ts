import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMicrosoftConnection } from '@/lib/integrations/microsoft-store';
import { checkRateLimit } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    console.info('[microsoft-status] request', {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
    });
    const rateLimit = checkRateLimit(request, { key: 'ms-status', limit: 60, windowMs: 60_000 });
    if (!rateLimit.ok) return rateLimit.response;

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[microsoft-status] unauthorized', { requestId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await getMicrosoftConnection(supabase, user.id);
    if (!connection) {
      console.info('[microsoft-status] not-connected', { requestId, userId: user.id });
      return NextResponse.json({ connected: false });
    }

    console.info('[microsoft-status] connected', {
      requestId,
      userId: user.id,
      accountEmail: connection.account_email,
      expiresAt: connection.expires_at,
    });

    return NextResponse.json({
      connected: true,
      provider: 'microsoft',
      account_email: connection.account_email,
      expires_at: connection.expires_at,
      metadata: connection.metadata || {},
    });
  } catch (error: any) {
    const message = String(error?.message || 'Failed to get status');
    const code = String(error?.code || '');
    console.error('[microsoft-status] failed', {
      requestId,
      message,
      code,
      stack: error?.stack || null,
    });
    return NextResponse.json({ error: message || 'Failed to get status', code: code || null }, { status: 500 });
  }
}
