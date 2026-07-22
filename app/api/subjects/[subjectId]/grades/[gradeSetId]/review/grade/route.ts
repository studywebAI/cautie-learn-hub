import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions';
import { normalizeBlockSettings } from '@/lib/assignments/settings';

export const dynamic = 'force-dynamic';

// Mirrors app/api/classes/[classId]/grades/[gradeSetId]/review/grade/route.ts,
// keyed on subject_id instead of class_id.
export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const answerId = String(body?.answer_id || '').trim();
    const isCorrect = typeof body?.is_correct === 'boolean' ? body.is_correct : null;
    const note = typeof body?.note === 'string' ? body.note : null;
    const partialScore = typeof body?.score === 'number' && Number.isFinite(body.score) ? body.score : null;

    if (!answerId || isCorrect === null) {
      return NextResponse.json({ error: 'answer_id and is_correct are required' }, { status: 400 });
    }

    const { data: gradeSet } = await supabase
      .from('grade_sets')
      .select('id, assignment_id')
      .eq('id', gradeSetId)
      .eq('subject_id', subjectId)
      .maybeSingle();
    if (!gradeSet || !(gradeSet as any).assignment_id) {
      return NextResponse.json({ error: 'Grade set not linked to a test' }, { status: 400 });
    }

    const { data: answer } = await supabase
      .from('student_answers')
      .select('id, student_id, block_id, assignment_id, assignment_attempt_id, answer_data')
      .eq('id', answerId)
      .eq('assignment_id', (gradeSet as any).assignment_id)
      .maybeSingle();
    if (!answer) return NextResponse.json({ error: 'Answer not found' }, { status: 404 });

    const { data: block } = await supabase
      .from('blocks')
      .select('id, type, settings, data')
      .eq('id', (answer as any).block_id)
      .maybeSingle();
    if (!block || (block as any).type !== 'open_question') {
      return NextResponse.json({ error: 'Not an open question answer' }, { status: 400 });
    }

    const blockSettings = normalizeBlockSettings((block as any).settings || (block as any).data?.settings || {});
    const maxPoints = Number(blockSettings.points || 1);
    const score = partialScore !== null ? Math.max(0, Math.min(maxPoints, partialScore)) : (isCorrect ? maxPoints : 0);

    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('student_answers')
      .update({
        score,
        feedback: note,
        is_correct: isCorrect,
        graded_at: nowIso,
        graded_by_ai: false,
      })
      .eq('id', answerId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    await supabase.from('assignment_events').insert({
      assignment_id: (answer as any).assignment_id,
      attempt_id: (answer as any).assignment_attempt_id || null,
      student_id: (answer as any).student_id,
      event_type: 'manual_grade',
      event_payload: { answer_id: answerId, graded_by: user.id, score, max_points: maxPoints, note },
    });

    const attemptId = (answer as any).assignment_attempt_id;
    if (attemptId) {
      const { data: attemptAnswers } = await supabase
        .from('student_answers')
        .select('score')
        .eq('assignment_attempt_id', attemptId);
      const { data: assignmentBlocks } = await supabase
        .from('blocks')
        .select('settings, data')
        .eq('assignment_id', (gradeSet as any).assignment_id);
      const scoreSum = (attemptAnswers || []).reduce((sum: number, row: any) => sum + Number(row.score || 0), 0);
      const maxSum = (assignmentBlocks || []).reduce((sum: number, row: any) => {
        const s = normalizeBlockSettings(row.settings || row.data?.settings || {});
        return sum + Number(s.points || 0);
      }, 0);
      await supabase
        .from('assignment_attempts')
        .update({ score: scoreSum, max_score: maxSum, updated_at: nowIso })
        .eq('id', attemptId);
    }

    return NextResponse.json({ success: true, score, max_points: maxPoints });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
