import { generateStudysetCustomPlan } from '@/ai/flows/generate-studyset-custom-plan'
import {
  deriveStudysetRuntimeStatus,
  normalizeStudysetStatus,
  toLocalIsoDate,
  type StudysetStatus,
} from '@/lib/studysets/runtime'

type SourceBundleContext = {
  contextText: string
  additionalNotes: string
  selectedDates: string[]
}

type ReplanResult = {
  studysetId: string
  changed: boolean
  skippedReason?: string
  updatedTasks?: number
  status?: StudysetStatus
}

function parseSourceBundle(raw: unknown): SourceBundleContext {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { contextText: '', additionalNotes: '', selectedDates: [] }
  }
  try {
    const parsed = JSON.parse(raw)
    const selectedDates = Array.isArray(parsed?.schedule?.selected_dates)
      ? parsed.schedule.selected_dates
          .map((value: unknown) => String(value || '').trim())
          .filter((value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value))
      : []
    return {
      contextText: String(
        parsed?.sources?.context_text ||
          parsed?.sources?.pasted_text ||
          parsed?.sources?.notes_text ||
          ''
      ).trim(),
      additionalNotes: String(parsed?.additional_notes || '').trim(),
      selectedDates,
    }
  } catch {
    return { contextText: String(raw || '').trim(), additionalNotes: '', selectedDates: [] }
  }
}

function extractFocusTopic(context: SourceBundleContext, studysetName: string) {
  const raw = String(context.contextText || context.additionalNotes || '').trim()
  if (!raw) return studysetName
  const firstLine = raw.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || studysetName
  return firstLine.slice(0, 90)
}

function extractTopicCandidates(context: SourceBundleContext, studysetName: string) {
  const raw = String(context.contextText || context.additionalNotes || '').trim()
  if (!raw) return [studysetName]
  const entries = raw
    .split(/\r?\n|[.!?;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^[\-\*\d\.\)\s]+/, '').trim())
    .filter((part) => part.length > 3)
  const unique: string[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    const key = entry.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(entry.slice(0, 90))
    if (unique.length >= 10) break
  }
  return unique.length > 0 ? unique : [studysetName]
}

function clampMinutes(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.max(5, Math.min(240, Math.round(value)))
}

function normalizeTaskType(value: unknown) {
  const raw = String(value || '').toLowerCase()
  if (raw === 'flashcards') return 'flashcards'
  if (raw === 'quiz') return 'quiz'
  if (raw === 'wordweb') return 'wordweb'
  if (raw === 'review') return 'review'
  return 'notes'
}

function normalizeAIDays(rawDays: unknown, totalDays: number, minutesPerDay: number) {
  if (!Array.isArray(rawDays)) return []
  const fallbackMinutes = Math.max(10, Math.round(minutesPerDay / 4))
  return rawDays
    .slice(0, totalDays)
    .map((raw, index) => {
      const tasksRaw = Array.isArray((raw as any)?.tasks) ? (raw as any).tasks : []
      const tasks = tasksRaw
        .slice(0, 6)
        .map((task: any) => ({
          task_type: normalizeTaskType(task?.task_type),
          title: String(task?.title || '').trim().slice(0, 120) || `Task ${index + 1}`,
          description:
            String(task?.description || '').trim().slice(0, 400) ||
            'Work on the planned learning objective.',
          estimated_minutes: clampMinutes(
            Number(task?.estimated_minutes || fallbackMinutes),
            fallbackMinutes
          ),
        }))
        .filter((task: any) => Boolean(task.title))
      return {
        day_number: Number((raw as any)?.day_number || index + 1),
        summary: String((raw as any)?.summary || '').trim().slice(0, 180) || `Day ${index + 1} focus`,
        tasks,
      }
    })
    .filter((day) => day.tasks.length > 0)
}

function updateBundleDailyReplanMeta(rawBundle: string | null, patch: Record<string, unknown>) {
  let parsed: any = {}
  try {
    parsed = rawBundle ? JSON.parse(rawBundle) : {}
  } catch {
    parsed = {}
  }
  const runtime = parsed?.runtime && typeof parsed.runtime === 'object' ? parsed.runtime : {}
  const daily = runtime?.daily_replan && typeof runtime.daily_replan === 'object' ? runtime.daily_replan : {}
  return JSON.stringify({
    ...parsed,
    runtime: {
      ...runtime,
      daily_replan: {
        ...daily,
        ...patch,
      },
    },
  })
}

export async function syncStudysetStatus(
  supabase: any,
  userId: string,
  studyset: { id: string; status: unknown }
) {
  const { data: dayRows, error } = await supabase
    .from('studyset_plan_days')
    .select(`
      id,
      plan_date,
      studyset_plan_tasks (
        id,
        completed
      )
    `)
    .eq('studyset_id', studyset.id)

  if (error) throw error

  const todayIso = toLocalIsoDate(new Date())
  let totalTasks = 0
  let completedTasks = 0
  let hasOverduePendingTasks = false

  for (const day of Array.isArray(dayRows) ? dayRows : []) {
    const planDate = String(day?.plan_date || '').slice(0, 10)
    for (const task of Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks : []) {
      totalTasks += 1
      if (task?.completed === true) {
        completedTasks += 1
      } else if (planDate && planDate < todayIso) {
        hasOverduePendingTasks = true
      }
    }
  }

  const nextStatus = deriveStudysetRuntimeStatus({
    currentStatus: studyset.status,
    totalTasks,
    completedTasks,
    hasOverduePendingTasks,
  })

  const current = normalizeStudysetStatus(studyset.status)
  if (nextStatus !== current) {
    await supabase
      .from('studysets')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studyset.id)
      .eq('user_id', userId)
  }

  return {
    status: nextStatus,
    totalTasks,
    completedTasks,
    hasOverduePendingTasks,
  }
}

export async function runDailyReplanForStudyset(input: {
  supabase: any
  userId: string
  studysetId: string
  force?: boolean
}): Promise<ReplanResult> {
  const { supabase, userId, studysetId, force = false } = input
  const { data: studyset, error: studysetError } = await supabase
    .from('studysets')
    .select('id, user_id, name, status, target_days, minutes_per_day, source_bundle, updated_at')
    .eq('id', studysetId)
    .eq('user_id', userId)
    .maybeSingle()

  if (studysetError || !studyset) {
    return { studysetId, changed: false, skippedReason: 'studyset_not_found' }
  }

  const status = normalizeStudysetStatus(studyset.status)
  if (status === 'archived' || status === 'completed') {
    return { studysetId, changed: false, skippedReason: 'terminal_status', status }
  }

  const context = parseSourceBundle(studyset.source_bundle)
  const todayIso = toLocalIsoDate(new Date())
  let runtimeMeta: any = {}
  try {
    const parsed = studyset.source_bundle ? JSON.parse(studyset.source_bundle) : {}
    runtimeMeta =
      parsed?.runtime?.daily_replan && typeof parsed.runtime.daily_replan === 'object'
        ? parsed.runtime.daily_replan
        : {}
  } catch {
    runtimeMeta = {}
  }
  if (!force && String(runtimeMeta?.last_run_date || '') === todayIso) {
    const synced = await syncStudysetStatus(supabase, userId, {
      id: studyset.id,
      status: studyset.status,
    })
    return { studysetId, changed: false, skippedReason: 'already_ran_today', status: synced.status }
  }

  const { data: days, error: daysError } = await supabase
    .from('studyset_plan_days')
    .select(`
      id,
      day_number,
      plan_date,
      summary,
      completed,
      studyset_plan_tasks (
        id,
        completed
      )
    `)
    .eq('studyset_id', studyset.id)
    .order('day_number', { ascending: true })

  if (daysError || !Array.isArray(days) || days.length === 0) {
    return { studysetId, changed: false, skippedReason: 'no_days' }
  }

  const replannableDays = days.filter((day: any) => {
    const planDate = String(day?.plan_date || '').slice(0, 10)
    const tasks = Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks : []
    const hasCompletedTask = tasks.some((task: any) => task?.completed === true)
    const hasPendingTask = tasks.some((task: any) => task?.completed !== true)
    if (!hasPendingTask) return false
    if (!planDate) return !hasCompletedTask
    if (planDate > todayIso) return true
    if (planDate === todayIso && !hasCompletedTask) return true
    return false
  })

  if (replannableDays.length === 0) {
    const nextBundle = updateBundleDailyReplanMeta(studyset.source_bundle, {
      last_run_at: new Date().toISOString(),
      last_run_date: todayIso,
      last_result: 'no_replannable_days',
    })
    await supabase
      .from('studysets')
      .update({
        source_bundle: nextBundle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studyset.id)
      .eq('user_id', userId)
    const synced = await syncStudysetStatus(supabase, userId, {
      id: studyset.id,
      status: studyset.status,
    })
    return { studysetId, changed: false, skippedReason: 'no_replannable_days', status: synced.status }
  }

  const selectedDates = replannableDays
    .map((day: any) => String(day?.plan_date || '').slice(0, 10))
    .filter((value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value))

  const focusTopic = extractFocusTopic(context, String(studyset.name || 'Study topic'))
  const topicCandidates = extractTopicCandidates(context, focusTopic)
  let aiDays: any[] = []
  try {
    const output = await generateStudysetCustomPlan({
      studysetName: String(studyset.name || 'Studyset'),
      targetDays: replannableDays.length,
      minutesPerDay: Math.max(10, Number(studyset.minutes_per_day || 30)),
      selectedDates: selectedDates.length > 0 ? selectedDates : replannableDays.map((_: any, i: number) => `day-${i + 1}`),
      focusTopic,
      topicCandidates: topicCandidates.slice(0, 12),
      contextText: String(context.contextText || '').slice(0, 12000),
      additionalNotes: String(context.additionalNotes || '').slice(0, 2000),
    })
    aiDays = normalizeAIDays(output?.days, replannableDays.length, Math.max(10, Number(studyset.minutes_per_day || 30)))
  } catch (error) {
    const nextBundle = updateBundleDailyReplanMeta(studyset.source_bundle, {
      last_run_at: new Date().toISOString(),
      last_run_date: todayIso,
      last_result: 'ai_failed',
      last_error: (error as any)?.message || String(error),
    })
    await supabase
      .from('studysets')
      .update({
        source_bundle: nextBundle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studyset.id)
      .eq('user_id', userId)
    const synced = await syncStudysetStatus(supabase, userId, {
      id: studyset.id,
      status: studyset.status,
    })
    return { studysetId, changed: false, skippedReason: 'ai_failed', status: synced.status }
  }

  if (aiDays.length === 0) {
    return { studysetId, changed: false, skippedReason: 'empty_ai_plan' }
  }

  let updatedTasks = 0
  for (let i = 0; i < replannableDays.length; i += 1) {
    const day = replannableDays[i]
    const aiDay = aiDays[i]
    if (!aiDay) continue

    await supabase
      .from('studyset_plan_tasks')
      .delete()
      .eq('studyset_day_id', day.id)
      .eq('completed', false)

    const taskRows = (Array.isArray(aiDay.tasks) ? aiDay.tasks : []).map((task: any, position: number) => ({
      studyset_day_id: day.id,
      task_type: normalizeTaskType(task?.task_type),
      title: String(task?.title || `Task ${position + 1}`).slice(0, 120),
      description: String(task?.description || '').slice(0, 500) || 'Work on the planned learning objective.',
      estimated_minutes: clampMinutes(Number(task?.estimated_minutes || 15), 15),
      position,
      completed: false,
    }))
    if (taskRows.length > 0) {
      const { error: insertError } = await supabase
        .from('studyset_plan_tasks')
        .insert(taskRows)
      if (!insertError) {
        updatedTasks += taskRows.length
      }
    }

    await supabase
      .from('studyset_plan_days')
      .update({
        summary: String(aiDay.summary || day.summary || `Day ${day.day_number} focus`).slice(0, 180),
        completed: false,
      })
      .eq('id', day.id)
      .eq('studyset_id', studyset.id)
  }

  const nextBundle = updateBundleDailyReplanMeta(studyset.source_bundle, {
    last_run_at: new Date().toISOString(),
    last_run_date: todayIso,
    last_result: 'ok',
    last_updated_tasks: updatedTasks,
    last_replanned_days: replannableDays.length,
  })

  await supabase
    .from('studysets')
    .update({
      source_bundle: nextBundle,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studyset.id)
    .eq('user_id', userId)

  const synced = await syncStudysetStatus(supabase, userId, {
    id: studyset.id,
    status: studyset.status,
  })

  return {
    studysetId,
    changed: updatedTasks > 0,
    updatedTasks,
    status: synced.status,
  }
}

export async function runDailyReplanForUser(input: {
  supabase: any
  userId: string
  force?: boolean
}) {
  const { supabase, userId, force = false } = input
  const { data: studysets } = await supabase
    .from('studysets')
    .select('id, status')
    .eq('user_id', userId)
    .limit(100)

  const results: ReplanResult[] = []
  for (const row of Array.isArray(studysets) ? studysets : []) {
    const result = await runDailyReplanForStudyset({
      supabase,
      userId,
      studysetId: String(row.id),
      force,
    })
    results.push(result)
  }

  return {
    total: results.length,
    changed: results.filter((row) => row.changed).length,
    results,
  }
}
