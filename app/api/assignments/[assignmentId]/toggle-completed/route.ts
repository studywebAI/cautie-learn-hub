import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { assignmentId } = await params;

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
    // Teachers can complete assignments from their classes
    
    // Get user's subscription_type to check if they're a teacher
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .single();

    const isTeacher = userProfile?.subscription_type === 'teacher';

    // Also check if user is a member of this class
    const { data: classMember } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', assignment.class_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const isStudent = !!classMember;

    // Teachers who are members of the class, or students who are members
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
