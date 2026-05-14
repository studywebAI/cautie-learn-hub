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

    // Check if this is the new plan format (from Step4Review)
    if (body.plan) {
      const { plan } = body;

      // Verify ownership
      const { data: studyset } = await (supabase as any)
        .from('studysets')
        .select('owner_id')
        .eq('id', params.studysetId)
        .single();

      if (!studyset || studyset.owner_id !== user.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      // Create calendar events for each day in the plan
      const eventIds: string[] = [];

      for (const day of plan.days) {
        const { data: event, error: eventError } = await (supabase as any)
          .from('calendar_events')
          .insert({
            user_id: user.id,
            studyset_id: params.studysetId,
            title: `Study: ${day.dayName}`,
            description: `${day.tasks.length} tasks planned`,
            start_date: day.date,
            end_date: day.date,
            event_type: 'study_session',
            metadata: {
              tasks: day.tasks,
              dayName: day.dayName,
            },
          })
          .select('id')
          .single();

        if (!eventError && event) {
          eventIds.push(event.id);
        }
      }

      // Update studyset with generated plan and event IDs
      await (supabase as any)
        .from('studysets')
        .update({
          generated_plan: plan,
          agenda_event_ids: eventIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.studysetId);

      return NextResponse.json({
        success: true,
        eventIds,
      });
    }

    // Original agenda settings format (for backward compatibility)
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
