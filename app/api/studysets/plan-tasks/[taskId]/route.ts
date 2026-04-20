import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { logAuditEntry } from '@/lib/auth/class-permissions'
import { deriveStudysetRuntimeStatus } from '@/lib/studysets/runtime'
import { resolvePendingInterventionsForTask } from '@/lib/studysets/interventions-runtime'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json().catch(() => ({}))
    const nextCompleted = Boolean(body?.completed)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: taskRow, error: taskError } = await (supabase as any)
      .from('studyset_plan_tasks')
      .select(`
        id,
        completed,
        studyset_day_id,
        studyset_plan_days!inner (
          id,
          studyset_id,
          day_number,
          studysets!inner (
            id,
            user_id,
            class_id,
            name,
            status
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

    const todayIso = new Date().toISOString().slice(0, 10)
    const { data: dayDateRow } = await (supabase as any)
      .from('studyset_plan_days')
      .select('plan_date')
      .eq('id', day.id)
      .eq('studyset_id', day.studyset_id)
      .maybeSingle()

    const planDate = String(dayDateRow?.plan_date || '').slice(0, 10)
    const isFutureDay = Boolean(planDate) && planDate > todayIso
    if (nextCompleted && isFutureDay) {
      return NextResponse.json(
        { error: 'You can only complete tasks on or after their scheduled day.' },
        { status: 400 }
      )
    }

    const { error: updateTaskError } = await (supabase as any)
      .from('studyset_plan_tasks')
      .update({ completed: nextCompleted })
      .eq('id', taskId)
      .eq('studyset_day_id', day.id)

    if (updateTaskError) return NextResponse.json({ error: updateTaskError.message }, { status: 500 })

    if (nextCompleted) {
      await resolvePendingInterventionsForTask({
        supabase,
        userId: user.id,
        studysetId: day.studyset_id,
        taskId,
      }).catch(() => {
        // Do not block task completion if intervention queue update fails.
      })
    }

    const { data: dayTasks, error: dayTasksError } = await (supabase as any)
      .from('studyset_plan_tasks')
      .select('id, completed')
      .eq('studyset_day_id', day.id)

    if (dayTasksError) return NextResponse.json({ error: dayTasksError.message }, { status: 500 })
    const dayCompleted = (dayTasks || []).length > 0 && (dayTasks || []).every((row: any) => row.completed === true)

    const { error: updateDayError } = await (supabase as any)
      .from('studyset_plan_days')
      .update({ completed: dayCompleted })
      .eq('id', day.id)
      .eq('studyset_id', day.studyset_id)

    if (updateDayError) return NextResponse.json({ error: updateDayError.message }, { status: 500 })

    const { data: allTasks, error: allTasksError } = await (supabase as any)
      .from('studyset_plan_tasks')
      .select(`
        id,
        completed,
        studyset_plan_days!inner (
          id,
          studyset_id,
          plan_date
        )
      `)
      .eq('studyset_plan_days.studyset_id', day.studyset_id)

    if (allTasksError) return NextResponse.json({ error: allTasksError.message }, { status: 500 })
    const totalTasks = (allTasks || []).length
    const completedTasks = (allTasks || []).filter((row: any) => row.completed === true).length
    const hasOverduePendingTasks = (allTasks || []).some((row: any) => {
      const planDate = String(row?.studyset_plan_days?.plan_date || '').slice(0, 10)
      return row?.completed !== true && Boolean(planDate) && planDate < todayIso
    })
    const studysetStatus = deriveStudysetRuntimeStatus({
      currentStatus: studyset.status,
      totalTasks,
      completedTasks,
      hasOverduePendingTasks,
    })

    await (supabase as any)
      .from('studysets')
      .update({
        status: studysetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', day.studyset_id)
      .eq('user_id', user.id)

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId: studyset.class_id || undefined,
      action: nextCompleted ? 'studyset_task_completed' : 'studyset_task_reopened',
      entityType: 'studyset',
      entityId: day.studyset_id,
      metadata: {
        task_id: taskId,
        day_number: day.day_number,
        completed_tasks: completedTasks,
        total_tasks: totalTasks,
      },
    })

    return NextResponse.json({
      success: true,
      completed: nextCompleted,
      day_completed: dayCompleted,
      studyset_status: studysetStatus,
      progress: {
        completed_tasks: completedTasks,
        total_tasks: totalTasks,
        percent: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
      },
    })
  } catch (error) {
    console.error('studyset task PATCH failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
