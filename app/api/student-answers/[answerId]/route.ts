import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { updateProgressSnapshot } from '@/lib/progress'

export const dynamic = 'force-dynamic'

// PATCH - Teacher override grading
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ answerId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { score, feedback } = await request.json()

    // Get the student answer with full hierarchy
    const { data: studentAnswer, error: answerError } = await supabase
      .from('student_answers')
      .select(`
        *,
        blocks (
          assignments (
            paragraph_id,
            paragraphs (
              chapters (
                subjects (
                  class_id
                )
              )
            )
          )
        )
      `)
      .eq('id', resolvedParams.answerId)
      .single()

    if (answerError || !studentAnswer) {
      return NextResponse.json({ error: 'Answer not found' }, { status: 404 })
    }

    const classId = (studentAnswer.blocks as any).assignments.paragraphs.chapters.subjects.class_id

    // Check if user is teacher/owner
    const { data: classMember, error: memberError } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single()

    const { data: classOwner } = await supabase
      .from('classes')
      .select('owner_id')
      .eq('id', classId)
      .single()

    const isTeacher = classOwner?.owner_id === user.id || classMember?.role === 'teacher'

    if (!isTeacher) {
      return NextResponse.json({ error: 'Access denied - only teachers can override grades' }, { status: 403 })
    }

    // Update the answer
    const { data: updatedAnswer, error: updateError } = await supabase
      .from('student_answers')
      .update({
        score,
        feedback,
        graded_by_ai: false, // Manual override
        graded_at: new Date().toISOString()
      })
      .eq('id', resolvedParams.answerId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating answer:', updateError)
      return NextResponse.json({ error: 'Failed to update grade' }, { status: 500 })
    }

    // Update progress
    const paragraphId = (studentAnswer.blocks as any).assignments.paragraph_id
    if (paragraphId) {
      await updateProgressSnapshot(paragraphId, studentAnswer.student_id)
    }

    return NextResponse.json(updatedAnswer)

  } catch (error) {
    console.error('Unexpected error in student answer PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}