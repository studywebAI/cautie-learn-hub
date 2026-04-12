import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { canReleaseFeedback, normalizeAssignmentSettings } from '@/lib/assignments/settings'

export const dynamic = 'force-dynamic'

// GET student answers for an assignment
export async function GET(
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

    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, settings')
      .eq('id', resolvedParams.assignmentId)
      .maybeSingle()

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const settings = normalizeAssignmentSettings((assignment as any).settings || {})

    const { data: latestAttempt } = await supabase
      .from('assignment_attempts')
      .select('status')
      .eq('assignment_id', resolvedParams.assignmentId)
      .eq('student_id', user.id)
      .order('attempt_no', { ascending: false })
      .limit(1)
      .maybeSingle()

    const hasSubmitted = latestAttempt?.status === 'submitted' || latestAttempt?.status === 'auto_submitted'
    const feedbackVisible = canReleaseFeedback(settings, hasSubmitted)

    // Get student's answers for this assignment
    const { data: answers, error: answersError } = await supabase
      .from('student_answers')
      .select('*')
      .eq('student_id', user.id)
      .eq('assignment_id', resolvedParams.assignmentId)
      .order('submitted_at', { ascending: false })

    if (answersError) {
      console.error('Error fetching answers:', answersError)
      return NextResponse.json({ error: answersError.message }, { status: 500 })
    }

    const safeAnswers = (answers || []).map((answer: any) => ({
      ...answer,
      feedback: feedbackVisible ? answer.feedback : null,
      is_correct: feedbackVisible && settings.grading.showCorrectAnswers ? answer.is_correct : null,
      score: feedbackVisible && settings.grading.showPoints ? answer.score : null,
    }))

    return NextResponse.json(safeAnswers)
  } catch (error) {
    console.error('Unexpected error in answers GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
