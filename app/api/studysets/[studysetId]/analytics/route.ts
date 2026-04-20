import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ studysetId: string }> }
) {
  try {
    const { studysetId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: studyset, error: studysetError } = await (supabase as any)
      .from('studysets')
      .select('id, user_id, name')
      .eq('id', studysetId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (studysetError) return NextResponse.json({ error: studysetError.message }, { status: 500 })
    if (!studyset) return NextResponse.json({ error: 'Studyset not found' }, { status: 404 })

    const [daysResult, attemptsResult, masteryResult] = await Promise.all([
      (supabase as any)
        .from('studyset_plan_days')
        .select(`
          id,
          day_number,
          plan_date,
          completed,
          studyset_plan_tasks (
            id,
            completed
          )
        `)
        .eq('studyset_id', studyset.id)
        .order('day_number', { ascending: true }),
      (supabase as any)
        .from('studyset_task_attempts')
        .select('score, created_at, task_type')
        .eq('user_id', user.id)
        .eq('studyset_id', studyset.id)
        .order('created_at', { ascending: false })
        .limit(1200),
      (supabase as any)
        .from('studyset_mastery_topics')
        .select('topic_label, weakness_score, mastery_score, exposure_count, updated_at')
        .eq('user_id', user.id)
        .eq('studyset_id', studyset.id)
        .order('weakness_score', { ascending: false })
        .limit(20),
    ])

    if (daysResult.error) return NextResponse.json({ error: daysResult.error.message }, { status: 500 })

    const days = Array.isArray(daysResult.data) ? daysResult.data : []
    const attempts = Array.isArray(attemptsResult.data) ? attemptsResult.data : []
    const mastery = Array.isArray(masteryResult.data) ? masteryResult.data : []

    const totalTasks = days.reduce(
      (sum: number, day: any) => sum + (Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks.length : 0),
      0
    )
    const completedTasks = days.reduce(
      (sum: number, day: any) =>
        sum +
        (Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks.filter((task: any) => task?.completed === true).length : 0),
      0
    )

    const byDate = new Map<string, { sum: number; attempts: number }>()
    for (const attempt of attempts) {
      const date = String(attempt?.created_at || '').slice(0, 10)
      if (!date) continue
      const row = byDate.get(date) || { sum: 0, attempts: 0 }
      row.sum += Number(attempt?.score || 0)
      row.attempts += 1
      byDate.set(date, row)
    }
    const scoreTrend30d = Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, row]) => ({
        date,
        avg_score: row.attempts > 0 ? Math.round(row.sum / row.attempts) : 0,
        attempts: row.attempts,
      }))

    return NextResponse.json({
      studyset: {
        id: studyset.id,
        name: studyset.name,
      },
      totals: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_percent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      score_trend_30d: scoreTrend30d,
      mastery_topics: mastery,
      days: days.map((day: any) => ({
        id: day.id,
        day_number: Number(day.day_number || 0),
        plan_date: day.plan_date || null,
        completed: day.completed === true,
        total_tasks: Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks.length : 0,
        completed_tasks: Array.isArray(day?.studyset_plan_tasks)
          ? day.studyset_plan_tasks.filter((task: any) => task?.completed === true).length
          : 0,
      })),
    })
  } catch (error) {
    console.error('studyset analytics GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
