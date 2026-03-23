import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteMicrosoftConnection } from '@/lib/integrations/microsoft-store';
import { checkRateLimit, verifySameOrigin } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const sameOrigin = verifySameOrigin(request);
    if (!sameOrigin.ok) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const rateLimit = checkRateLimit(request, { key: 'ms-disconnect', limit: 15, windowMs: 60_000 });
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

    await deleteMicrosoftConnection(supabase, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
