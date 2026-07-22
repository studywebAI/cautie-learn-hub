import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions'

export const dynamic = 'force-dynamic'

// Mirrors app/api/classes/[classId]/grades/[gradeSetId]/answer-review/route.ts,
// keyed on subject_id instead of class_id.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; gradeSetId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const { subjectId, gradeSetId } = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId)
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: gradeSet, error: gradeSetError } = await (supabase as any)
      .from('grade_sets')
      .select('id, subject_id, assignment_id')
      .eq('id', gradeSetId)
      .eq('subject_id', subjectId)
      .maybeSingle()
    if (gradeSetError || !gradeSet) {
      return NextResponse.json({ error: 'Grade set not found' }, { status: 404 })
    }
    if (!gradeSet.assignment_id) return NextResponse.json({ questions: [] })

    const { data: blocks, error: blocksError } = await (supabase as any)
      .from('blocks')
      .select('id, type, position, data')
      .eq('assignment_id', gradeSet.assignment_id)
      .in('type', ['multiple_choice', 'open_question', 'fill_in_blank', 'drag_drop', 'matching', 'ordering'])
      .order('position', { ascending: true })
    if (blocksError) {
      return NextResponse.json({ error: blocksError.message }, { status: 500 })
    }

    const blockIds = (blocks || []).map((b: any) => b.id)
    if (blockIds.length === 0) return NextResponse.json({ questions: [] })

    const { data: answers, error: answersError } = await (supabase as any)
      .from('student_answers')
      .select('student_id, block_id, answer_data, is_correct, score')
      .in('block_id', blockIds)
    if (answersError) {
      return NextResponse.json({ error: answersError.message }, { status: 500 })
    }

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
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
