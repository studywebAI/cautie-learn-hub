import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getClassPermission } from '@/lib/auth/class-permissions';
import { computeStudentAnswerStats } from '@/lib/assignments/live-status';

export const dynamic = 'force-dynamic';

// GET /api/classes/[classId]/grades/[gradeSetId]/scores
// Raw nakijk-score per student (goed/fout, geen cijfer) for a test-linked
// grade set — the input for the becijferen stage / grading templates.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string; gradeSetId: string }> }
) {
  try {
    const { classId, gradeSetId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perm = await getClassPermission(supabase as any, classId, user.id);
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: gradeSet } = await supabase
      .from('grade_sets')
      .select('id, assignment_id')
      .eq('id', gradeSetId)
      .eq('class_id', classId)
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
