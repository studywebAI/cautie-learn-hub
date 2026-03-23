import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMicrosoftConnection } from '@/lib/integrations/microsoft-store';
import { checkRateLimit } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, { key: 'ms-status', limit: 60, windowMs: 60_000 });
    if (!rateLimit.ok) return rateLimit.response;

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await getMicrosoftConnection(supabase, user.id);
    if (!connection) {
      return NextResponse.json({ connected: false });
    }

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
      message,
      code,
      stack: error?.stack || null,
    });
    return NextResponse.json({ error: message || 'Failed to get status', code: code || null }, { status: 500 });
  }
}
