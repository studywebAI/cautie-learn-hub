import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions';
import { normalizeBlockSettings } from '@/lib/assignments/settings';
import { gradeOpenQuestionWithSampling } from '@/ai/flows/grade-open-question';

export const dynamic = 'force-dynamic';

// Mirrors app/api/classes/[classId]/grades/[gradeSetId]/review/auto-grade/route.ts,
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

    const { data: gradeSet } = await supabase
      .from('grade_sets')
      .select('id, assignment_id')
      .eq('id', gradeSetId)
      .eq('subject_id', subjectId)
      .maybeSingle();
    if (!gradeSet || !(gradeSet as any).assignment_id) {
      return NextResponse.json({ error: 'Grade set not linked to a test' }, { status: 400 });
    }
    const assignmentId = (gradeSet as any).assignment_id;

    const { data: blocks } = await supabase
      .from('blocks')
      .select('id, data, settings')
      .eq('assignment_id', assignmentId)
      .eq('type', 'open_question');
    const blockIds = (blocks || []).map((b: any) => b.id);
    if (blockIds.length === 0) return NextResponse.json({ graded: 0 });
    const blockById = new Map((blocks || []).map((b: any) => [b.id, b]));

    const { data: pending } = await supabase
      .from('student_answers')
      .select('id, block_id, student_id, assignment_attempt_id, answer_data')
      .in('block_id', blockIds)
      .is('score', null);

    if (!pending || pending.length === 0) return NextResponse.json({ graded: 0 });

    const nowIso = new Date().toISOString();
    const touchedAttemptIds = new Set<string>();
    let gradedCount = 0;

    for (const answer of pending) {
      const block = blockById.get((answer as any).block_id);
      const blockSettings = normalizeBlockSettings((block as any)?.settings || (block as any)?.data?.settings || {});
      const maxPoints = Number(blockSettings.points || 1);
      const studentAnswerText = typeof (answer as any).answer_data === 'string'
        ? (answer as any).answer_data
        : (answer as any).answer_data?.text || (answer as any).answer_data?.value || '';

      const result = await gradeOpenQuestionWithSampling({
        question: (block as any)?.data?.question || '',
        criteria: (block as any)?.data?.grading_criteria || (blockSettings.openQuestion.rubric || []).join('\n'),
        maxScore: maxPoints,
        language: 'Dutch',
        studentAnswer: String(studentAnswerText || ''),
      }, 3);

      const isCorrect = result.medianScore >= maxPoints * 0.7;

      await supabase
        .from('student_answers')
        .update({
          score: result.medianScore,
          feedback: result.finalFeedback,
          is_correct: isCorrect,
          graded_at: nowIso,
          graded_by_ai: true,
        })
        .eq('id', (answer as any).id);

      await supabase.from('assignment_events').insert({
        assignment_id: assignmentId,
        attempt_id: (answer as any).assignment_attempt_id || null,
        student_id: (answer as any).student_id,
        event_type: 'ai_grade',
        event_payload: { answer_id: (answer as any).id, graded_by: 'ai', score: result.medianScore, max_points: maxPoints },
      });

      if ((answer as any).assignment_attempt_id) touchedAttemptIds.add((answer as any).assignment_attempt_id);
      gradedCount += 1;
    }

    const { data: assignmentBlocks } = await supabase
      .from('blocks')
      .select('settings, data')
      .eq('assignment_id', assignmentId);
    const maxSum = (assignmentBlocks || []).reduce((sum: number, row: any) => {
      const s = normalizeBlockSettings(row.settings || row.data?.settings || {});
      return sum + Number(s.points || 0);
    }, 0);

    for (const attemptId of touchedAttemptIds) {
      const { data: attemptAnswers } = await supabase
        .from('student_answers')
        .select('score')
        .eq('assignment_attempt_id', attemptId);
      const scoreSum = (attemptAnswers || []).reduce((sum: number, row: any) => sum + Number(row.score || 0), 0);
      await supabase
        .from('assignment_attempts')
        .update({ score: scoreSum, max_score: maxSum, updated_at: nowIso })
        .eq('id', attemptId);
    }

    return NextResponse.json({ graded: gradedCount });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
