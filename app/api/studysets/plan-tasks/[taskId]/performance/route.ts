import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PerformancePayload = {
  toolId?: string
  score?: number
  totalItems?: number
  correctItems?: number
  timeSpentSeconds?: number
  weakTopics?: string[]
  notes?: string
  markCompleted?: boolean
}

type AdaptiveHistoryEntry = {
  at: string
  task_id: string
  tool_id: string
  score: number
  total_items: number
  correct_items: number
  time_spent_seconds: number
}

function normalizeTopicKey(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function parseBundle(raw: string | null | undefined): any {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
    return {}
  } catch {
    return {}
  }
}

function stripAdaptivePrefix(input: string | null | undefined): string {
  const value = String(input || '').trim()
  if (!value) return ''
  return value
    .replace(/^Adaptive focus:[^\n]*\n?/i, '')
    .replace(/^Adaptive challenge:[^\n]*\n?/i, '')
    .trim()
}

function buildAdaptiveDescription(
  baseDescription: string | null | undefined,
  weakTopics: string[],
  score: number
) {
  const clean = stripAdaptivePrefix(baseDescription)
  const topicHint = weakTopics.slice(0, 3).join(', ')
  if (score < 60) {
    const prefix = topicHint
      ? `Adaptive focus: reinforce weak areas (${topicHint}).`
      : 'Adaptive focus: reinforce weak areas from recent mistakes.'
    return clean ? `${prefix}\n${clean}` : prefix
  }
  if (score >= 85) {
    const prefix = 'Adaptive challenge: increase difficulty and mixed retrieval.'
    return clean ? `${prefix}\n${clean}` : prefix
  }
  return clean
}

function summarizeIssues(score: number, weakTopics: string[]) {
  if (score >= 80) return []
  const issues: string[] = []
  if (score < 60) issues.push('High error rate detected. Increase reinforcement tasks.')
  else issues.push('Moderate instability detected. Keep targeted review active.')
  if (weakTopics.length > 0) issues.push(`Weak areas: ${weakTopics.slice(0, 4).join(', ')}`)
  return issues
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as PerformancePayload
    const incomingScore = Number(body?.score ?? NaN)
    const totalItems = clamp(Number(body?.totalItems || 0), 0, 500)
    const correctItems = clamp(Number(body?.correctItems || 0), 0, Math.max(0, totalItems))
    const derivedScore = Number.isFinite(incomingScore)
      ? clamp(incomingScore, 0, 100)
      : totalItems > 0
        ? Math.round((correctItems / totalItems) * 100)
        : 70
    const timeSpentSeconds = clamp(Number(body?.timeSpentSeconds || 0), 0, 60 * 60 * 6)
    const toolId = String(body?.toolId || 'unknown').slice(0, 32)
    const weakTopics = Array.isArray(body?.weakTopics)
      ? body.weakTopics.map((topic) => String(topic || '').trim()).filter(Boolean).slice(0, 8)
      : []
    const markCompleted = body?.markCompleted !== false

    const { data: taskRow, error: taskError } = await (supabase as any)
      .from('studyset_plan_tasks')
      .select(`
        id,
        title,
        description,
        task_type,
        estimated_minutes,
        position,
        completed,
        studyset_day_id,
        studyset_plan_days!inner (
          id,
          day_number,
          studyset_id,
          studysets!inner (
            id,
            user_id,
            source_bundle
          )
        )
      `)
      .eq('id', taskId)
      .eq('studyset_plan_days.studysets.user_id', user.id)
      .maybeSingle()

    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 })
    if (!taskRow) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const day = taskRow.studyset_plan_days
    const studyset = day?.studysets
    if (!day || !studyset) return NextResponse.json({ error: 'Task relation invalid' }, { status: 500 })

    let normalizedAttemptsEnabled = true
    try {
      await (supabase as any).from('studyset_task_attempts').insert({
        user_id: user.id,
        studyset_id: day.studyset_id,
        studyset_day_id: day.id,
        studyset_task_id: taskId,
        task_type: String(taskRow.task_type || ''),
        tool_id: toolId,
        score: derivedScore,
        total_items: totalItems,
        correct_items: correctItems,
        time_spent_seconds: timeSpentSeconds,
        weak_topics: weakTopics,
        notes: typeof body?.notes === 'string' ? body.notes.slice(0, 5000) : null,
      })
    } catch {
      normalizedAttemptsEnabled = false
    }

    if (normalizedAttemptsEnabled && weakTopics.length > 0) {
      for (const topicLabel of weakTopics) {
        const topicKey = normalizeTopicKey(topicLabel)
        if (!topicKey) continue
        try {
          const { data: existingTopic } = await (supabase as any)
            .from('studyset_mastery_topics')
            .select('id, exposure_count, weakness_score, mastery_score')
            .eq('user_id', user.id)
            .eq('studyset_id', day.studyset_id)
            .eq('topic_key', topicKey)
            .maybeSingle()

          const weaknessDelta = derivedScore < 70 ? 2 : 1
          const masteryDelta = derivedScore >= 85 ? 1 : 0

          if (existingTopic?.id) {
            await (supabase as any)
              .from('studyset_mastery_topics')
              .update({
                topic_label: topicLabel.slice(0, 160),
                exposure_count: Number(existingTopic.exposure_count || 0) + 1,
                weakness_score: clamp(Number(existingTopic.weakness_score || 0) + weaknessDelta, 0, 1000),
                mastery_score: clamp(Number(existingTopic.mastery_score || 0) + masteryDelta, 0, 1000),
                last_seen_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingTopic.id)
          } else {
            await (supabase as any).from('studyset_mastery_topics').insert({
              user_id: user.id,
              studyset_id: day.studyset_id,
              topic_key: topicKey,
              topic_label: topicLabel.slice(0, 160),
              exposure_count: 1,
              weakness_score: weaknessDelta,
              mastery_score: masteryDelta,
              last_seen_at: new Date().toISOString(),
            })
          }
        } catch {
          // Keep request successful even if normalized table is not yet migrated.
        }
      }
    }

    if (markCompleted && taskRow.completed !== true) {
      await (supabase as any)
        .from('studyset_plan_tasks')
        .update({ completed: true })
        .eq('id', taskId)
        .eq('studyset_day_id', day.id)
    }

    const { data: dayTasks } = await (supabase as any)
      .from('studyset_plan_tasks')
      .select('id, completed')
      .eq('studyset_day_id', day.id)
    const dayCompleted = (dayTasks || []).length > 0 && (dayTasks || []).every((row: any) => row.completed === true)

    await (supabase as any)
      .from('studyset_plan_days')
      .update({ completed: dayCompleted })
      .eq('id', day.id)
      .eq('studyset_id', day.studyset_id)

    const bundle = parseBundle(studyset.source_bundle)
    const runtime = bundle.runtime && typeof bundle.runtime === 'object' ? bundle.runtime : {}
    const adaptive = runtime.adaptive && typeof runtime.adaptive === 'object' ? runtime.adaptive : {}
    const history: AdaptiveHistoryEntry[] = Array.isArray(adaptive.history) ? adaptive.history : []
    const weakTopicCounts = adaptive.weak_topic_counts && typeof adaptive.weak_topic_counts === 'object'
      ? adaptive.weak_topic_counts
      : {}

    weakTopics.forEach((topic) => {
      const key = topic.toLowerCase().slice(0, 100)
      const previous = Number(weakTopicCounts[key] || 0)
      weakTopicCounts[key] = clamp(previous + (derivedScore < 70 ? 2 : 1), 0, 999)
    })

    if (derivedScore >= 85) {
      Object.keys(weakTopicCounts).forEach((topic) => {
        weakTopicCounts[topic] = clamp(Number(weakTopicCounts[topic] || 0) - 1, 0, 999)
      })
    }

    const nextHistory = [
      ...history,
      {
        at: new Date().toISOString(),
        task_id: taskId,
        tool_id: toolId,
        score: derivedScore,
        total_items: totalItems,
        correct_items: correctItems,
        time_spent_seconds: timeSpentSeconds,
      },
    ].slice(-120)

    let avgScore = derivedScore
    if (normalizedAttemptsEnabled) {
      try {
        const { data: recentAttempts } = await (supabase as any)
          .from('studyset_task_attempts')
          .select('score')
          .eq('user_id', user.id)
          .eq('studyset_id', day.studyset_id)
          .order('created_at', { ascending: false })
          .limit(8)
        if (Array.isArray(recentAttempts) && recentAttempts.length > 0) {
          avgScore = Math.round(
            recentAttempts.reduce((sum: number, row: any) => sum + Number(row.score || 0), 0) / recentAttempts.length
          )
        } else {
          const recent = nextHistory.slice(-8)
          avgScore = recent.length > 0
            ? Math.round(recent.reduce((sum, item) => sum + Number(item.score || 0), 0) / recent.length)
            : derivedScore
        }
      } catch {
        const recent = nextHistory.slice(-8)
        avgScore = recent.length > 0
          ? Math.round(recent.reduce((sum, item) => sum + Number(item.score || 0), 0) / recent.length)
          : derivedScore
      }
    } else {
      const recent = nextHistory.slice(-8)
      avgScore = recent.length > 0
        ? Math.round(recent.reduce((sum, item) => sum + Number(item.score || 0), 0) / recent.length)
        : derivedScore
    }
    const masteryBand = avgScore >= 85 ? 'strong' : avgScore < 60 ? 'weak' : 'developing'
    const issues = summarizeIssues(derivedScore, weakTopics)

    const nextBundle = {
      ...bundle,
      runtime: {
        ...runtime,
        adaptive: {
          ...adaptive,
          history: nextHistory,
          weak_topic_counts: weakTopicCounts,
          avg_score: avgScore,
          mastery_band: masteryBand,
          last_issues: issues,
          last_task_id: taskId,
          updated_at: new Date().toISOString(),
        },
      },
    }

    const { error: updateStudysetError } = await (supabase as any)
      .from('studysets')
      .update({
        source_bundle: JSON.stringify(nextBundle),
        updated_at: new Date().toISOString(),
      })
      .eq('id', day.studyset_id)
      .eq('user_id', user.id)

    if (updateStudysetError) return NextResponse.json({ error: updateStudysetError.message }, { status: 500 })

    const { data: allTasks } = await (supabase as any)
      .from('studyset_plan_tasks')
      .select(`
        id,
        completed,
        studyset_plan_days!inner (
          studyset_id
        )
      `)
      .eq('studyset_plan_days.studyset_id', day.studyset_id)

    const totalTasks = (allTasks || []).length
    const completedTasks = (allTasks || []).filter((row: any) => row.completed === true).length
    const studysetStatus = totalTasks > 0 && completedTasks === totalTasks ? 'completed' : 'active'

    await (supabase as any)
      .from('studysets')
      .update({
        status: studysetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', day.studyset_id)
      .eq('user_id', user.id)

    const { data: futureTasks, error: futureTasksError } = await (supabase as any)
      .from('studyset_plan_tasks')
      .select(`
        id,
        task_type,
        title,
        description,
        estimated_minutes,
        studyset_plan_days!inner (
          id,
          day_number,
          studyset_id
        )
      `)
      .eq('studyset_plan_days.studyset_id', day.studyset_id)
      .gt('studyset_plan_days.day_number', Number(day.day_number || 0))
      .order('day_number', { ascending: true, foreignTable: 'studyset_plan_days' as any })
      .limit(80)

    if (futureTasksError) return NextResponse.json({ error: futureTasksError.message }, { status: 500 })

    const updates = (futureTasks || []).map((task: any) => {
      const currentMinutes = Number(task.estimated_minutes || 0)
      let nextMinutes = currentMinutes
      if (derivedScore < 60) {
        if (task.task_type === 'notes' || task.task_type === 'flashcards' || task.task_type === 'quiz') {
          nextMinutes = clamp(Math.round(currentMinutes * 1.2), currentMinutes + 3, currentMinutes + 15)
        }
      } else if (derivedScore >= 85) {
        if (task.task_type === 'notes' || task.task_type === 'flashcards') {
          nextMinutes = clamp(Math.round(currentMinutes * 0.9), Math.max(6, currentMinutes - 10), currentMinutes)
        }
      }

      const nextDescription = buildAdaptiveDescription(task.description, weakTopics, derivedScore)
      return {
        id: task.id,
        next_minutes: nextMinutes,
        next_description: nextDescription,
      }
    })

    for (const update of updates) {
      await (supabase as any)
        .from('studyset_plan_tasks')
        .update({
          estimated_minutes: update.next_minutes,
          description: update.next_description || null,
        })
        .eq('id', update.id)
    }

    return NextResponse.json({
      success: true,
      score: derivedScore,
      mastery_band: masteryBand,
      adapted_tasks: updates.length,
      issues,
      weak_topics: weakTopics,
      normalized: normalizedAttemptsEnabled,
    })
  } catch (error) {
    console.error('studyset task performance POST failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
