import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET — question blocks + every student's answer for the test/assignment
// linked to a grade set. Powers the Grades tab's answer-compare view
// (docs/mockups/editor-redesign.html "Grade tab keeps both" -- split-screen
// and per-student list), scoped by class teacher membership rather than the
// weaker generic /api/blocks?assignment_id= route.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string; gradeSetId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const { classId, gradeSetId } = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle()
    const role = String(membership?.role || '').toLowerCase()
    const isTeacher = role === 'teacher' || role === 'owner' || role === 'admin' || role === 'creator'
    if (!isTeacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: gradeSet, error: gradeSetError } = await (supabase as any)
      .from('grade_sets')
      .select('id, class_id, assignment_id')
      .eq('id', gradeSetId)
      .eq('class_id', classId)
      .maybeSingle()
    if (gradeSetError || !gradeSet) return NextResponse.json({ error: 'Grade set not found' }, { status: 404 })
    if (!gradeSet.assignment_id) return NextResponse.json({ questions: [] })

    const { data: blocks, error: blocksError } = await (supabase as any)
      .from('blocks')
      .select('id, type, position, data')
      .eq('assignment_id', gradeSet.assignment_id)
      .in('type', ['multiple_choice', 'open_question', 'fill_in_blank', 'drag_drop', 'matching', 'ordering'])
      .order('position', { ascending: true })
    if (blocksError) return NextResponse.json({ error: blocksError.message }, { status: 500 })

    const blockIds = (blocks || []).map((b: any) => b.id)
    if (blockIds.length === 0) return NextResponse.json({ questions: [] })

    const { data: answers, error: answersError } = await (supabase as any)
      .from('student_answers')
      .select('student_id, block_id, answer_data, is_correct, score')
      .in('block_id', blockIds)
    if (answersError) return NextResponse.json({ error: answersError.message }, { status: 500 })

    const studentIds = Array.from(new Set((answers || []).map((a: any) => a.student_id).filter(Boolean)))
    let namesById = new Map<string, string>()
    if (studentIds.length > 0) {
      const { data: profiles } = await (supabase as any).from('profiles').select('id, full_name').in('id', studentIds)
      namesById = new Map((profiles || []).map((p: any) => [p.id, p.full_name || 'Student']))
    }

    const answersByBlock = new Map<string, any[]>()
    for (const a of answers || []) {
      const list = answersByBlock.get(a.block_id) || []
      list.push({
        student_id: a.student_id,
        student_name: namesById.get(a.student_id) || 'Student',
        answer_data: a.answer_data,
        is_correct: a.is_correct,
        score: a.score,
      })
      answersByBlock.set(a.block_id, list)
    }

    const referenceAnswer = (block: any) => {
      if (block.type === 'multiple_choice') {
        return ((block.data?.options || []) as any[]).filter((o) => o?.correct).map((o) => o?.text || '').join(', ')
      }
      if (block.type === 'open_question') return block.data?.correct_answer || ''
      if (block.type === 'fill_in_blank') return ((block.data?.answers || []) as string[]).filter(Boolean).join(', ')
      return ''
    }

    const questions = (blocks || []).map((b: any) => ({
      block_id: b.id,
      type: b.type,
      question: b.data?.question || b.data?.prompt || b.data?.header || '',
      correct_answer: referenceAnswer(b),
      answers: answersByBlock.get(b.id) || [],
    }))

    return NextResponse.json({ questions })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
