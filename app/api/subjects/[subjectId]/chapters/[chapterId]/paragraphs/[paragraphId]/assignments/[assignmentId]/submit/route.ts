import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { calculateMcqScore, getAssignmentAvailabilityState, normalizeAssignmentSettings, normalizeBlockSettings } from '@/lib/assignments/settings'
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

    const { answers } = await request.json()

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

    const attempt = await getOrCreateAttempt(supabase, resolvedParams.assignmentId, user.id, settings);
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

    return NextResponse.json({
      success: true,
      message: 'Assignment submitted successfully',
      results,
      attempt_id: (attempt as any).id,
      score: totalScore,
      max_score: totalMax,
    })
  } catch (error) {
    console.error('Unexpected error in submit POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
