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

function buildDayTasks(dayNumber: number, totalDays: number, minutesPerDay: number): TaskTemplate[] {
  const coreMinutes = Math.max(10, Math.floor(minutesPerDay * 0.45))
  const recallMinutes = Math.max(10, Math.floor(minutesPerDay * 0.25))
  const testMinutes = Math.max(10, Math.floor(minutesPerDay * 0.2))
  const reviewMinutes = Math.max(5, minutesPerDay - coreMinutes - recallMinutes - testMinutes)

  if (dayNumber === 1) {
    return [
      {
        task_type: 'notes',
        title: 'Core summary notes',
        description: 'Create a short, high-signal summary of the source bundle.',
        estimated_minutes: coreMinutes,
      },
      {
        task_type: 'flashcards',
        title: 'First recall deck',
        description: 'Build flashcards for key definitions, formulas, and concepts.',
        estimated_minutes: recallMinutes,
      },
      {
        task_type: 'review',
        title: 'Quick recap',
        description: 'Write what is still unclear and what to revisit tomorrow.',
        estimated_minutes: reviewMinutes + testMinutes,
      },
    ]
  }

  const isLastDay = dayNumber === totalDays
  if (isLastDay) {
    return [
      {
        task_type: 'review',
        title: 'Final review',
        description: 'Review weak areas from previous days and close gaps.',
        estimated_minutes: coreMinutes,
      },
      {
        task_type: 'quiz',
        title: 'Full practice quiz',
        description: 'Do a timed self-check and mark mistakes to revise.',
        estimated_minutes: recallMinutes + testMinutes,
      },
      {
        task_type: 'flashcards',
        title: 'Rapid recall sprint',
        description: 'Run through all key cards and focus on difficult items.',
        estimated_minutes: reviewMinutes,
      },
    ]
  }

  return [
    {
      task_type: 'notes',
      title: `Day ${dayNumber} concept pass`,
      description: 'Cover the next concept block and add concise notes.',
      estimated_minutes: coreMinutes,
    },
    {
      task_type: 'flashcards',
      title: 'Memory reinforcement',
      description: 'Train active recall with spaced repetition.',
      estimated_minutes: recallMinutes,
    },
    {
      task_type: dayNumber % 2 === 0 ? 'quiz' : 'wordweb',
      title: dayNumber % 2 === 0 ? 'Checkpoint quiz' : 'Concept map',
      description:
        dayNumber % 2 === 0
          ? 'Test understanding with focused questions.'
          : 'Connect terms and ideas into one clear map.',
      estimated_minutes: testMinutes,
    },
    {
      task_type: 'review',
      title: 'Daily closeout',
      description: 'Mark completed items and note top weak points.',
      estimated_minutes: reviewMinutes,
    },
  ]
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
      .select('id, user_id, class_id, name, target_days, minutes_per_day')
      .eq('id', studysetId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (studysetError) return NextResponse.json({ error: studysetError.message }, { status: 500 })
    if (!studyset) return NextResponse.json({ error: 'Studyset not found' }, { status: 404 })

    const startDateInput = typeof body?.start_date === 'string' ? body.start_date : null
    const baseDate = startDateInput ? new Date(startDateInput) : new Date()
    if (Number.isNaN(baseDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start_date' }, { status: 400 })
    }

    const targetDays = Math.max(1, Number(studyset.target_days || 1))
    const minutesPerDay = Math.max(10, Number(studyset.minutes_per_day || 30))

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

    const dayRows = Array.from({ length: targetDays }).map((_, index) => {
      const dayNumber = index + 1
      const planDate = new Date(baseDate)
      planDate.setDate(baseDate.getDate() + index)
      return {
        studyset_id: studyset.id,
        day_number: dayNumber,
        plan_date: planDate.toISOString().slice(0, 10),
        summary: `Day ${dayNumber} plan for ${studyset.name}`,
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
      const templates = buildDayTasks(day.day_number, targetDays, minutesPerDay)
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
        target_days: targetDays,
        minutes_per_day: minutesPerDay,
      },
    })

    return NextResponse.json({ success: true, days: insertedDays.length, tasks: taskRows.length })
  } catch (error) {
    console.error('studyset generate failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
