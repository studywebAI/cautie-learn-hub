import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET — every student's answer for one block, any block type. Generalizes
// what /api/classes/[classId]/assignments/open-answers does for
// open_question only (docs/mockups/editor-redesign.html "quick check",
// extended to all block types per the user's explicit choice).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string; blockId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.subscription_type !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: block, error: blockError } = await (supabase as any)
      .from('blocks')
      .select('id, assignment_id, type, data')
      .eq('id', resolvedParams.blockId)
      .maybeSingle()
    if (blockError || !block || block.assignment_id !== resolvedParams.assignmentId) {
      if (blockError) console.error('[student-answers] block_lookup_error', { message: blockError.message, blockId: resolvedParams.blockId })
      return NextResponse.json({ error: 'Block not found' }, { status: 404 })
    }

    const { data: assignment, error: assignmentError } = await (supabase as any)
      .from('assignments')
      .select('id, class_id')
      .eq('id', resolvedParams.assignmentId)
      .maybeSingle()
    if (assignmentError || !assignment) {
      if (assignmentError) console.error('[student-answers] assignment_lookup_error', { message: assignmentError.message, assignmentId: resolvedParams.assignmentId })
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (assignment.class_id) {
      const { data: membership } = await supabase
        .from('class_members')
        .select('role')
        .eq('class_id', assignment.class_id)
        .eq('user_id', user.id)
        .maybeSingle()
      const role = String(membership?.role || '').toLowerCase()
      const isTeacherOfClass = role === 'teacher' || role === 'owner' || role === 'admin' || role === 'creator'
      if (!isTeacherOfClass) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { data: answers, error: answersError } = await (supabase as any)
      .from('student_answers')
      .select('id, student_id, answer_data, is_correct, score, feedback, submitted_at')
      .eq('block_id', resolvedParams.blockId)
      .order('submitted_at', { ascending: false })

    if (answersError) {
      console.error('[student-answers] answers_query_error', { message: answersError.message, blockId: resolvedParams.blockId })
      return NextResponse.json({ error: answersError.message }, { status: 500 })
    }

    const studentIds = Array.from(new Set((answers || []).map((a: any) => a.student_id).filter(Boolean)))
    let namesById = new Map<string, string>()
    if (studentIds.length > 0) {
      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds)
      namesById = new Map((profiles || []).map((p: any) => [p.id, p.full_name || 'Student']))
    }

    const results = (answers || []).map((a: any) => ({
      id: a.id,
      student_id: a.student_id,
      student_name: namesById.get(a.student_id) || 'Student',
      answer_data: a.answer_data,
      is_correct: a.is_correct,
      score: a.score,
      feedback: a.feedback,
      submitted_at: a.submitted_at,
    }))

    return NextResponse.json({ block_id: resolvedParams.blockId, type: block.type, answers: results })
  } catch (err: any) {
    console.error('[student-answers] unhandled_error', { message: err?.message, stack: err?.stack })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
