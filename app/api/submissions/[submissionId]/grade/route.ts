import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'

import { gradeSubmissionSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'

export const dynamic = 'force-dynamic'

async function requireTeacherAccess(supabase: ReturnType<typeof createClient>, classId: string, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', userId)
    .single()

  if (profile?.subscription_type !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can perform this action' }, { status: 403 })
  }

  const { data: member } = await supabase
    .from('class_members')
    .select('role')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'You are not a member of this class' }, { status: 403 })
  }

  return null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ submissionId: string }> }) {
  const resolvedParams = await params
  const { submissionId } = resolvedParams

  const validation = await validateBody(request, gradeSubmissionSchema)
  if ('error' in validation) return validation.error

  const { rubricScores, feedback } = validation.data

  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: submission, error: submissionError } = await (supabase
    .from('submissions' as any) as any)
    .select(`*, assignments (id, rubric_id, class_id)`)
    .eq('id', submissionId)
    .single()

  if (submissionError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  const classId = submission.assignments?.class_id
  if (!classId) {
    return NextResponse.json({ error: 'Submission is missing a class reference' }, { status: 400 })
  }

  const accessError = await requireTeacherAccess(supabase, classId, user.id)
  if (accessError) return accessError

  let calculatedScore = 0

  if (rubricScores && rubricScores.length > 0) {
    await supabase.from('submission_rubric_scores' as any).delete().eq('submission_id', submissionId)

    const scoresToInsert = rubricScores.map((score: any) => ({
      submission_id: submissionId,
      rubric_item_id: score.rubric_item_id,
      score: score.score,
      feedback: score.feedback || null
    }))

    await supabase.from('submission_rubric_scores' as any).insert(scoresToInsert)

    const { data: rubricItems } = await (supabase
      .from('rubric_items' as any) as any)
      .select('id, max_score, weight')
      .in('id', rubricScores.map((s: any) => s.rubric_item_id))

    if (rubricItems) {
      rubricItems.forEach((item: any) => {
        const scoreData = rubricScores.find((s: any) => s.rubric_item_id === item.id)
        if (!scoreData || !item.max_score) return
        calculatedScore += (scoreData.score / item.max_score) * item.weight
      })
    }
  }

  const updateData: any = {
    status: 'graded',
    graded_at: new Date().toISOString(),
    graded_by: user.id,
    calculated_grade: calculatedScore
  }

  if (feedback) updateData.feedback = feedback

  await supabase.from('submissions' as any).update(updateData).eq('id', submissionId)

  return NextResponse.json({ success: true })
}

export async function GET(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const resolvedParams = await params
  const { submissionId } = resolvedParams

  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: submission, error: submissionError } = await (supabase
    .from('submissions' as any) as any)
    .select(`*, assignments (id, rubric_id, class_id, rubrics (id, name, rubric_items (id, criterion, description, max_score, weight))), submission_rubric_scores (rubric_item_id, score, feedback)`)
    .eq('id', submissionId)
    .single()

  if (submissionError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  const classId = submission.assignments?.class_id
  if (!classId) {
    return NextResponse.json({ error: 'Submission is missing a class reference' }, { status: 400 })
  }

  const accessError = await requireTeacherAccess(supabase, classId, user.id)
  if (accessError) return accessError

  return NextResponse.json(submission)
}
