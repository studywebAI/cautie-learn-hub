import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { logAuditEntry } from '@/lib/auth/class-permissions'
import { generateStudysetCustomPlan } from '@/ai/flows/generate-studyset-custom-plan'

export const dynamic = 'force-dynamic'

type TaskTemplate = {
  task_type: 'notes' | 'flashcards' | 'quiz' | 'wordweb' | 'review'
  title: string
  description: string
  estimated_minutes: number
}

type SourceBundleContext = {
  additionalNotes?: string
  contextText?: string
  selectedDates?: string[]
  imports?: {
    word?: boolean
    powerpoint?: boolean
  }
}

type AIDayPlan = {
  day_number: number
  summary: string
  tasks: TaskTemplate[]
}

function stripPlannerGuidelines(input: string) {
  const text = String(input || '').trim()
  if (!text) return ''
  return text
    .replace(/AI RULES[\s\S]*$/gi, '')
    .replace(/PLANNER RULES[\s\S]*$/gi, '')
    .replace(/GUIDELINES[\s\S]*$/gi, '')
    .trim()
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

  const candidates: string[] = []
  const seen = new Set<string>()
  const pushCandidate = (value: string) => {
    const cleaned = value
      .replace(/^[\-\*\d\.\)\s]+/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 90)
    if (cleaned.length < 4) return
    const key = cleaned.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    candidates.push(cleaned)
  }

  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30)
    .forEach(pushCandidate)

  if (candidates.length < 5) {
    raw
      .split(/[.!?;\n]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 20)
      .forEach(pushCandidate)
  }

  if (candidates.length === 0) return [studysetName]
  return candidates.slice(0, 8)
}

function resolveDayTheme(dayNumber: number, totalDays: number, topics: string[]) {
  const phases = ['Kickoff', 'Concept build', 'Active recall', 'Application', 'Consolidation']
  const phase =
    dayNumber === 1
      ? 'Kickoff'
      : dayNumber === totalDays
        ? 'Final mastery'
        : phases[(dayNumber - 1) % phases.length]
  const topic = topics[(dayNumber - 1) % topics.length] || topics[0] || 'Core subject'
  return { phase, topic }
}

function parseSourceBundle(raw: unknown): SourceBundleContext {
  if (typeof raw !== 'string' || !raw.trim()) return {}
  try {
    const parsed = JSON.parse(raw)
    const rawContext = typeof parsed?.sources?.context_text === 'string' ? parsed.sources.context_text : ''
    const rawPasted = typeof parsed?.sources?.pasted_text === 'string' ? parsed.sources.pasted_text : ''
    const rawNotes = typeof parsed?.sources?.notes_text === 'string' ? parsed.sources.notes_text : ''
    const cleanedContext = stripPlannerGuidelines(rawContext)
    const cleanedPasted = stripPlannerGuidelines(rawPasted)
    const cleanedNotes = stripPlannerGuidelines(rawNotes)
    return {
      additionalNotes:
        typeof parsed?.additional_notes === 'string'
          ? parsed.additional_notes
          : undefined,
      contextText:
        cleanedContext || cleanedPasted || cleanedNotes || undefined,
      selectedDates: Array.isArray(parsed?.schedule?.selected_dates)
        ? parsed.schedule.selected_dates
        : undefined,
      imports: {
        word: parsed?.sources?.imports?.word === true,
        powerpoint: parsed?.sources?.imports?.powerpoint === true,
      },
    }
  } catch {
    return { contextText: raw }
  }
}

function clampMinutes(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.max(5, Math.min(240, Math.round(value)))
}

function normalizeTaskType(value: unknown): TaskTemplate['task_type'] {
  const raw = String(value || '').toLowerCase()
  if (raw === 'flashcards') return 'flashcards'
  if (raw === 'quiz') return 'quiz'
  if (raw === 'wordweb') return 'wordweb'
  if (raw === 'review') return 'review'
  return 'notes'
}

function normalizeAIPlanDays(rawDays: unknown, totalDays: number, minutesPerDay: number): AIDayPlan[] {
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
          description: String(task?.description || '').trim().slice(0, 400) || 'Work on the planned learning objective.',
          estimated_minutes: clampMinutes(Number(task?.estimated_minutes || fallbackMinutes), fallbackMinutes),
        }))
        .filter((task: TaskTemplate) => Boolean(task.title))
      return {
        day_number: Number((raw as any)?.day_number || index + 1),
        summary: String((raw as any)?.summary || '').trim().slice(0, 180) || `Day ${index + 1} focus`,
        tasks,
      }
    })
    .filter((day) => day.tasks.length > 0)
}

async function tryBuildCustomAIPlan(input: {
  studysetName: string
  targetDays: number
  minutesPerDay: number
  selectedDates: string[]
  focusTopic: string
  topicCandidates: string[]
  contextText: string
  additionalNotes: string
}): Promise<AIDayPlan[] | null> {
  try {
    const output = await generateStudysetCustomPlan({
      studysetName: input.studysetName,
      targetDays: input.targetDays,
      minutesPerDay: input.minutesPerDay,
      selectedDates: input.selectedDates,
      focusTopic: input.focusTopic,
      topicCandidates: input.topicCandidates.slice(0, 12),
      contextText: input.contextText.slice(0, 12000),
      additionalNotes: input.additionalNotes.slice(0, 2000),
    })
    const days = normalizeAIPlanDays(output?.days, input.targetDays, input.minutesPerDay)
    if (days.length === 0) return null
    return days
  } catch (error) {
    console.warn('studyset custom AI plan failed; using deterministic fallback', {
      message: (error as any)?.message || String(error),
    })
    return null
  }
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function toLocalIsoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeDateInput(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeExcludedWeekdays(input: unknown) {
  if (!Array.isArray(input)) return new Set<number>()
  const values = input
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
  return new Set(values)
}

function normalizeSelectedDates(input: unknown) {
  if (!Array.isArray(input)) return []
  const values = input
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .filter((value) => {
      const parsed = new Date(`${value}T00:00:00`)
      return !Number.isNaN(parsed.getTime())
    })
  return Array.from(new Set(values)).sort()
}

function buildPlanDates(
  startDate: Date,
  targetDays: number,
  excludedWeekdays: Set<number>,
  endDate: Date | null
) {
  const dates: string[] = []
  const cursor = new Date(startDate)
  const maxLoop = 400

  for (let i = 0; i < maxLoop; i += 1) {
    if (endDate && cursor > endDate) break
    if (!excludedWeekdays.has(cursor.getDay())) {
      dates.push(toIsoDate(cursor))
      if (dates.length >= targetDays) break
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  if (dates.length === 0) {
    dates.push(toIsoDate(startDate))
  }

  return dates
}

function buildDayTasks(
  dayNumber: number,
  totalDays: number,
  minutesPerDay: number,
  context: SourceBundleContext,
  focusTopic: string
): TaskTemplate[] {
  const noteContext = context.contextText?.slice(0, 120).trim()
  const hasWord = context.imports?.word === true
  const hasPowerpoint = context.imports?.powerpoint === true

  const coreMinutes = Math.max(10, Math.floor(minutesPerDay * 0.4))
  const recallMinutes = Math.max(10, Math.floor(minutesPerDay * 0.25))
  const practiceMinutes = Math.max(10, Math.floor(minutesPerDay * 0.25))
  const reviewMinutes = Math.max(5, minutesPerDay - coreMinutes - recallMinutes - practiceMinutes)

  const tasks: TaskTemplate[] = []
  const contextHint = noteContext ? `Focus: ${noteContext}` : 'Focus on the most exam-relevant concepts.'
  const importHint =
    hasWord || hasPowerpoint
      ? `Include linked ${[hasWord ? 'Word' : null, hasPowerpoint ? 'PowerPoint' : null].filter(Boolean).join(' + ')} sources.`
      : 'Use uploaded and pasted source material.'

  tasks.push({
    task_type: 'notes',
    title: dayNumber === 1 ? `Core notes: ${focusTopic}` : `Notes refinement: ${focusTopic} (day ${dayNumber})`,
    description: `${contextHint} ${importHint} Focus topic: ${focusTopic}.`,
    estimated_minutes: coreMinutes,
  })

  if (dayNumber % 2 === 1) {
    tasks.push({
      task_type: 'flashcards',
      title: dayNumber === 1 ? `Baseline flashcards: ${focusTopic}` : `Recall deck: ${focusTopic}`,
      description: `Turn key terms and definitions from ${focusTopic} into active recall cards.`,
      estimated_minutes: recallMinutes,
    })
  } else {
    tasks.push({
      task_type: 'quiz',
      title: dayNumber === totalDays ? `Final checkpoint: ${focusTopic}` : `Checkpoint quiz: ${focusTopic}`,
      description: `Run a focused quiz on ${focusTopic} and tag weak areas for revision.`,
      estimated_minutes: recallMinutes,
    })
  }

  if (dayNumber === totalDays) {
    tasks.push({
      task_type: 'review',
      title: dayNumber === totalDays ? `Final review: ${focusTopic}` : `Consolidation review: ${focusTopic}`,
      description: `Review weak points in ${focusTopic} and tighten understanding before moving on.`,
      estimated_minutes: practiceMinutes,
    })
  } else {
    tasks.push({
      task_type: 'wordweb',
      title: `Concept map: ${focusTopic}`,
      description: `Connect terms and concepts from ${focusTopic} into one structured overview.`,
      estimated_minutes: practiceMinutes,
    })
  }

  tasks.push({
    task_type: 'review',
    title: `Daily closeout: ${focusTopic}`,
    description:
      context.additionalNotes?.trim()
        ? `Keep in mind: ${context.additionalNotes.slice(0, 120)}`
        : 'Mark what is done, what is weak, and what to revisit tomorrow.',
    estimated_minutes: reviewMinutes,
  })

  return tasks
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studysetId: string }> }
) {
  try {
    const { studysetId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json().catch(() => ({}))

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: studyset, error: studysetError } = await (supabase as any)
      .from('studysets')
      .select('id, user_id, class_id, name, target_days, minutes_per_day, source_bundle')
      .eq('id', studysetId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (studysetError) return NextResponse.json({ error: studysetError.message }, { status: 500 })
    if (!studyset) return NextResponse.json({ error: 'Studyset not found' }, { status: 404 })

    const requestedStartDate = normalizeDateInput(body?.start_date) || new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = requestedStartDate < today ? today : requestedStartDate
    const endDate = normalizeDateInput(body?.end_date)
    if (endDate && endDate < startDate) {
      return NextResponse.json({ error: 'end_date must be on/after start_date' }, { status: 400 })
    }

    const excludedWeekdays = normalizeExcludedWeekdays(body?.excluded_weekdays)
    const sourceContext = parseSourceBundle(studyset.source_bundle)
    const fallbackTopic = extractFocusTopic(sourceContext, String(studyset.name || 'Study topic'))
    const topicCandidates = extractTopicCandidates(sourceContext, fallbackTopic)
    const requestedDates = normalizeSelectedDates(body?.selected_dates)
    const sourceDates = normalizeSelectedDates(sourceContext.selectedDates)

    const requestedTargetDays = Math.max(1, Number(studyset.target_days || 1))
    const minutesPerDay = Math.max(10, Number(studyset.minutes_per_day || 30))
    const todayIso = toLocalIsoDate(new Date())
    const allowedRequestedDates = requestedDates.filter((value) => value >= todayIso)
    const allowedSourceDates = sourceDates.filter((value) => value >= todayIso)
    const planDates =
      allowedRequestedDates.length > 0
        ? allowedRequestedDates
        : allowedSourceDates.length > 0
          ? allowedSourceDates
          : buildPlanDates(startDate, requestedTargetDays, excludedWeekdays, endDate)
    const totalDays = planDates.length
    const aiPlanDays = await tryBuildCustomAIPlan({
      studysetName: String(studyset.name || 'Studyset'),
      targetDays: totalDays,
      minutesPerDay,
      selectedDates: planDates,
      focusTopic: fallbackTopic,
      topicCandidates,
      contextText: String(sourceContext.contextText || ''),
      additionalNotes: String(sourceContext.additionalNotes || ''),
    })

    // Replace existing plan for deterministic regeneration.
    const { data: existingDays } = await (supabase as any)
      .from('studyset_plan_days')
      .select('id')
      .eq('studyset_id', studyset.id)

    const existingDayIds = (existingDays || []).map((row: any) => row.id)
    if (existingDayIds.length > 0) {
      await (supabase as any).from('studyset_plan_tasks').delete().in('studyset_day_id', existingDayIds)
      await (supabase as any).from('studyset_plan_days').delete().eq('studyset_id', studyset.id)
    }

    const dayRows = planDates.map((planDate, index) => {
      const dayNumber = index + 1
      const dayTheme = resolveDayTheme(dayNumber, totalDays, topicCandidates)
      const aiDay = Array.isArray(aiPlanDays) ? aiPlanDays[index] : null
      return {
        studyset_id: studyset.id,
        day_number: dayNumber,
        plan_date: planDate,
        summary: aiDay?.summary || `Day ${dayNumber}: ${dayTheme.phase} - ${dayTheme.topic}`,
        estimated_minutes: minutesPerDay,
        completed: false,
      }
    })

    const { data: insertedDays, error: insertDaysError } = await (supabase as any)
      .from('studyset_plan_days')
      .insert(dayRows)
      .select('id, day_number')
      .order('day_number', { ascending: true })

    if (insertDaysError || !insertedDays) {
      return NextResponse.json({ error: insertDaysError?.message || 'Failed to create plan days' }, { status: 500 })
    }

    const taskRows: any[] = []
    insertedDays.forEach((day: any) => {
      const dayTheme = resolveDayTheme(day.day_number, totalDays, topicCandidates)
      const aiDay = Array.isArray(aiPlanDays) ? aiPlanDays[Number(day.day_number || 1) - 1] : null
      const templates =
        aiDay && Array.isArray(aiDay.tasks) && aiDay.tasks.length > 0
          ? aiDay.tasks
          : buildDayTasks(day.day_number, totalDays, minutesPerDay, sourceContext, dayTheme.topic)
      templates.forEach((task, position) => {
        taskRows.push({
          studyset_day_id: day.id,
          task_type: task.task_type,
          title: task.title,
          description: task.description,
          estimated_minutes: task.estimated_minutes,
          position,
          completed: false,
        })
      })
    })

    if (taskRows.length > 0) {
      const { error: insertTasksError } = await (supabase as any)
        .from('studyset_plan_tasks')
        .insert(taskRows)
      if (insertTasksError) {
        return NextResponse.json({ error: insertTasksError.message }, { status: 500 })
      }
    }

    await (supabase as any)
      .from('studysets')
      .update({
        status: 'active',
        target_days: totalDays,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studyset.id)
      .eq('user_id', user.id)

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId: studyset.class_id || undefined,
      action: 'studyset_plan_generated',
      entityType: 'studyset',
      entityId: studyset.id,
      metadata: {
        name: studyset.name,
        target_days: totalDays,
        minutes_per_day: minutesPerDay,
        selected_dates_count: planDates.length,
        excluded_weekdays: Array.from(excludedWeekdays),
      },
    })

    return NextResponse.json({ success: true, days: insertedDays.length, tasks: taskRows.length })
  } catch (error) {
    console.error('studyset generate failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
