import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Helper function to check and update assignment visibility/locking based on schedules
async function checkAndUpdateAssignments() {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const now = new Date().toISOString();

  // Get all assignments with schedules
  const { data: assignments, error: assignmentsError } = await supabase
    .from('assignments')
    .select('*')
    .or('scheduled_start_at.not.is.null,scheduled_end_at.not.is.null,scheduled_answer_release_at.not.is.null');

  if (assignmentsError) {
    console.error('Error fetching scheduled assignments:', assignmentsError);
    return;
  }

  for (const assignment of assignments) {
    const updates: any = {};

    // Check if assignment should become visible
    if (assignment.scheduled_start_at && assignment.scheduled_start_at <= now && !assignment.is_visible) {
      updates.is_visible = true;
    }

    // Check if assignment should become locked
    if (assignment.scheduled_end_at && assignment.scheduled_end_at <= now && !assignment.is_locked) {
      updates.is_locked = true;
    }

    // Check if answers should be released
    if (assignment.scheduled_answer_release_at && assignment.scheduled_answer_release_at <= now && !assignment.answers_enabled) {
      updates.answers_enabled = true;
    }

    // Update assignment if there are changes
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('assignments')
        .update(updates)
        .eq('id', assignment.id);
      
      console.log(`Updated assignment ${assignment.id}:`, updates);
    }
  }
  } catch (error) {
    console.error('Error checking assignments:', error);
  }
}

// POST endpoint for cron job trigger
export async function POST(request: Request) {
  try {
    // Verify this is a valid cron job request (you should add proper authentication)
    const { secret } = await request.json();
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await checkAndUpdateAssignments();
    return NextResponse.json({ success: true, message: 'Scheduler ran successfully' });
  } catch (error) {
    console.error('Scheduler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to check schedules on page load
export async function GET(request: Request) {
  try {
    await checkAndUpdateAssignments();
    return NextResponse.json({ success: true, message: 'Schedule check completed' });
  } catch (error) {
    console.error('Schedule check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}