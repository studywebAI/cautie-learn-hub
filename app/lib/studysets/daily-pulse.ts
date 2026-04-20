import { toLocalIsoDate } from '@/lib/studysets/runtime'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeTool(value: unknown) {
  const raw = String(value || '').toLowerCase()
  if (raw === 'flashcards') return 'flashcards'
  if (raw === 'quiz') return 'quiz'
  if (raw === 'wordweb') return 'wordweb'
  if (raw === 'review') return 'review'
  return 'notes'
}

function buildPulseSummary(input: {
  completionPercent: number
  avgScore: number
  pendingTasks: number
  pendingInterventions: number
  weakestTool: string | null
  focusTopics: string[]
}) {
  const performance =
    input.avgScore >= 85
      ? 'Strong performance'
      : input.avgScore < 60
      ? 'Performance is unstable'
      : 'Performance is developing'
  const toolPart = input.weakestTool ? ` Weakest tool: ${input.weakestTool}.` : ''
  const topicPart =
    input.focusTopics.length > 0 ? ` Focus topics: ${input.focusTopics.slice(0, 3).join(', ')}.` : ''
  return `${performance}. Completion ${input.completionPercent}%. Pending tasks ${input.pendingTasks}, queue ${input.pendingInterventions}.${toolPart}${topicPart}`
}

export async function upsertDailyPulseForStudyset(input: {
  supabase: any
  userId: string
  studysetId: string
  pulseDate?: string
}) {
  const { supabase, userId, studysetId } = input
  const pulseDate = input.pulseDate || toLocalIsoDate(new Date())

  const [daysResult, attemptsResult, interventionsResult, profilesResult, masteryResult] = await Promise.all([
    (supabase as any)
      .from('studyset_plan_days')
      .select(`
        id,
        studyset_id,
        plan_date,
        studyset_plan_tasks (
          id,
          task_type,
          completed
        )
      `)
      .eq('studyset_id', studysetId),
    (supabase as any)
      .from('studyset_task_attempts')
      .select('score')
      .eq('user_id', userId)
      .eq('studyset_id', studysetId)
      .order('created_at', { ascending: false })
      .limit(16),
    (supabase as any)
      .from('studyset_intervention_queue')
      .select('id')
      .eq('user_id', userId)
      .eq('studyset_id', studysetId)
      .eq('status', 'pending')
      .limit(200),
    (supabase as any)
      .from('studyset_tool_profiles')
      .select('tool_key, avg_score, recommended_action')
      .eq('user_id', userId)
      .eq('studyset_id', studysetId)
      .order('avg_score', { ascending: true })
      .limit(8),
    (supabase as any)
      .from('studyset_mastery_topics')
      .select('topic_label, weakness_score, mastery_score')
      .eq('user_id', userId)
      .eq('studyset_id', studysetId)
      .order('weakness_score', { ascending: false })
      .limit(8),
  ])

  const dayRows = Array.isArray(daysResult.data) ? daysResult.data : []
  const attempts = Array.isArray(attemptsResult.data) ? attemptsResult.data : []
  const interventionRows = Array.isArray(interventionsResult.data) ? interventionsResult.data : []
  const profileRows = Array.isArray(profilesResult.data) ? profilesResult.data : []
  const masteryRows = Array.isArray(masteryResult.data) ? masteryResult.data : []

  let totalTasks = 0
  let completedTasks = 0
  const toolPendingCounts = new Map<string, number>()
  for (const day of dayRows) {
    const tasks = Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks : []
    for (const task of tasks) {
      totalTasks += 1
      if (task?.completed === true) {
        completedTasks += 1
        continue
      }
      const tool = normalizeTool(task?.task_type)
      toolPendingCounts.set(tool, Number(toolPendingCounts.get(tool) || 0) + 1)
    }
  }

  const completionPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  const pendingTasks = Math.max(0, totalTasks - completedTasks)
  const avgScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum: number, row: any) => sum + Number(row?.score || 0), 0) / attempts.length
        )
      : 0
  const pendingInterventions = interventionRows.length
  const weakestTool = profileRows.length > 0 ? normalizeTool(profileRows[0]?.tool_key) : null

  const focusTopics = masteryRows
    .map((row: any) => ({
      label: String(row?.topic_label || '').trim(),
      risk: Number(row?.weakness_score || 0) - Number(row?.mastery_score || 0),
    }))
    .filter((row: any) => row.label && row.risk > 0)
    .sort((a: any, b: any) => b.risk - a.risk)
    .slice(0, 4)
    .map((row: any) => row.label)

  const recommendedTools = profileRows
    .slice(0, 3)
    .map((row: any) => ({
      tool: normalizeTool(row?.tool_key),
      avg_score: clamp(Number(row?.avg_score || 0), 0, 100),
      action: String(row?.recommended_action || 'stabilize'),
      pending_tasks: Number(toolPendingCounts.get(normalizeTool(row?.tool_key)) || 0),
    }))

  const summary = buildPulseSummary({
    completionPercent,
    avgScore,
    pendingTasks,
    pendingInterventions,
    weakestTool,
    focusTopics,
  })

  const payload = {
    user_id: userId,
    studyset_id: studysetId,
    pulse_date: pulseDate,
    completion_percent: completionPercent,
    avg_score: avgScore,
    pending_tasks: pendingTasks,
    pending_interventions: pendingInterventions,
    weakest_tool: weakestTool,
    focus_topics: focusTopics,
    recommended_tools: recommendedTools,
    summary,
    source: {
      generated_at: new Date().toISOString(),
      attempts_count: attempts.length,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
    },
    updated_at: new Date().toISOString(),
  }

  const { error } = await (supabase as any)
    .from('studyset_daily_pulses')
    .upsert(payload, { onConflict: 'user_id,studyset_id,pulse_date' })
  if (error) throw error

  return {
    studysetId,
    pulseDate,
    completionPercent,
    avgScore,
    pendingTasks,
    pendingInterventions,
    weakestTool,
    focusTopics,
    recommendedTools,
    summary,
  }
}

export async function upsertDailyPulseForUser(input: {
  supabase: any
  userId: string
  pulseDate?: string
}) {
  const { supabase, userId } = input
  const pulseDate = input.pulseDate || toLocalIsoDate(new Date())
  const { data: studysets } = await (supabase as any)
    .from('studysets')
    .select('id')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .limit(100)

  const results: any[] = []
  for (const row of Array.isArray(studysets) ? studysets : []) {
    const studysetId = String(row?.id || '')
    if (!studysetId) continue
    try {
      const item = await upsertDailyPulseForStudyset({
        supabase,
        userId,
        studysetId,
        pulseDate,
      })
      results.push(item)
    } catch (error) {
      results.push({
        studysetId,
        pulseDate,
        error: (error as any)?.message || 'pulse_failed',
      })
    }
  }

  return {
    pulseDate,
    total: results.length,
    success: results.filter((row) => !row.error).length,
    failed: results.filter((row) => Boolean(row.error)).length,
    results,
  }
}

