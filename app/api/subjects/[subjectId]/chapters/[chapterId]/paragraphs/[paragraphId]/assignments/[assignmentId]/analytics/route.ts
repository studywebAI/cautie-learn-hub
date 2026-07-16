import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { normalizeBlockSettings } from '@/lib/assignments/settings'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
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

    const { data: member } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', (assignment as any).class_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: blocks } = await supabase
      .from('blocks')
      .select('id, type, data, settings, position')
      .eq('assignment_id', resolvedParams.assignmentId)
      .order('position', { ascending: true })

    const blockIds = (blocks || []).map((b: any) => b.id)
    const { data: answers } = blockIds.length > 0
      ? await supabase
        .from('student_answers')
        .select('block_id, score, is_correct, submitted_at, student_id')
        .in('block_id', blockIds)
      : { data: [] as any[] }

    const answersByBlock = new Map<string, any[]>()
    ;(answers || []).forEach((a: any) => {
      const arr = answersByBlock.get(a.block_id) || []
      arr.push(a)
      answersByBlock.set(a.block_id, arr)
    })

    const questionMetrics = (blocks || []).map((b: any) => {
      const blockAnswers = answersByBlock.get(b.id) || []
      const settings = normalizeBlockSettings(b.settings || b.data?.settings || {})
      const scoreValues = blockAnswers
        .map((x: any) => Number(x.score))
        .filter((x: number) => Number.isFinite(x))
      const avgScore = scoreValues.length > 0
        ? scoreValues.reduce((sum: number, v: number) => sum + v, 0) / scoreValues.length
        : 0
      const correctCount = blockAnswers.filter((x: any) => x.is_correct === true).length
      const wrongCount = blockAnswers.filter((x: any) => x.is_correct === false).length
      const attempts = blockAnswers.length
      const errorRate = attempts > 0 ? (wrongCount / attempts) * 100 : 0
      const difficulty = 100 - (attempts > 0 ? (correctCount / attempts) * 100 : 0)
      return {
        block_id: b.id,
        type: b.type,
        points: settings.points,
        attempts,
        average_score: Number(avgScore.toFixed(2)),
        correct_count: correctCount,
        wrong_count: wrongCount,
        error_rate_percent: Number(errorRate.toFixed(2)),
        difficulty_percent: Number(difficulty.toFixed(2)),
      }
    })

    // Per-student rollup ("scores van mensen" — docs/subjects-feature-
    // brainstorm.md section H Information tab): aggregate the same answers
    // by student_id instead of by block_id.
    const answersByStudent = new Map<string, any[]>()
    ;(answers || []).forEach((a: any) => {
      if (!a.student_id) return
      const arr = answersByStudent.get(a.student_id) || []
      arr.push(a)
      answersByStudent.set(a.student_id, arr)
    })

    // Time spent: no dedicated duration tracking exists, so this is a proxy —
    // span between a student's earliest and latest activity (assignment_events
    // rows, which include 'assignment_open', plus student_answers submissions),
    // same heuristic class already used for G4's "possiblyLeft" detection.
    const { data: events } = await supabase
      .from('assignment_events')
      .select('student_id, created_at')
      .eq('assignment_id', resolvedParams.assignmentId)

    const activityByStudent = new Map<string, { min: number; max: number }>()
    const trackActivity = (studentId: string | null | undefined, iso: string | null | undefined) => {
      if (!studentId || !iso) return
      const t = new Date(iso).getTime()
      if (!Number.isFinite(t)) return
      const existing = activityByStudent.get(studentId)
      if (!existing) {
        activityByStudent.set(studentId, { min: t, max: t })
      } else {
        existing.min = Math.min(existing.min, t)
        existing.max = Math.max(existing.max, t)
      }
    }
    ;(events || []).forEach((e: any) => trackActivity(e.student_id, e.created_at))
    ;(answers || []).forEach((a: any) => trackActivity(a.student_id, a.submitted_at))

    const studentIds = Array.from(new Set([...answersByStudent.keys(), ...activityByStudent.keys()]))
    let namesById = new Map<string, string>()
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)
      ;(profiles || []).forEach((p: any) => {
        namesById.set(p.id, p.full_name || p.email || 'Student')
      })
    }

    const studentScores = studentIds.map((studentId) => {
      const studentAnswers = answersByStudent.get(studentId) || []
      const correctCount = studentAnswers.filter((x: any) => x.is_correct === true).length
      const totalAnswered = studentAnswers.length
      const scorePercent = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0
      const lastSubmittedAt = studentAnswers.reduce((latest: string | null, x: any) => {
        if (!x.submitted_at) return latest
        if (!latest || new Date(x.submitted_at) > new Date(latest)) return x.submitted_at
        return latest
      }, null as string | null)
      const activity = activityByStudent.get(studentId)
      const timeSpentMinutes = activity ? Math.max(0, Math.round((activity.max - activity.min) / 60000)) : null
      return {
        student_id: studentId,
        name: namesById.get(studentId) || 'Student',
        total_answered: totalAnswered,
        total_questions: (blocks || []).length,
        correct_count: correctCount,
        score_percent: Number(scorePercent.toFixed(2)),
        last_submitted_at: lastSubmittedAt,
        time_spent_minutes: timeSpentMinutes,
      }
    }).sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      assignment_id: resolvedParams.assignmentId,
      title: (assignment as any).title,
      total_questions: (blocks || []).length,
      total_answers: (answers || []).length,
      question_metrics: questionMetrics,
      student_scores: studentScores,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
