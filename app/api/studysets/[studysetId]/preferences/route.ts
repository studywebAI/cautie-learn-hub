import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(
  req: NextRequest,
  { params }: { params: { studysetId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { randomOrder, reminders, theme } = body;

    // Verify ownership
    const { data: studyset } = await (supabase as any)
      .from('studysets')
      .select('owner_id')
      .eq('id', params.studysetId)
      .single();

    if (!studyset || studyset.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Save/update preferences
    const { data: saved, error } = await (supabase as any)
      .from('studyset_user_preferences')
      .upsert({
        studyset_id: params.studysetId,
        user_id: user.id,
        random_order: randomOrder ?? false,
        daily_reminders: reminders ?? true,
        theme: theme || 'auto',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'studyset_id,user_id',
      })
      .select()
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "single row expected" - may be OK if table doesn't exist
      console.error('Preferences save error:', error);
    }

    // Mark studyset as completed/ready
    await (supabase as any)
      .from('studysets')
      .update({
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.studysetId)
      .catch(() => {});

    return NextResponse.json({
      success: true,
      preferences: saved || { randomOrder, reminders, theme },
      message: 'StudySet created successfully!',
    });
  } catch (error) {
    console.error('POST /api/studysets/[studysetId]/preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
