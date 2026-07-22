import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions';
import { computeStudentAnswerStats } from '@/lib/assignments/live-status';

export const dynamic = 'force-dynamic';

// Mirrors app/api/classes/[classId]/grades/[gradeSetId]/scores/route.ts,
// keyed on subject_id instead of class_id.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; gradeSetId: string }> }
) {
  try {
    const { subjectId, gradeSetId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: gradeSet } = await supabase
      .from('grade_sets')
      .select('id, assignment_id')
      .eq('id', gradeSetId)
      .eq('subject_id', subjectId)
      .maybeSingle();
    if (!gradeSet || !(gradeSet as any).assignment_id) {
      return NextResponse.json({ scores: [] });
    }
    const assignmentId = (gradeSet as any).assignment_id;

    const { data: attempts } = await supabase
      .from('assignment_attempts')
      .select('student_id')
      .eq('assignment_id', assignmentId)
      .in('status', ['submitted', 'auto_submitted']);

    const studentIds = [...new Set((attempts || []).map((a: any) => a.student_id))];
    const scores = [];
    for (const studentId of studentIds) {
      const stats = await computeStudentAnswerStats(supabase, assignmentId, studentId);
      scores.push({
        student_id: studentId,
        score: stats.score,
        max_score: stats.maxScore,
        percentage: stats.maxScore > 0 ? Math.round((stats.score / stats.maxScore) * 1000) / 10 : 0,
        pending: stats.ungraded,
      });
    }

    return NextResponse.json({ scores });
  } catch (err) {
    return NextResponse.json({ scores: [] });
  }
}
