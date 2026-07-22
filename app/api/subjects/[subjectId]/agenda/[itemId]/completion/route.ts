import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// Mirrors app/api/classes/[classId]/agenda/[itemId]/completion/route.ts,
// keyed on subject_id instead of class_id. Phase 2 gap-closing, agenda
// subject-first completion tracking.

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string; itemId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemId } = await params;

    const { data: completion } = await supabase
      .from('student_task_completion')
      .select('completed, completed_at')
      .eq('agenda_item_id', itemId)
      .eq('student_id', user.id)
      .single();

    return NextResponse.json({
      completed: completion?.completed || false,
      completed_at: completion?.completed_at || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { completed: false, error: 'Could not fetch completion status' },
      { status: 200 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string; itemId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { subjectId, itemId } = await params;
    const { completed } = await request.json();

    const { data: subjectData } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .single();

    if (!subjectData) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const { data: existingRecord } = await supabase
      .from('student_task_completion')
      .select('id')
      .eq('agenda_item_id', itemId)
      .eq('student_id', user.id)
      .single();

    if (existingRecord) {
      const { error } = await supabase
        .from('student_task_completion')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRecord.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase
        .from('student_task_completion')
        .insert({
          agenda_item_id: itemId,
          student_id: user.id,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      completed,
      message: completed ? 'Task marked as complete' : 'Task marked as incomplete',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
