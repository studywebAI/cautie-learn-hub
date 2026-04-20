import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { deriveStudysetRuntimeStatus } from '@/lib/studysets/runtime'

export const dynamic = 'force-dynamic'

const TOOL_HREFS: Record<string, string> = {
  notes: '/tools/notes',
  flashcards: '/tools/flashcards',
  quiz: '/tools/quiz',
  wordweb: '/tools/notes',
  review: '/tools/studyset',
}

function extractFocusTopic(rawBundle: string | null | undefined, fallbackName: string) {
  if (!rawBundle) return fallbackName
  try {
    const parsed = JSON.parse(rawBundle)
    const text = String(
      parsed?.sources?.notes_text || parsed?.sources?.pasted_text || parsed?.sources?.context_text || ''
    ).trim()
    if (!text) return fallbackName
    const firstLine = text.split(/\r?\n/).map((line: string) => line.trim()).find(Boolean) || fallbackName
    return firstLine.slice(0, 80)
  } catch {
    return fallbackName
  }
}

function extractMeta(rawBundle: string | null | undefined) {
  if (!rawBundle) return { icon: null as string | null, color: null as string | null }
  try {
    const parsed = JSON.parse(rawBundle)
    return {
      icon: typeof parsed?.meta?.icon === 'string' ? parsed.meta.icon : null,
      color: typeof parsed?.meta?.color === 'string' ? parsed.meta.color : null,
    }
  } catch {
    return { icon: null, color: null }
  }
}

function getTaskHref(taskType: string, studysetId: string, taskId: string) {
  if (taskType === 'review') return `/tools/studyset/${studysetId}`
  const base = TOOL_HREFS[String(taskType || 'notes')] || '/tools/notes'
  return `${base}?studysetId=${studysetId}&taskId=${taskId}&launch=1`
}

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
      .select('id, name, confidence_level, target_days, minutes_per_day, status, source_bundle, created_at, updated_at')
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
          summary,
          estimated_minutes,
          completed,
          studyset_plan_tasks (
            id,
            task_type,
            title,
            description,
            estimated_minutes,
            position,
            completed
          )
        `)
        .eq('studyset_id', studyset.id)
        .order('day_number', { ascending: true }),
      (supabase as any)
        .from('studyset_task_attempts')
        .select('studyset_task_id, score, correct_items, total_items, created_at, task_type')
        .eq('user_id', user.id)
        .eq('studyset_id', studyset.id)
        .order('created_at', { ascending: false })
        .limit(800),
      (supabase as any)
        .from('studyset_mastery_topics')
        .select('topic_label, weakness_score, mastery_score, exposure_count, updated_at')
        .eq('user_id', user.id)
        .eq('studyset_id', studyset.id)
        .order('weakness_score', { ascending: false })
        .limit(12),
    ])

    if (daysResult.error) return NextResponse.json({ error: daysResult.error.message }, { status: 500 })

    const days = (daysResult.data || []).map((day: any) => ({
      ...day,
      studyset_plan_tasks: (day.studyset_plan_tasks || []).sort(
        (a: any, b: any) => Number(a.position || 0) - Number(b.position || 0)
      ),
    }))

    const totalTasks = days.reduce((sum: number, day: any) => sum + (day.studyset_plan_tasks?.length || 0), 0)
    const completedTasks = days.reduce(
      (sum: number, day: any) => sum + (day.studyset_plan_tasks || []).filter((task: any) => task.completed).length,
      0
    )
    const completionPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)

    const attempts = Array.isArray(attemptsResult.data) ? attemptsResult.data : []
    const avgScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((sum: number, row: any) => sum + Number(row?.score || 0), 0) / attempts.length)
        : 0

    const attemptsByDay = new Map<string, { total: number; sum: number }>()
    for (const row of attempts) {
      const dayKey = String(row?.created_at || '').slice(0, 10)
      if (!dayKey) continue
      const existing = attemptsByDay.get(dayKey) || { total: 0, sum: 0 }
      existing.total += 1
      existing.sum += Number(row?.score || 0)
      attemptsByDay.set(dayKey, existing)
    }
    const scoreTrend7d = Array.from(attemptsByDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([date, value]) => ({
        date,
        avg_score: value.total > 0 ? Math.round(value.sum / value.total) : 0,
        attempts: value.total,
      }))

    const toolTaskCounts = new Map<string, { total_tasks: number; completed_tasks: number }>()
    for (const day of days) {
      for (const task of Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks : []) {
        const tool = String(task?.task_type || 'notes')
        const row = toolTaskCounts.get(tool) || { total_tasks: 0, completed_tasks: 0 }
        row.total_tasks += 1
        if (task?.completed === true) row.completed_tasks += 1
        toolTaskCounts.set(tool, row)
      }
    }

    const toolScoreRows = new Map<string, { sum: number; total: number }>()
    for (const row of attempts) {
      const tool = String(row?.task_type || 'notes')
      const score = Number(row?.score || 0)
      const bucket = toolScoreRows.get(tool) || { sum: 0, total: 0 }
      bucket.sum += score
      bucket.total += 1
      toolScoreRows.set(tool, bucket)
    }

    const toolBreakdown = Array.from(toolTaskCounts.entries()).map(([tool, counts]) => {
      const scoreBucket = toolScoreRows.get(tool) || { sum: 0, total: 0 }
      const avgToolScore = scoreBucket.total > 0 ? Math.round(scoreBucket.sum / scoreBucket.total) : 0
      return {
        tool,
        total_tasks: counts.total_tasks,
        completed_tasks: counts.completed_tasks,
        completion_percent: counts.total_tasks > 0 ? Math.round((counts.completed_tasks / counts.total_tasks) * 100) : 0,
        avg_score: avgToolScore,
      }
    })
    const rankedByScore = toolBreakdown
      .filter((row) => Number(row.total_tasks || 0) > 0)
      .sort((a, b) => Number(a.avg_score || 0) - Number(b.avg_score || 0))
    const weakestTool = rankedByScore[0] || null
    const strongestTool = rankedByScore.length > 0 ? rankedByScore[rankedByScore.length - 1] : null

    const taskMetrics: Record<
      string,
      {
        attempts: number
        latest_score: number
        latest_correct_items: number
        latest_total_items: number
        last_attempt_at: string | null
      }
    > = {}
    for (const row of attempts) {
      const taskId = String(row?.studyset_task_id || '')
      if (!taskId) continue
      if (!taskMetrics[taskId]) {
        taskMetrics[taskId] = {
          attempts: 1,
          latest_score: Number(row?.score || 0),
          latest_correct_items: Number(row?.correct_items || 0),
          latest_total_items: Number(row?.total_items || 0),
          last_attempt_at: row?.created_at ? String(row.created_at) : null,
        }
      } else {
        taskMetrics[taskId].attempts += 1
      }
    }

    const todayIso = new Date().toISOString().slice(0, 10)
    const pendingTasks: Array<{ day: any; task: any }> = []
    let dueTodayTasks = 0
    for (const day of days) {
      const planDate = String(day?.plan_date || '').slice(0, 10)
      for (const task of Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks : []) {
        if (task?.completed === true) continue
        pendingTasks.push({ day, task })
        if (planDate === todayIso) dueTodayTasks += 1
      }
    }
    const activePending = pendingTasks.filter((entry) => {
      const planDate = String(entry?.day?.plan_date || '').slice(0, 10)
      return !planDate || planDate <= todayIso
    })
    const nextPending = activePending[0] || pendingTasks[0] || null
    const nextTaskHref = nextPending
      ? getTaskHref(String(nextPending.task.task_type || 'notes'), String(studyset.id), String(nextPending.task.id))
      : null

    const hasOverduePendingTasks = pendingTasks.some((entry) => {
      const planDate = String(entry?.day?.plan_date || '').slice(0, 10)
      return Boolean(planDate) && planDate < todayIso
    })
    const derivedStatus = deriveStudysetRuntimeStatus({
      currentStatus: studyset.status,
      totalTasks,
      completedTasks,
      hasOverduePendingTasks,
    })
    if (derivedStatus !== String(studyset.status || '')) {
      await (supabase as any)
        .from('studysets')
        .update({
          status: derivedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studyset.id)
        .eq('user_id', user.id)
      studyset.status = derivedStatus
    }

    let adaptive: any = null
    const weakTopicsFromTable = Array.isArray(masteryResult.data)
      ? masteryResult.data
          .filter((row: any) => Number(row?.weakness_score || 0) > Number(row?.mastery_score || 0))
          .map((row: any) => String(row?.topic_label || '').trim())
          .filter(Boolean)
      : []
    if (avgScore > 0 || weakTopicsFromTable.length > 0) {
      adaptive = {
        avg_score: avgScore,
        mastery_band: avgScore >= 85 ? 'strong' : avgScore < 60 ? 'weak' : 'developing',
        last_issues: weakTopicsFromTable.length > 0 ? [`Weak areas: ${weakTopicsFromTable.slice(0, 4).join(', ')}`] : [],
        updated_at: attempts[0]?.created_at || null,
      }
    }
    if (!adaptive) {
      try {
        const parsed = studyset?.source_bundle ? JSON.parse(studyset.source_bundle) : null
        const runtimeAdaptive = parsed?.runtime?.adaptive
        if (runtimeAdaptive && typeof runtimeAdaptive === 'object') {
          adaptive = {
            avg_score: Number(runtimeAdaptive.avg_score || 0),
            mastery_band: String(runtimeAdaptive.mastery_band || ''),
            last_issues: Array.isArray(runtimeAdaptive.last_issues) ? runtimeAdaptive.last_issues : [],
            updated_at: runtimeAdaptive.updated_at || null,
          }
        }
      } catch {
        // keep null
      }
    }

    const focusTopic = extractFocusTopic(studyset.source_bundle, String(studyset.name || 'Study topic'))
    const aiBrief = {
      title: `Today focus: ${focusTopic}`,
      summary:
        adaptive?.last_issues?.length > 0
          ? `Focus weak areas first: ${adaptive.last_issues.join(' | ')}`
          : `Keep momentum on ${focusTopic}. Start with the next pending task.`,
      recommendation: nextPending
        ? {
            tool: String(nextPending.task.task_type || 'notes'),
            taskTitle: String(nextPending.task.title || 'Next task'),
            href: nextTaskHref,
            dayNumber: Number(nextPending.day?.day_number || 1),
          }
        : null,
    }

    const daysCompleted = days.filter((day: any) => day.completed === true).length
    const masteryTopics = (Array.isArray(masteryResult.data) ? masteryResult.data : []).map((row: any) => ({
      topic_label: String(row?.topic_label || ''),
      weakness_score: Number(row?.weakness_score || 0),
      mastery_score: Number(row?.mastery_score || 0),
      exposure_count: Number(row?.exposure_count || 0),
      updated_at: row?.updated_at ? String(row.updated_at) : null,
    }))
    const masteryRisk = masteryTopics
      .map((topic: any) => ({
        topic_label: topic.topic_label,
        risk_score: Math.max(0, Number(topic.weakness_score || 0) - Number(topic.mastery_score || 0)),
        weakness_score: Number(topic.weakness_score || 0),
        mastery_score: Number(topic.mastery_score || 0),
      }))
      .sort((a: any, b: any) => b.risk_score - a.risk_score)
      .slice(0, 10)

    const recentAttempts7d = attempts.filter((row: any) => {
      const at = new Date(String(row?.created_at || '')).getTime()
      return Number.isFinite(at) && at >= Date.now() - 7 * 24 * 60 * 60 * 1000
    }).length
    const recent6 = attempts.slice(0, 6).map((row: any) => Number(row?.score || 0))
    const recent3 = recent6.slice(0, 3)
    const prior3 = recent6.slice(3, 6)
    const recent3Avg = recent3.length > 0 ? Math.round(recent3.reduce((s, v) => s + v, 0) / recent3.length) : 0
    const prior3Avg = prior3.length > 0 ? Math.round(prior3.reduce((s, v) => s + v, 0) / prior3.length) : 0
    const momentumDelta = recent3.length > 0 && prior3.length > 0 ? recent3Avg - prior3Avg : 0
    const momentum =
      momentumDelta >= 6 ? 'up'
      : momentumDelta <= -6 ? 'down'
      : 'flat'
    const pendingTasksCount = Math.max(0, totalTasks - completedTasks)
    const pendingDaysCount = Math.max(0, days.length - daysCompleted)
    let forecastFinishDate: string | null = null
    const pendingPlanDates = days
      .filter((day: any) => day.completed !== true)
      .map((day: any) => String(day?.plan_date || '').slice(0, 10))
      .filter((date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort()
    if (pendingPlanDates.length > 0) forecastFinishDate = pendingPlanDates[pendingPlanDates.length - 1]

    const { icon, color } = extractMeta(studyset.source_bundle)
    return NextResponse.json({
      studyset: {
        ...studyset,
        meta: { icon, color },
      },
      days,
      adaptive,
      task_metrics: taskMetrics,
      ai_brief: aiBrief,
      next_task_href: nextTaskHref,
      analytics: {
        completion_percent: completionPercent,
        completed_tasks: completedTasks,
        total_tasks: totalTasks,
        completed_days: daysCompleted,
        total_days: days.length,
        due_today_tasks: dueTodayTasks,
        avg_score: avgScore,
        score_trend_7d: scoreTrend7d,
        tool_breakdown: toolBreakdown,
        mastery_topics: masteryTopics,
        mastery_risk: masteryRisk,
        performance_summary: {
          weakest_tool: weakestTool,
          strongest_tool: strongestTool,
          momentum,
          momentum_delta: momentumDelta,
          recent3_avg: recent3Avg,
          prior3_avg: prior3Avg,
        },
        pace: {
          recent_attempts_7d: recentAttempts7d,
          pending_tasks: pendingTasksCount,
          pending_days: pendingDaysCount,
          forecast_finish_date: forecastFinishDate,
        },
      },
      progress: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        percent: completionPercent,
      },
    })
  } catch (error) {
    console.error('studyset detail GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
