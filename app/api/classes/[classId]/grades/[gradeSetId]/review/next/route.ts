import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getClassPermission } from '@/lib/auth/class-permissions';
import { normalizeBlockSettings } from '@/lib/assignments/settings';

export const dynamic = 'force-dynamic';

// GET /api/classes/[classId]/grades/[gradeSetId]/review/next
// Flashcard-style nakijken: returns the next ungraded open-question answer
// for this grade set's linked test, or null when done. See
// docs/grades-feature-brainstorm.md point 5.
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

    const { searchParams } = new URL(request.url);
    const studentIdFilter = (searchParams.get('studentId') || '').trim();

    const { data: gradeSet } = await supabase
      .from('grade_sets')
      .select('id, assignment_id, class_id')
      .eq('id', gradeSetId)
      .eq('class_id', classId)
      .maybeSingle();

    if (!gradeSet || !(gradeSet as any).assignment_id) {
      return NextResponse.json({ next: null, remaining: 0 });
    }
    const assignmentId = (gradeSet as any).assignment_id;

    const { data: blocks } = await supabase
      .from('blocks')
      .select('id, data, settings')
      .eq('assignment_id', assignmentId)
      .eq('type', 'open_question');

    const blockIds = (blocks || []).map((b: any) => b.id);
    if (blockIds.length === 0) return NextResponse.json({ next: null, remaining: 0 });
    const blockById = new Map((blocks || []).map((b: any) => [b.id, b]));

    let query = supabase
      .from('student_answers')
      .select('id, student_id, block_id, answer_data, assignment_attempt_id', { count: 'exact' })
      .in('block_id', blockIds)
      .is('score', null)
      .order('submitted_at', { ascending: true });

    if (studentIdFilter) query = query.eq('student_id', studentIdFilter);

    const { data: pending, count } = await query;
    const remaining = count || (pending || []).length;
    if (!pending || pending.length === 0) return NextResponse.json({ next: null, remaining: 0 });

    const answer = pending[0] as any;
    const block = blockById.get(answer.block_id);
    const blockSettings = normalizeBlockSettings((block as any)?.settings || (block as any)?.data?.settings || {});

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', answer.student_id)
      .maybeSingle();

    return NextResponse.json({
      next: {
        answer_id: answer.id,
        student_id: answer.student_id,
        student_name: profile?.full_name || profile?.email || 'Student',
        block_id: answer.block_id,
        question: (block as any)?.data?.question || '',
        correct_answer: (block as any)?.data?.correct_answer || (block as any)?.data?.model_answer || (block as any)?.data?.answer || null,
        rubric: blockSettings.openQuestion.rubric || [],
        max_points: blockSettings.points,
        student_answer: answer.answer_data,
      },
      remaining,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
