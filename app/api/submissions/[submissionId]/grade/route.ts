import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST grade submission
export async function POST(request: Request, { params }: { params: { submissionId: string } }) {
  const { submissionId } = params
  const { rubricScores, feedback } = await request.json()
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get submission details
  const { data: submission, error: submissionError } = await supabase
    .from('submissions' as any)
    .select(`
      *,
      assignments (
        id,
        rubric_id,
        class_id
      )
    `)
    .eq('id', submissionId)
    .single()

  if (submissionError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // Check if user can grade this submission
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('owner_id')
    .eq('id', submission.assignments.class_id)
    .single()

  if (classError || !classData || classData.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Start transaction
  let calculatedScore = 0

  if (rubricScores && rubricScores.length > 0) {
    // Delete existing rubric scores
    await supabase
      .from('submission_rubric_scores' as any)
      .delete()
      .eq('submission_id', submissionId)

    // Insert new rubric scores
    const scoresToInsert = rubricScores.map((score: any) => ({
      submission_id: submissionId,
      rubric_item_id: score.rubric_item_id,
      score: score.score,
      feedback: score.feedback
    }))

    const { error: scoresError } = await supabase
      .from('submission_rubric_scores' as any)
      .insert(scoresToInsert)

    if (scoresError) {
      console.error('Error saving rubric scores:', scoresError)
      return NextResponse.json({ error: scoresError.message }, { status: 500 })
    }

    // Calculate total score from rubric
    const { data: rubricItems, error: itemsError } = await supabase
      .from('rubric_items' as any)
      .select('id, max_score, weight')
      .in('id', rubricScores.map((s: any) => s.rubric_item_id))

    if (!itemsError && rubricItems) {
      rubricItems.forEach(item => {
        const scoreData = rubricScores.find((s: any) => s.rubric_item_id === item.id)
        if (scoreData) {
          calculatedScore += (scoreData.score / item.max_score) * item.max_score * item.weight
        }
      })
    }
  }

  // Update submission
  const updateData: any = {
    status: 'graded',
    graded_at: new Date().toISOString(),
    graded_by: user.id,
    calculated_grade: calculatedScore
  }

  if (feedback) {
    updateData.feedback = feedback
  }

  const { error: updateError } = await supabase
    .from('submissions' as any)
    .update(updateData)
    .eq('id', submissionId)

  if (updateError) {
    console.error('Error updating submission:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// GET submission grading data
export async function GET(request: Request, { params }: { params: { submissionId: string } }) {
  const { submissionId } = params
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get submission with assignment and rubric
  const { data: submission, error: submissionError } = await supabase
    .from('submissions' as any)
    .select(`
      *,
      assignments (
        id,
        rubric_id,
        rubrics (
          id,
          name,
          rubric_items (
            id,
            criterion,
            description,
            max_score,
            weight
          )
        )
      ),
      submission_rubric_scores (
        rubric_item_id,
        score,
        feedback
      )
    `)
    .eq('id', submissionId)
    .single()

  if (submissionError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // Check permissions
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('owner_id')
    .eq('id', submission.assignments.class_id)
    .single()

  if (classError || !classData || classData.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(submission)
}