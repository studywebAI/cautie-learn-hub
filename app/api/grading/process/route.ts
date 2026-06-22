import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { updateProgressSnapshot } from '@/lib/progress'
import { gradeOpenQuestionWithSampling } from '@/ai/flows/grade-open-question'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    // Get one pending grading job
    const { data: job, error: jobError } = await (supabase as any)
      .from('ai_grading_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at')
      .limit(1)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ message: 'No pending grading jobs' })
    }

    // Mark as processing
    await (supabase as any)
      .from('ai_grading_queue')
      .update({ status: 'processing' })
      .eq('id', job.id)

    // Get student answer and block data
    const { data: studentAnswer, error: answerError } = await supabase
      .from('student_answers')
      .select(`
        *,
        blocks (
          type,
          data,
          assignments (
            paragraph_id
          )
        )
      `)
      .eq('id', job.answer_id)
      .single()

    if (answerError || !studentAnswer) {
      await (supabase as any)
        .from('ai_grading_queue')
        .update({
          status: 'failed',
          processed_at: new Date().toISOString(),
          error_message: 'Student answer not found'
        })
        .eq('id', job.id)
      return NextResponse.json({ error: 'Student answer not found' }, { status: 404 })
    }

    const blockData = studentAnswer.blocks as any
    if (blockData.type !== 'open_question') {
      await (supabase as any)
        .from('ai_grading_queue')
        .update({
          status: 'failed',
          processed_at: new Date().toISOString(),
          error_message: 'Not an open question block'
        })
        .eq('id', job.id)
      return NextResponse.json({ error: 'Not an open question' }, { status: 400 })
    }

    // Grade using sampling approach for anti-manipulation protection
    const answerData = studentAnswer.answer_data as any
    const blockConfig = blockData.data as any

    const gradingResult = await gradeOpenQuestionWithSampling({
      question: blockConfig.question || '',
      criteria: blockConfig.grading_criteria || '',
      maxScore: blockConfig.max_score || 5,
      language: 'en',
      studentAnswer: answerData?.text || answerData?.toString() || ''
    }, 3); // Use 3 sampling evaluations

    // Use the median score from sampling
    const finalScore = gradingResult.medianScore;
    const finalFeedback = gradingResult.finalFeedback;

    // Update student answer with median score and sampling metadata
    await supabase
      .from('student_answers')
      .update({
        score: finalScore,
        feedback: finalFeedback,
        graded_by_ai: true,
        graded_at: new Date().toISOString(),
        ai_grading_samples: {
          scores: gradingResult.scores,
          feedbacks: gradingResult.feedbacks,
          samplingCount: gradingResult.scores.length,
        }
      })
      .eq('id', studentAnswer.id)

    // Update progress
    const paragraphId = (studentAnswer.blocks as any).assignments.paragraph_id
    if (paragraphId) {
      await updateProgressSnapshot(paragraphId, studentAnswer.student_id)
    }

    // Mark job as completed
    await (supabase as any)
      .from('ai_grading_queue')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', job.id)

    return NextResponse.json({
      message: 'Grading completed with sampling-based approach',
      jobId: job.id,
      score: finalScore,
      feedback: finalFeedback,
      samplingDetails: {
        allScores: gradingResult.scores,
        medianScore: gradingResult.medianScore,
        samplingCount: gradingResult.scores.length
      }
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}