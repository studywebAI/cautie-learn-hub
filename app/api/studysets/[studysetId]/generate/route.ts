import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { logAuditEntry } from '@/lib/auth/class-permissions'

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

function parseSourceBundle(raw: unknown): SourceBundleContext {
  if (typeof raw !== 'string' || !raw.trim()) return {}
  try {
    const parsed = JSON.parse(raw)
    return {
      additionalNotes:
        typeof parsed?.additional_notes === 'string'
          ? parsed.additional_notes
          : undefined,
      contextText:
        typeof parsed?.sources?.context_text === 'string'
          ? parsed.sources.context_text
          : typeof parsed?.sources?.pasted_text === 'string'
            ? parsed.sources.pasted_text
            : typeof parsed?.sources?.notes_text === 'string'
              ? parsed.sources.notes_text
              : undefined,
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

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10)
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
  feedback: string
): TaskTemplate[] {
  const feedbackLower = feedback.toLowerCase()
  const noteContext = context.contextText?.slice(0, 120).trim()
  const hasWord = context.imports?.word === true
  const hasPowerpoint = context.imports?.powerpoint === true

  const quizBias =
    feedbackLower.includes('quiz') ||
    feedbackLower.includes('test') ||
    feedbackLower.includes('questions')
  const flashcardBias =
    feedbackLower.includes('flashcard') ||
    feedbackLower.includes('memory') ||
    feedbackLower.includes('recall')
  const notesBias =
    feedbackLower.includes('notes') ||
    feedbackLower.includes('summary')

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
    title: dayNumber === 1 ? 'Core notes pass' : `Notes pass ${dayNumber}`,
    description: `${contextHint} ${importHint}`,
    estimated_minutes: coreMinutes,
  })

  if (flashcardBias || (!quizBias && dayNumber % 2 === 1)) {
    tasks.push({
      task_type: 'flashcards',
      title: dayNumber === 1 ? 'Baseline flashcards' : 'Recall deck build',
      description: 'Turn key terms, formulas, and definitions into active recall cards.',
      estimated_minutes: recallMinutes,
    })
  } else {
    tasks.push({
      task_type: 'quiz',
      title: dayNumber === totalDays ? 'Final checkpoint quiz' : 'Checkpoint quiz',
      description: 'Run a focused quiz and tag weak areas for revision.',
      estimated_minutes: recallMinutes,
    })
  }

  if (notesBias || dayNumber === totalDays) {
    tasks.push({
      task_type: 'review',
      title: dayNumber === totalDays ? 'Final review' : 'Consolidation review',
      description: 'Review weak points and tighten understanding before moving on.',
      estimated_minutes: practiceMinutes,
    })
  } else {
    tasks.push({
      task_type: quizBias ? 'quiz' : 'wordweb',
      title: quizBias ? 'Practice question set' : 'Concept map',
      description: quizBias
        ? 'Do short-form practice questions and inspect mistakes.'
        : 'Connect terms and concepts into one structured overview.',
      estimated_minutes: practiceMinutes,
    })
  }

  tasks.push({
    task_type: 'review',
    title: 'Daily closeout',
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

    const startDate = normalizeDateInput(body?.start_date) || new Date()
    const endDate = normalizeDateInput(body?.end_date)
    if (endDate && endDate < startDate) {
      return NextResponse.json({ error: 'end_date must be on/after start_date' }, { status: 400 })
    }

    const excludedWeekdays = normalizeExcludedWeekdays(body?.excluded_weekdays)
    const feedback = typeof body?.feedback === 'string' ? body.feedback.trim() : ''
    const sourceContext = parseSourceBundle(studyset.source_bundle)
    const requestedDates = normalizeSelectedDates(body?.selected_dates)
    const sourceDates = normalizeSelectedDates(sourceContext.selectedDates)

    const requestedTargetDays = Math.max(1, Number(studyset.target_days || 1))
    const minutesPerDay = Math.max(10, Number(studyset.minutes_per_day || 30))
    const planDates =
      requestedDates.length > 0
        ? requestedDates
        : sourceDates.length > 0
          ? sourceDates
          : buildPlanDates(startDate, requestedTargetDays, excludedWeekdays, endDate)
    const totalDays = planDates.length

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
      return {
        studyset_id: studyset.id,
        day_number: dayNumber,
        plan_date: planDate,
        summary: `Day ${dayNumber}: ${studyset.name}`,
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
      const templates = buildDayTasks(day.day_number, totalDays, minutesPerDay, sourceContext, feedback)
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
