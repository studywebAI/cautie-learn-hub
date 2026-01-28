import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/submissions/[submissionId] - Get a specific submission
export async function GET(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params
    const submissionId = resolvedParams.submissionId

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: submission, error } = await (supabase as any)
      .from('submissions')
      .select(`
        *,
        assignments (
          title,
          class_id,
          classes (
            name,
            owner_id
          )
        ),
        profiles:user_id (
          full_name
        ),
        graded_by_profile:graded_by (
          full_name
        )
      `)
      .eq('id', submissionId)
      .single()

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check if user has permission to view this submission
    const isOwner = submission.assignments.classes.owner_id === user.id
    const isSubmitter = submission.user_id === user.id

    if (!isOwner && !isSubmitter) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error('Unexpected error in submission GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/submissions/[submissionId] - Grade a submission (teachers only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params
    const submissionId = resolvedParams.submissionId
    const { grade, feedback } = await request.json()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is the teacher for this submission
    const { data: submission, error: fetchError } = await (supabase as any)
      .from('submissions')
      .select(`
        assignments (
          class_id,
          classes (
            owner_id
          )
        )
      `)
      .eq('id', submissionId)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (submission.assignments.classes.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only class teachers can grade submissions' }, { status: 403 })
    }

    // Update the submission with grade and feedback
    const { data, error } = await (supabase as any)
      .from('submissions')
      .update({
        grade,
        feedback,
        status: 'graded',
        graded_at: new Date().toISOString(),
        graded_by: user.id
      })
      .eq('id', submissionId)
      .select()
      .single()

    if (error) {
      console.error('Error grading submission:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error in submission PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
