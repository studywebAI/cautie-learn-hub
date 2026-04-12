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
    const cookieStore = cookies()
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

    return NextResponse.json({
      assignment_id: resolvedParams.assignmentId,
      title: (assignment as any).title,
      total_questions: (blocks || []).length,
      total_answers: (answers || []).length,
      question_metrics: questionMetrics,
    })
  } catch (error) {
    console.error('assignment analytics failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
