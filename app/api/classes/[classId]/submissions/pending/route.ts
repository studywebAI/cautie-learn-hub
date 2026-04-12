import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getClassPermission } from '@/lib/auth/class-permissions';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get assignments for this class
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title')
      .eq('class_id', classId);

    if (!assignments || assignments.length === 0) {
      return NextResponse.json([]);
    }

    const assignmentIds = assignments.map(a => a.id);
    const assignmentMap = new Map(assignments.map(a => [a.id, a.title]));

    // Get pending submissions for these assignments
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, assignment_id, user_id, status, grade, feedback, submitted_at')
      .in('assignment_id', assignmentIds)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch submissions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get student names
    const userIds = [...new Set((submissions || []).map(s => s.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    
    const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

    // Format submissions with student names
    const formatted = (submissions || []).map(sub => ({
      id: sub.id,
      assignment_id: sub.assignment_id,
      user_id: sub.user_id,
      status: sub.status,
      grade: sub.grade,
      feedback: sub.feedback,
      submitted_at: sub.submitted_at,
      student_name: profileMap.get(sub.user_id) || 'Unknown',
      assignment_title: assignmentMap.get(sub.assignment_id) || 'Assignment'
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error in pending submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
