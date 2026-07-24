import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { normalizeBlockSettings, normalizeAssignmentSettings } from '@/lib/assignments/settings'

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
      .select('id, class_id, title, settings')
      .eq('id', resolvedParams.assignmentId)
      .maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    const assignmentSettings = normalizeAssignmentSettings((assignment as any).settings || {})
    const selfGradeEnabled = assignmentSettings.grading.gradingMode === 'self'

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
      .filter((b: any) => b.type !== 'text' && b.type !== 'image' && b.type !== 'video' && b.type !== 'timeline' && b.type !== 'poll')
      .map((block: any) => {
        const answer = answerByBlock.get(block.id)
        const settings = normalizeBlockSettings(block.settings || block.data?.settings || {})
        return {
          block_id: block.id,
          type: block.type,
          question: block.data?.question || block.data?.prompt || '',
          max_points: settings.points,
          // Raw block content (options/answers/correct_order/pairs/etc.) so the
          // client can render a per-type student-vs-correct comparison instead
          // of guessing from a single flattened field.
          block_data: block.data ?? null,
          correct_answer: block.data?.correct_answer ?? block.data?.answer ?? block.data?.options ?? block.data?.correct_order ?? block.data?.pairs ?? null,
          student_answer: answer?.answer_data ?? null,
          is_correct: answer?.is_correct ?? null,
          score: answer?.score ?? null,
          feedback: answer?.feedback ?? null,
          // Open questions only actually get auto-graded when gradingMode
          // is 'auto' (see submit/route.ts) -- in 'self' mode they sit at
          // null until the student marks themselves via POST self-grade.
          can_self_grade: selfGradeEnabled && block.type === 'open_question' && answer?.is_correct == null,
        }
      })

    const ownGrade = ((gradeSet as any).student_grades || []).find((g: any) => g.student_id === user.id) || null

    return NextResponse.json({
      assignment_title: assignment.title,
      grade_released: !!(gradeSet as any).grade_released_at,
      grade: (gradeSet as any).grade_released_at ? ownGrade : null,
      self_grade_enabled: selfGradeEnabled,
      questions,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — self-grade: the student marks their own open-question answer
// right or wrong (with a self-assigned score) once results are released,
// but only when this assignment's grading mode is 'self'. graded_by is set
// to the student's own id (distinct from a teacher's id or graded_by_ai),
// which is how this is told apart from a real teacher/AI grade elsewhere.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const blockId = String(body?.block_id || '')
    const score = Number(body?.score)
    if (!blockId || !Number.isFinite(score) || score < 0) {
      return NextResponse.json({ error: 'block_id and a non-negative score are required' }, { status: 400 })
    }

    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, settings')
      .eq('id', resolvedParams.assignmentId)
      .maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    const assignmentSettings = normalizeAssignmentSettings((assignment as any).settings || {})
    if (assignmentSettings.grading.gradingMode !== 'self') {
      return NextResponse.json({ error: 'Self-grading is not enabled for this assignment' }, { status: 403 })
    }

    const { data: gradeSet } = await supabase
      .from('grade_sets')
      .select('id, answers_released_at')
      .eq('assignment_id', resolvedParams.assignmentId)
      .maybeSingle()
    if (!gradeSet || !(gradeSet as any).answers_released_at) {
      return NextResponse.json({ error: 'Results not released yet' }, { status: 403 })
    }

    const { data: block } = await supabase
      .from('blocks')
      .select('id, type, settings, data')
      .eq('id', blockId)
      .eq('assignment_id', resolvedParams.assignmentId)
      .maybeSingle()
    if (!block || (block as any).type !== 'open_question') {
      return NextResponse.json({ error: 'Block not found or not self-gradeable' }, { status: 404 })
    }
    const blockSettings = normalizeBlockSettings((block as any).settings || (block as any).data?.settings || {})
    const cappedScore = Math.min(score, Number(blockSettings.points || 1))

    const { data: existing } = await supabase
      .from('student_answers')
      .select('id, is_correct')
      .eq('student_id', user.id)
      .eq('block_id', blockId)
      .maybeSingle()
    if (!existing) return NextResponse.json({ error: 'No submitted answer to grade' }, { status: 404 })
    if ((existing as any).is_correct !== null) {
      return NextResponse.json({ error: 'This answer already has a score' }, { status: 409 })
    }

    const isCorrect = cappedScore >= Number(blockSettings.points || 1) * 0.7
    const { error: updateError } = await supabase
      .from('student_answers')
      .update({
        score: cappedScore,
        is_correct: isCorrect,
        graded_by: user.id,
        graded_by_ai: false,
        graded_at: new Date().toISOString(),
      })
      .eq('id', (existing as any).id)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ success: true, score: cappedScore, is_correct: isCorrect })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
