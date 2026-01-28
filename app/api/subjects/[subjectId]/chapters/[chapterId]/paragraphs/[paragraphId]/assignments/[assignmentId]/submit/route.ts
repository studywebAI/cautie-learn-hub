import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

    // Process each answer
    const results = []
    for (const answer of answers) {
      const { block_id, answer_data } = answer

      if (!block_id || !answer_data) {
        continue
      }

      // Check if block exists and get its type
      const { data: block, error: blockError } = await supabase
        .from('blocks')
        .select('type, data')
        .eq('id', block_id)
        .eq('assignment_id', resolvedParams.assignmentId)
        .single()

      let isCorrect = null
      let score = null
      let feedback = null

      if (!blockError && block) {
        const blockData = block.data as any

        // Auto-grade multiple choice questions
        if (block.type === 'multiple_choice') {
          const correctOptions = blockData?.options?.filter((opt: any) => opt.correct) || []
          const selectedAnswers = answer_data?.selectedAnswers || []
          const selectedCorrect = selectedAnswers.filter((answerId: string) => {
            return correctOptions.some((opt: any) => opt.id === answerId)
          })

          const selectedIncorrect = selectedAnswers.filter((answerId: string) => {
            return !correctOptions.some((opt: any) => opt.id === answerId)
          })

          // Simple scoring: +1 for each correct, -1 for each incorrect
          score = Math.max(0, selectedCorrect.length - selectedIncorrect.length)
          isCorrect = selectedIncorrect.length === 0 && selectedCorrect.length > 0

          if (isCorrect) {
            feedback = 'Correct! Well done.'
          } else if (selectedIncorrect.length > 0) {
            feedback = 'Some answers were incorrect. Review the material.'
          } else {
            feedback = 'You didn\'t select all correct answers.'
          }
        }

        // For open questions, mark as submitted but don't grade yet
        if (block.type === 'open_question') {
          feedback = 'Answer submitted. Waiting for grading...'
          // In a real implementation, this would trigger AI grading
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

    return NextResponse.json({
      success: true,
      message: 'Assignment submitted successfully',
      results
    })
  } catch (error) {
    console.error('Unexpected error in submit POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
