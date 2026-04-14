import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  calculateDragDropScore,
  calculateFillInBlankScore,
  calculateMcqScore,
  calculateNumericScore,
  calculateOrderingScore,
  getAssignmentAvailabilityState,
  normalizeAssignmentSettings,
  normalizeBlockSettings,
} from '@/lib/assignments/settings'
import { getOrCreateAttempt, isAttemptExpired, markAttemptSubmitted } from '@/lib/assignments/attempts'

export const dynamic = 'force-dynamic'

// POST submit assignment answers
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { answers, access_code } = await request.json()

    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers must be an array' }, { status: 400 })
    }

    const { data: assignment } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', resolvedParams.assignmentId)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const settings = normalizeAssignmentSettings((assignment as any).settings || {});
    const availability = getAssignmentAvailabilityState(settings);
    if (!availability.available) {
      return NextResponse.json({ error: availability.reason }, { status: 403 });
    }

    const clientMeta = {
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: request.headers.get('user-agent') || null,
    };
    const attempt = await getOrCreateAttempt(supabase, resolvedParams.assignmentId, user.id, settings, clientMeta);
    if ((attempt as any)?.blocked) {
      return NextResponse.json({ error: (attempt as any).reason, details: attempt }, { status: 429 });
    }
    if (await isAttemptExpired(attempt)) {
      await supabase
        .from('assignment_attempts')
        .update({ status: settings.time.autoSubmitOnTimeout ? 'auto_submitted' : 'expired' })
        .eq('id', (attempt as any).id);
      return NextResponse.json({ error: 'Attempt expired' }, { status: 403 });
    }

    if (settings.access.accessCode && settings.access.accessCode.trim() !== String(access_code || '').trim()) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 403 });
    }

    // Process each answer
    const results = []
    let totalScore = 0;
    let totalMax = 0;
    for (const answer of answers) {
      const { block_id, answer_data } = answer

      if (!block_id || !answer_data) {
        continue
      }

      // Check if block exists and get its type
      const { data: block, error: blockError } = await supabase
        .from('blocks')
        .select('type, data, settings')
        .eq('id', block_id)
        .eq('assignment_id', resolvedParams.assignmentId)
        .single()

      let isCorrect = null
      let score = null
      let feedback = null

      if (!blockError && block) {
        const blockData = block.data as any

        const blockSettings = normalizeBlockSettings((block as any).settings || (blockData as any)?.settings || {});
        totalMax += blockSettings.points;

        // Auto-grade multiple choice questions
        if (block.type === 'multiple_choice') {
          const selectedAnswers = answer_data?.selected_answers || answer_data?.selectedAnswers || []
          const result = calculateMcqScore(
            Array.isArray(selectedAnswers) ? selectedAnswers : [],
            blockData?.options || [],
            blockSettings,
          );
          score = result.score;
          isCorrect = result.isCorrect;
          totalScore += Number(score || 0);

          feedback = blockSettings.feedbackText || (isCorrect ? 'Correct' : 'Incorrect');
        }
        if (block.type === 'fill_in_blank') {
          const result = calculateFillInBlankScore(
            answer_data?.answers || [],
            blockData?.answers || [],
            !!blockData?.case_sensitive,
            blockSettings,
          );
          score = result.score;
          isCorrect = result.isCorrect;
          totalScore += Number(score || 0);
          feedback = blockSettings.feedbackText || (isCorrect ? 'Correct' : 'Incorrect');
        }
        if (block.type === 'ordering') {
          const result = calculateOrderingScore(
            answer_data?.order || [],
            blockData?.correct_order || [],
            blockSettings,
          );
          score = result.score;
          isCorrect = result.isCorrect;
          totalScore += Number(score || 0);
          feedback = blockSettings.feedbackText || (isCorrect ? 'Correct order' : 'Order is not correct');
        }
        if (block.type === 'drag_drop' || block.type === 'matching') {
          const result = calculateDragDropScore(
            answer_data?.pairs || [],
            blockData?.pairs || [],
            blockSettings,
          );
          score = result.score;
          isCorrect = result.isCorrect;
          totalScore += Number(score || 0);
          feedback = blockSettings.feedbackText || (isCorrect ? 'Correct matching' : 'Matching has mistakes');
        }
        if (block.type === 'numeric_question') {
          const expected = blockData?.correct_answer ?? blockData?.answer ?? blockData?.value;
          const result = calculateNumericScore(answer_data?.value, expected, blockSettings);
          score = result.score;
          isCorrect = result.isCorrect;
          totalScore += Number(score || 0);
          feedback = blockSettings.feedbackText || (isCorrect ? 'Correct number' : 'Incorrect number');
        }

        // For open questions, mark as submitted but don't grade yet
        if (block.type === 'open_question') {
          feedback = 'Answer submitted. Waiting for grading...'
          // In a real implementation, this would trigger AI grading
          if (!settings.grading.autoGrade || settings.grading.manualReviewOpenQuestions) {
            score = null;
            isCorrect = null;
          }
        }
      }

      // Insert or update the answer
      const { data: existingAnswer } = await supabase
        .from('student_answers')
        .select('id')
        .eq('student_id', user.id)
        .eq('block_id', block_id)
        .single()

      const answerRecord = {
        student_id: user.id,
        block_id: block_id,
        assignment_id: resolvedParams.assignmentId,
        assignment_attempt_id: (attempt as any).id,
        answer_data: answer_data,
        is_correct: isCorrect,
        score: score,
        feedback: feedback,
        submitted_at: new Date().toISOString()
      }

      if (existingAnswer) {
        // Update existing answer
        await supabase
          .from('student_answers')
          .update(answerRecord)
          .eq('id', existingAnswer.id)
      } else {
        // Insert new answer
        await supabase
          .from('student_answers')
          .insert([answerRecord])
      }

      results.push({
        block_id,
        submitted: true,
        graded: isCorrect !== null,
        is_correct: isCorrect,
        score,
        feedback
      })
    }

    await markAttemptSubmitted(supabase, (attempt as any).id, totalScore, totalMax);

    const { data: allAttempts } = await supabase
      .from('assignment_attempts')
      .select('attempt_no, score, max_score, status')
      .eq('assignment_id', resolvedParams.assignmentId)
      .eq('student_id', user.id)
      .order('attempt_no', { ascending: true });

    const attempts = (allAttempts || []).filter((a: any) => a.status === 'submitted' || a.status === 'auto_submitted');
    const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
    const bestAttempt = attempts.length > 0
      ? attempts.reduce((best: any, current: any) => Number(current.score || 0) > Number(best.score || 0) ? current : best, attempts[0])
      : null;
    const effectiveAttempt = settings.attempts.scoreMode === 'latest' ? latestAttempt : bestAttempt;

    return NextResponse.json({
      success: true,
      message: 'Assignment submitted successfully',
      results,
      attempt_id: (attempt as any).id,
      score: totalScore,
      max_score: totalMax,
      scoring_mode: settings.attempts.scoreMode,
      effective_score: Number(effectiveAttempt?.score || 0),
      effective_max_score: Number(effectiveAttempt?.max_score || 0),
    })
  } catch (error) {
    console.error('Unexpected error in submit POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
