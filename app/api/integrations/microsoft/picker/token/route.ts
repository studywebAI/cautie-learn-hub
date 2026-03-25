import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getMicrosoftAccessTokenForResource } from '@/lib/integrations/microsoft-store';
import { checkRateLimit, verifySameOrigin } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  command: z.string().optional(),
  resource: z.string().optional(),
  type: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  const rateLimit = checkRateLimit(request, { key: 'ms-picker-token', limit: 120, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimit.response;

  try {
    const body = BodySchema.parse(await request.json().catch(() => ({})));
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokenState = await getMicrosoftAccessTokenForResource(supabase, user.id, body.resource || null);
    if (!tokenState?.accessToken) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 404 });
    }

    console.info('[microsoft-picker-token] issued', {
      requestId,
      userId: user.id,
      command: body.command || null,
      resource: body.resource || null,
      type: body.type || null,
      scope: tokenState.connection?.scope || null,
      tokenExpiresAt: tokenState.connection?.expires_at || null,
    });

    return NextResponse.json({
      token: tokenState.accessToken,
      scope: tokenState.connection?.scope || null,
      expiresAt: tokenState.connection?.expires_at || null,
    });
  } catch (error: any) {
    if (error?.issues) {
      return NextResponse.json({ error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    console.error('[microsoft-picker-token] failed', {
      requestId,
      message: String(error?.message || 'unknown'),
      stack: error?.stack || null,
    });
    return NextResponse.json({ error: 'Failed to issue picker token' }, { status: 500 });
  }
}
