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
    const { layoutPattern, startDate, minutesPerDay, preferredDays } = body;

    // Verify ownership
    const { data: studyset } = await (supabase as any)
      .from('studysets')
      .select('owner_id')
      .eq('id', params.studysetId)
      .single();

    if (!studyset || studyset.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Save/update agenda settings
    const { data: saved, error } = await (supabase as any)
      .from('studyset_agenda_settings')
      .upsert({
        studyset_id: params.studysetId,
        layout_pattern: layoutPattern,
        start_date: startDate,
        minutes_per_day: minutesPerDay,
        preferred_days: preferredDays,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'studyset_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Agenda save error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agenda: saved,
    });
  } catch (error) {
    console.error('POST /api/studysets/[studysetId]/agenda error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
