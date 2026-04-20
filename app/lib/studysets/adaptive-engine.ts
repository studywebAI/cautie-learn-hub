import { toLocalIsoDate } from '@/lib/studysets/runtime'

type ToolKey = 'notes' | 'flashcards' | 'quiz' | 'wordweb' | 'review' | 'unknown'

const TOOL_ORDER: ToolKey[] = ['notes', 'flashcards', 'quiz', 'wordweb', 'review', 'unknown']

function normalizeToolKey(value: unknown): ToolKey {
  const raw = String(value || '').toLowerCase()
  if (raw === 'notes') return 'notes'
  if (raw === 'flashcards') return 'flashcards'
  if (raw === 'quiz') return 'quiz'
  if (raw === 'wordweb') return 'wordweb'
  if (raw === 'review') return 'review'
  return 'unknown'
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function avg(values: number[]) {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function computeBand(score: number): 'weak' | 'developing' | 'strong' {
  if (score >= 85) return 'strong'
  if (score < 60) return 'weak'
  return 'developing'
}

function computeMomentum(delta: number): 'down' | 'flat' | 'up' {
  if (delta >= 6) return 'up'
  if (delta <= -6) return 'down'
  return 'flat'
}

function computeRecommendedAction(input: {
  band: 'weak' | 'developing' | 'strong'
  momentum: 'down' | 'flat' | 'up'
  avgScore: number
}): 'reinforce' | 'stabilize' | 'challenge' {
  if (input.band === 'weak') return 'reinforce'
  if (input.band === 'strong' && input.momentum !== 'down') return 'challenge'
  if (input.avgScore < 72 || input.momentum === 'down') return 'reinforce'
  return 'stabilize'
}

function toolLabel(toolKey: ToolKey) {
  if (toolKey === 'flashcards') return 'Flashcards'
  if (toolKey === 'quiz') return 'Quiz'
  if (toolKey === 'wordweb') return 'Concept map'
  if (toolKey === 'review') return 'Review'
  if (toolKey === 'notes') return 'Notes'
  return 'Study tool'
}

function getTaskHref(taskType: string, studysetId: string, taskId: string) {
  if (taskType === 'review') return `/tools/studyset/${studysetId}`
  if (taskType === 'flashcards') return `/tools/flashcards?studysetId=${studysetId}&taskId=${taskId}&launch=1`
  if (taskType === 'quiz') return `/tools/quiz?studysetId=${studysetId}&taskId=${taskId}&launch=1`
  return `/tools/notes?studysetId=${studysetId}&taskId=${taskId}&launch=1`
}

export async function upsertStudysetAdaptiveRuntime(input: {
  supabase: any
  userId: string
  studysetId: string
}) {
  const { supabase, userId, studysetId } = input

  const [attemptsResult, pendingTasksResult, masteryResult] = await Promise.all([
    (supabase as any)
      .from('studyset_task_attempts')
      .select('score, task_type, created_at')
      .eq('user_id', userId)
      .eq('studyset_id', studysetId)
      .order('created_at', { ascending: false })
      .limit(400),
    (supabase as any)
      .from('studyset_plan_tasks')
      .select(`
        id,
        task_type,
        title,
        completed,
        studyset_day_id,
        studyset_plan_days!inner (
          id,
          studyset_id,
          day_number,
          plan_date
        )
      `)
      .eq('studyset_plan_days.studyset_id', studysetId)
      .eq('completed', false)
      .order('day_number', { ascending: true, foreignTable: 'studyset_plan_days' as any })
      .order('position', { ascending: true }),
    (supabase as any)
      .from('studyset_mastery_topics')
      .select('topic_label, weakness_score, mastery_score')
      .eq('user_id', userId)
      .eq('studyset_id', studysetId)
      .order('weakness_score', { ascending: false })
      .limit(12),
  ])

  const attempts = Array.isArray(attemptsResult.data) ? attemptsResult.data : []
  const pendingTasks = Array.isArray(pendingTasksResult.data) ? pendingTasksResult.data : []
  const masteryRows = Array.isArray(masteryResult.data) ? masteryResult.data : []

  const attemptsByTool = new Map<ToolKey, number[]>()
  for (const row of attempts) {
    const tool = normalizeToolKey(row?.task_type)
    const bucket = attemptsByTool.get(tool) || []
    bucket.push(clamp(Number(row?.score || 0), 0, 100))
    attemptsByTool.set(tool, bucket)
  }

  for (const row of pendingTasks) {
    const tool = normalizeToolKey(row?.task_type)
    if (!attemptsByTool.has(tool)) attemptsByTool.set(tool, [])
  }

  const profiles = TOOL_ORDER
    .filter((tool) => attemptsByTool.has(tool))
    .map((tool) => {
      const allScores = attemptsByTool.get(tool) || []
      const avgScore = avg(allScores)
      const recentScores = allScores.slice(0, 5)
      const recentAvg = avg(recentScores)

      const recent3 = allScores.slice(0, 3)
      const previous3 = allScores.slice(3, 6)
      const recent3Avg = avg(recent3)
      const previous3Avg = avg(previous3)
      const momentumDelta = recent3.length > 0 && previous3.length > 0 ? recent3Avg - previous3Avg : 0

      const band = computeBand(avgScore)
      const momentum = computeMomentum(momentumDelta)
      const recommendedAction = computeRecommendedAction({
        band,
        momentum,
        avgScore,
      })

      return {
        user_id: userId,
        studyset_id: studysetId,
        tool_key: tool,
        attempts_count: allScores.length,
        avg_score: avgScore,
        recent_avg_score: recentAvg,
        mastery_band: band,
        momentum,
        momentum_delta: momentumDelta,
        recommended_action: recommendedAction,
        updated_at: new Date().toISOString(),
      }
    })

  if (profiles.length > 0) {
    await (supabase as any)
      .from('studyset_tool_profiles')
      .upsert(profiles, { onConflict: 'user_id,studyset_id,tool_key' })
  }

  await (supabase as any)
    .from('studyset_intervention_queue')
    .delete()
    .eq('user_id', userId)
    .eq('studyset_id', studysetId)
    .eq('status', 'pending')
    .eq('origin', 'adaptive_engine')

  const todayIso = toLocalIsoDate(new Date())

  const sortedProfiles = profiles
    .filter((row) => row.tool_key !== 'unknown')
    .slice()
    .sort((a, b) => {
      if (a.avg_score !== b.avg_score) return a.avg_score - b.avg_score
      return b.attempts_count - a.attempts_count
    })

  const weakest = sortedProfiles[0] || null
  const strongest = sortedProfiles.length > 0 ? sortedProfiles[sortedProfiles.length - 1] : null

  const queueRows: any[] = []
  const dedupe = new Set<string>()

  if (weakest && weakest.avg_score < 80) {
    const key = `focus:${weakest.tool_key}`
    if (!dedupe.has(key)) {
      dedupe.add(key)
      queueRows.push({
        user_id: userId,
        studyset_id: studysetId,
        kind: 'focus',
        tool_key: weakest.tool_key,
        title: `Stabilize ${toolLabel(weakest.tool_key as ToolKey)} performance`,
        reason: `Average ${weakest.avg_score}% with ${weakest.momentum} momentum. Prioritize guided practice.`,
        priority: 95,
        status: 'pending',
        origin: 'adaptive_engine',
        payload: {
          source: 'adaptive_engine_v1',
          recommended_tool: weakest.tool_key,
          avg_score: weakest.avg_score,
          momentum: weakest.momentum,
        },
      })
    }
  }

  const riskyTopics = masteryRows
    .map((row: any) => ({
      label: String(row?.topic_label || '').trim(),
      risk: Math.max(0, Number(row?.weakness_score || 0) - Number(row?.mastery_score || 0)),
    }))
    .filter((row: any) => row.label && row.risk > 0)
    .sort((a: any, b: any) => b.risk - a.risk)
    .slice(0, 3)

  for (const topic of riskyTopics) {
    const key = `topic:${topic.label.toLowerCase()}`
    if (dedupe.has(key)) continue
    dedupe.add(key)
    queueRows.push({
      user_id: userId,
      studyset_id: studysetId,
      kind: 'retry',
      tool_key: weakest?.tool_key || null,
      title: `Revisit topic: ${topic.label}`,
      reason: `High mastery risk detected for this topic (risk ${topic.risk}).`,
      priority: clamp(90 - topic.risk, 70, 90),
      status: 'pending',
      origin: 'adaptive_engine',
      payload: {
        source: 'adaptive_engine_v1',
        topic_label: topic.label,
        risk_score: topic.risk,
      },
    })
  }

  const pendingTaskRows = pendingTasks
    .map((row: any) => ({
      id: String(row?.id || ''),
      taskType: normalizeToolKey(row?.task_type),
      title: String(row?.title || 'Task'),
      dayId: String(row?.studyset_day_id || ''),
      dayNumber: Number(row?.studyset_plan_days?.day_number || 0),
      planDate: String(row?.studyset_plan_days?.plan_date || '').slice(0, 10),
    }))
    .filter((row: any) => row.id)

  const weakToolPending = weakest
    ? pendingTaskRows.filter((row: any) => row.taskType === weakest.tool_key)
    : []

  for (const row of weakToolPending.slice(0, 3)) {
    const key = `task:${row.id}`
    if (dedupe.has(key)) continue
    dedupe.add(key)

    const overdue = row.planDate && row.planDate < todayIso
    const priority = overdue ? 98 : 82

    queueRows.push({
      user_id: userId,
      studyset_id: studysetId,
      studyset_day_id: row.dayId || null,
      studyset_task_id: row.id,
      kind: 'retry',
      tool_key: row.taskType,
      title: row.title,
      reason: overdue
        ? 'Overdue task on your weakest tool. Complete this first.'
        : 'Priority retry generated from weak tool performance.',
      priority,
      due_date: row.planDate || null,
      status: 'pending',
      origin: 'adaptive_engine',
      payload: {
        source: 'adaptive_engine_v1',
        href: getTaskHref(row.taskType, studysetId, row.id),
        day_number: row.dayNumber,
      },
    })
  }

  if (strongest && strongest.avg_score >= 88) {
    const key = `challenge:${strongest.tool_key}`
    if (!dedupe.has(key)) {
      dedupe.add(key)
      queueRows.push({
        user_id: userId,
        studyset_id: studysetId,
        kind: 'challenge',
        tool_key: strongest.tool_key,
        title: `Push harder on ${toolLabel(strongest.tool_key as ToolKey)}`,
        reason: `Strong consistency detected (${strongest.avg_score}%). Increase difficulty.`,
        priority: 55,
        status: 'pending',
        origin: 'adaptive_engine',
        payload: {
          source: 'adaptive_engine_v1',
          recommended_tool: strongest.tool_key,
          avg_score: strongest.avg_score,
        },
      })
    }
  }

  if (queueRows.length > 0) {
    await (supabase as any).from('studyset_intervention_queue').insert(queueRows)
  }

  const { data: pendingInterventions } = await (supabase as any)
    .from('studyset_intervention_queue')
    .select('*')
    .eq('user_id', userId)
    .eq('studyset_id', studysetId)
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)

  return {
    toolProfiles: profiles,
    pendingInterventions: Array.isArray(pendingInterventions) ? pendingInterventions : [],
    generatedAt: new Date().toISOString(),
  }
}

function patchBundleAdaptiveSyncMeta(rawBundle: string | null, patch: Record<string, unknown>) {
  let parsed: any = {}
  try {
    parsed = rawBundle ? JSON.parse(rawBundle) : {}
  } catch {
    parsed = {}
  }
  const runtime = parsed?.runtime && typeof parsed.runtime === 'object' ? parsed.runtime : {}
  const sync = runtime?.adaptive_sync && typeof runtime.adaptive_sync === 'object' ? runtime.adaptive_sync : {}
  return JSON.stringify({
    ...parsed,
    runtime: {
      ...runtime,
      adaptive_sync: {
        ...sync,
        ...patch,
      },
    },
  })
}

export async function runDailyAdaptiveSyncForStudyset(input: {
  supabase: any
  userId: string
  studysetId: string
  force?: boolean
}) {
  const { supabase, userId, studysetId, force = false } = input
  const { data: studyset, error } = await (supabase as any)
    .from('studysets')
    .select('id, user_id, status, source_bundle')
    .eq('id', studysetId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !studyset) {
    return { studysetId, changed: false, skippedReason: 'studyset_not_found' as const }
  }

  const status = String(studyset.status || '').toLowerCase()
  if (status === 'archived') {
    return { studysetId, changed: false, skippedReason: 'archived' as const }
  }

  const todayIso = toLocalIsoDate(new Date())
  let lastRunDate = ''
  try {
    const parsed = studyset.source_bundle ? JSON.parse(studyset.source_bundle) : {}
    lastRunDate = String(parsed?.runtime?.adaptive_sync?.last_run_date || '')
  } catch {
    lastRunDate = ''
  }

  if (!force && lastRunDate === todayIso) {
    return { studysetId, changed: false, skippedReason: 'already_ran_today' as const }
  }

  const runtime = await upsertStudysetAdaptiveRuntime({
    supabase,
    userId,
    studysetId: studyset.id,
  })

  const nextBundle = patchBundleAdaptiveSyncMeta(studyset.source_bundle, {
    last_run_at: new Date().toISOString(),
    last_run_date: todayIso,
    last_interventions: runtime.pendingInterventions.length,
    last_profiles: runtime.toolProfiles.length,
  })

  await (supabase as any)
    .from('studysets')
    .update({
      source_bundle: nextBundle,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studyset.id)
    .eq('user_id', userId)

  return {
    studysetId,
    changed: true,
    pendingInterventions: runtime.pendingInterventions.length,
    toolProfiles: runtime.toolProfiles.length,
  }
}

export async function runDailyAdaptiveSyncForUser(input: {
  supabase: any
  userId: string
  force?: boolean
}) {
  const { supabase, userId, force = false } = input
  const { data: studysets } = await (supabase as any)
    .from('studysets')
    .select('id, status')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .limit(100)

  const results: any[] = []
  for (const row of Array.isArray(studysets) ? studysets : []) {
    const result = await runDailyAdaptiveSyncForStudyset({
      supabase,
      userId,
      studysetId: String(row.id),
      force,
    })
    results.push(result)
  }

  return {
    total: results.length,
    changed: results.filter((row) => row.changed === true).length,
    results,
  }
}
