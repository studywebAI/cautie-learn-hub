import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { normalizeBlockSettings } from '@/lib/assignments/settings'

export const dynamic = 'force-dynamic'

// GET — student-facing nakijk-resultaten (per vraag goed/fout), gated on the
// linked grade_sets.answers_released_at. Separate from the cijfer itself
// (see docs/grades-feature-brainstorm.md section H point 4/9).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, class_id, title')
      .eq('id', resolvedParams.assignmentId)
      .maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

    const { data: gradeSet } = await supabase
      .from('grade_sets')
      .select('id, answers_released_at, grade_released_at, student_grades(student_id, grade_numeric, grade_value)')
      .eq('assignment_id', resolvedParams.assignmentId)
      .maybeSingle()

    if (!gradeSet || !(gradeSet as any).answers_released_at) {
      return NextResponse.json({ error: 'Results not released yet' }, { status: 403 })
    }

    const { data: blocks } = await supabase
      .from('blocks')
      .select('id, type, data, settings, block_index')
      .eq('assignment_id', resolvedParams.assignmentId)
      .order('block_index', { ascending: true })

    const blockIds = (blocks || []).map((b: any) => b.id)
    const { data: answers } = blockIds.length > 0
      ? await supabase
          .from('student_answers')
          .select('block_id, answer_data, is_correct, score, feedback')
          .eq('student_id', user.id)
          .in('block_id', blockIds)
      : { data: [] as any[] }

    const answerByBlock = new Map((answers || []).map((a: any) => [a.block_id, a]))

    const questions = (blocks || [])
      .filter((b: any) => b.type !== 'text' && b.type !== 'image' && b.type !== 'video')
      .map((block: any) => {
        const answer = answerByBlock.get(block.id)
        const settings = normalizeBlockSettings(block.settings || block.data?.settings || {})
        return {
          block_id: block.id,
          type: block.type,
          question: block.data?.question || '',
          max_points: settings.points,
          correct_answer: block.data?.correct_answer ?? block.data?.answer ?? block.data?.options ?? block.data?.correct_order ?? block.data?.pairs ?? null,
          student_answer: answer?.answer_data ?? null,
          is_correct: answer?.is_correct ?? null,
          score: answer?.score ?? null,
          feedback: answer?.feedback ?? null,
        }
      })

    const ownGrade = ((gradeSet as any).student_grades || []).find((g: any) => g.student_id === user.id) || null

    return NextResponse.json({
      assignment_title: assignment.title,
      grade_released: !!(gradeSet as any).grade_released_at,
      grade: (gradeSet as any).grade_released_at ? ownGrade : null,
      questions,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
