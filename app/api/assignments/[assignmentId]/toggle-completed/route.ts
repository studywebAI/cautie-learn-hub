import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(
  req: Request,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const resolvedParams = await params;
    const { assignmentId } = resolvedParams;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current assignment
    const { data: assignment, error: fetchError } = await supabase
      .from('assignments')
      .select('completed, class_id')
      .eq('id', assignmentId)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if user has access to this assignment
    // Students can only complete assignments from their classes
    const { data: classMember } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('class_id', assignment.class_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: classOwner } = await supabase
      .from('classes')
      .select('owner_id')
      .eq('id', assignment.class_id)
      .maybeSingle();

    const isStudent = !!classMember;
    const isTeacher = classOwner?.owner_id === user.id;

    if (!isStudent && !isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Toggle completed status
    const newCompletedStatus = !assignment.completed;

    const { error: updateError } = await supabase
      .from('assignments')
      .update({ completed: newCompletedStatus })
      .eq('id', assignmentId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      completed: newCompletedStatus 
    });
  } catch (error) {
    console.error('Error toggling assignment completion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}