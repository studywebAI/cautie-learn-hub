import { normalizeBlockSettings } from '@/lib/assignments/settings';

export type AttemptAnswerStats = {
  totalBlocks: number;
  correct: number;
  incorrect: number;
  ungraded: number;
  score: number;
  maxScore: number;
};

// Computes correct/incorrect/ungraded counts and total score/maxScore for a
// student's answers on an assignment. Mirrors the calculation already used in
// the paragraph-assignments GET route (block count + student_answers.is_correct)
// and the submit route (per-block points from block settings), so the live
// monitor and the force-close scoring stay consistent with how scores are
// computed everywhere else.
//
// Note: student_answers is keyed by (student_id, block_id), not per attempt —
// same simplification the rest of the codebase already relies on (e.g. the
// paragraph-assignments route). So this reflects the student's latest saved
// answers for the assignment, not strictly "this attempt's" answers.
export async function computeStudentAnswerStats(
  supabase: any,
  assignmentId: string,
  studentId: string,
): Promise<AttemptAnswerStats> {
  const { data: blocks } = await supabase
    .from('blocks')
    .select('id, settings, data')
    .eq('assignment_id', assignmentId);

  const blockList = blocks || [];
  let maxScore = 0;
  for (const block of blockList) {
    const blockSettings = normalizeBlockSettings((block as any).settings || (block as any).data?.settings || {});
    maxScore += blockSettings.points;
  }

  const { data: answers } = await supabase
    .from('student_answers')
    .select('block_id, is_correct, score')
    .eq('student_id', studentId)
    .eq('assignment_id', assignmentId);

  let correct = 0;
  let incorrect = 0;
  let ungraded = 0;
  let score = 0;
  for (const answer of answers || []) {
    if ((answer as any).is_correct === true) correct += 1;
    else if ((answer as any).is_correct === false) incorrect += 1;
    else ungraded += 1;
    score += Number((answer as any).score || 0);
  }

  return {
    totalBlocks: blockList.length,
    correct,
    incorrect,
    ungraded,
    score,
    maxScore,
  };
}
