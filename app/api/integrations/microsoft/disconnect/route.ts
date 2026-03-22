import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteMicrosoftConnection } from '@/lib/integrations/microsoft-store';

export const dynamic = 'force-dynamic';

export async function POST() {
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

    await deleteMicrosoftConnection(supabase, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to disconnect' }, { status: 500 });
  }
}
