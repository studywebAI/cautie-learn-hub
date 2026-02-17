import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { updateProgressSnapshot } from '@/lib/progress'
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

// PATCH - Teacher override grading (any teacher in the class)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ answerId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    // Any teacher in the class can override grades
    const perm = await getClassPermission(supabase, classId, user.id)
    if (!perm.isTeacher) {
      return NextResponse.json({ error: 'Access denied - only teachers can override grades' }, { status: 403 })
    }

    const { data: updatedAnswer, error: updateError } = await supabase
      .from('student_answers')
      .update({
        score,
        feedback,
        graded_by_ai: false,
        graded_at: new Date().toISOString()
      })
      .eq('id', resolvedParams.answerId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update grade' }, { status: 500 })
    }

    // Audit log the grade override
    await logAuditEntry(supabase, {
      userId: user.id,
      classId,
      action: 'grade_override',
      entityType: 'student_answer',
      entityId: resolvedParams.answerId,
      changes: { score, feedback },
      metadata: { studentId: studentAnswer.student_id }
    })

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
