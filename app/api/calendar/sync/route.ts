import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch calendar events from the user's tasks/assignments
    const { data: assignments, error } = await (supabase as any)
      .from('assignments')
      .select('id, title, due_date, is_visible, created_at')
      .order('due_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform assignments into calendar events
    const events = (assignments || [])
      .filter((a: any) => a.due_date)
      .map((a: any) => ({
        id: a.id,
        title: a.title,
        date: a.due_date,
        type: 'assignment',
        visible: a.is_visible,
      }));

    return NextResponse.json({ events, status: 'synced' });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, events } = await request.json();

    switch (action) {
      case 'create_event': {
        // Create a new calendar event (stored as a task or reminder)
        if (!events || events.length === 0) {
          return NextResponse.json({ error: 'No events provided' }, { status: 400 });
        }

        const results = [];
        for (const event of events) {
          const { data, error } = await (supabase as any)
            .from('calendar_events')
            .insert({
              user_id: user.id,
              title: event.title,
              date: event.date,
              description: event.description || '',
              type: event.type || 'reminder',
            })
            .select()
            .single();

          if (error) {
            console.error('Event creation error:', error);
            continue;
          }
          results.push(data);
        }

        return NextResponse.json({
          createdEvents: results.length,
          events: results,
        });
      }

      case 'export_ical': {
        // Generate iCal format for external calendar import
        const { data: assignments } = await (supabase as any)
          .from('assignments')
          .select('id, title, due_date, created_at')
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true });

        const icalEvents = (assignments || []).map((a: any) => {
          const date = new Date(a.due_date);
          const dtStamp = new Date(a.created_at).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const dtStart = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          return [
            'BEGIN:VEVENT',
            `UID:${a.id}@studyapp`,
            `DTSTART:${dtStart}`,
            `DTSTAMP:${dtStamp}`,
            `SUMMARY:${a.title}`,
            'END:VEVENT',
          ].join('\r\n');
        });

        const ical = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//StudyApp//EN',
          ...icalEvents,
          'END:VCALENDAR',
        ].join('\r\n');

        return new NextResponse(ical, {
          headers: {
            'Content-Type': 'text/calendar',
            'Content-Disposition': 'attachment; filename="study-calendar.ics"',
          },
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: create_event, export_ical' }, { status: 400 });
    }
  } catch (error) {
    console.error('Calendar error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
