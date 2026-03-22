import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMicrosoftConnection } from '@/lib/integrations/microsoft-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
    return NextResponse.json({ error: error?.message || 'Failed to get status' }, { status: 500 });
  }
}
