import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { updateProgressSnapshot } from '@/lib/progress'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    // Get one pending grading job
    const { data: job, error: jobError } = await supabase
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
    await supabase
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
      await supabase
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
      await supabase
        .from('ai_grading_queue')
        .update({
          status: 'failed',
          processed_at: new Date().toISOString(),
          error_message: 'Not an open question block'
        })
        .eq('id', job.id)
      return NextResponse.json({ error: 'Not an open question' }, { status: 400 })
    }

    // Call AI grading using the handle endpoint
    const answerData = studentAnswer.answer_data as any
    const blockConfig = blockData.data as any

    const aiResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flowName: 'gradeOpenQuestion',
        input: {
          question: blockConfig.question,
          criteria: blockConfig.grading_criteria,
          maxScore: blockConfig.max_score,
          language: 'en',
          studentAnswer: answerData.text
        }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI grading failed:', errorText);
      throw new Error('AI grading failed');
    }

    const gradingResult = await aiResponse.json();

    // Update student answer
    await supabase
      .from('student_answers')
      .update({
        score: gradingResult.score,
        feedback: gradingResult.feedback,
        graded_by_ai: true,
        graded_at: new Date().toISOString()
      })
      .eq('id', studentAnswer.id)

    // Update progress
    const paragraphId = (studentAnswer.blocks as any).assignments.paragraph_id
    if (paragraphId) {
      await updateProgressSnapshot(paragraphId, studentAnswer.student_id)
    }

    // Mark job as completed
    await supabase
      .from('ai_grading_queue')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', job.id)

    return NextResponse.json({
      message: 'Grading completed',
      jobId: job.id,
      score: gradingResult.score,
      feedback: gradingResult.feedback
    })

  } catch (error) {
    console.error('Grading process error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}