import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function getTaskHref(taskType: string, studysetId: string, taskId: string) {
  if (taskType === 'review') return `/tools/studyset/${studysetId}`
  if (taskType === 'flashcards') return `/tools/flashcards?studysetId=${studysetId}&taskId=${taskId}&launch=1`
  if (taskType === 'quiz') return `/tools/quiz?studysetId=${studysetId}&taskId=${taskId}&launch=1`
  return `/tools/notes?studysetId=${studysetId}&taskId=${taskId}&launch=1`
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limit = Math.max(1, Math.min(50, Number(req.nextUrl.searchParams.get('limit') || 12)))

    const { data: studysets, error: studysetsError } = await (supabase as any)
      .from('studysets')
      .select('id, name, status, updated_at')
      .eq('user_id', user.id)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(100)

    if (studysetsError) return NextResponse.json({ error: studysetsError.message }, { status: 500 })

    const rows = Array.isArray(studysets) ? studysets : []
    const studysetIds = rows.map((row: any) => String(row?.id || '')).filter(Boolean)
    if (studysetIds.length === 0) return NextResponse.json({ items: [] })

    const [daysResult, interventionsResult, pulseResult] = await Promise.all([
      (supabase as any)
        .from('studyset_plan_days')
        .select(`
          id,
          studyset_id,
          day_number,
          plan_date,
          completed,
          studyset_plan_tasks (
            id,
            task_type,
            title,
            position,
            completed
          )
        `)
        .in('studyset_id', studysetIds)
        .order('day_number', { ascending: true }),
      (supabase as any)
        .from('studyset_intervention_queue')
        .select('id, studyset_id, studyset_task_id, kind, title, reason, priority, payload, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .in('studyset_id', studysetIds)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('studyset_daily_pulses')
        .select('studyset_id, pulse_date, weakest_tool, focus_topics, summary')
        .eq('user_id', user.id)
        .in('studyset_id', studysetIds)
        .order('pulse_date', { ascending: false })
        .limit(500),
    ])

    if (daysResult.error) return NextResponse.json({ error: daysResult.error.message }, { status: 500 })
    if (interventionsResult.error) return NextResponse.json({ error: interventionsResult.error.message }, { status: 500 })
    if (pulseResult.error) return NextResponse.json({ error: pulseResult.error.message }, { status: 500 })

    const daysByStudyset = new Map<string, any[]>()
    for (const row of Array.isArray(daysResult.data) ? daysResult.data : []) {
      const key = String(row?.studyset_id || '')
      if (!key) continue
      const list = daysByStudyset.get(key) || []
      list.push(row)
      daysByStudyset.set(key, list)
    }

    const interventionsByStudyset = new Map<string, any[]>()
    for (const row of Array.isArray(interventionsResult.data) ? interventionsResult.data : []) {
      const key = String(row?.studyset_id || '')
      if (!key) continue
      const list = interventionsByStudyset.get(key) || []
      list.push(row)
      interventionsByStudyset.set(key, list)
    }

    const pulseByStudyset = new Map<string, any>()
    for (const row of Array.isArray(pulseResult.data) ? pulseResult.data : []) {
      const key = String(row?.studyset_id || '')
      if (!key || pulseByStudyset.has(key)) continue
      pulseByStudyset.set(key, row)
    }

    const todayIso = new Date().toISOString().slice(0, 10)

    const items = rows.map((studyset: any) => {
      const studysetId = String(studyset.id)
      const days = (daysByStudyset.get(studysetId) || [])
        .slice()
        .sort((a: any, b: any) => Number(a.day_number || 0) - Number(b.day_number || 0))

      let totalTasks = 0
      let completedTasks = 0
      let dueTodayTasks = 0
      const pendingEntries: Array<{ day: any; task: any }> = []

      for (const day of days) {
        const tasks = (Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks : [])
          .slice()
          .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
        const planDate = String(day?.plan_date || '').slice(0, 10)

        for (const task of tasks) {
          totalTasks += 1
          if (task?.completed === true) {
            completedTasks += 1
            continue
          }
          if (planDate && planDate === todayIso) dueTodayTasks += 1
          pendingEntries.push({ day, task })
        }
      }

      const activePending = pendingEntries.filter((entry) => {
        const planDate = String(entry?.day?.plan_date || '').slice(0, 10)
        return !planDate || planDate <= todayIso
      })

      const interventions = (interventionsByStudyset.get(studysetId) || []).slice()
      const topIntervention = interventions[0] || null
      const pulse = pulseByStudyset.get(studysetId) || null

      let nextActionHref: string | null = null
      let nextActionType: 'intervention' | 'task' | null = null
      let nextActionLabel = 'Open studyset'

      if (topIntervention) {
        const payloadHref = typeof topIntervention?.payload?.href === 'string' ? String(topIntervention.payload.href) : ''
        if (payloadHref) {
          nextActionHref = payloadHref
        } else if (topIntervention?.studyset_task_id) {
          const match = pendingEntries.find((entry) => String(entry.task?.id || '') === String(topIntervention.studyset_task_id))
          if (match?.task?.id) {
            nextActionHref = getTaskHref(String(match.task.task_type || 'notes'), studysetId, String(match.task.id))
          }
        }

        if (nextActionHref) {
          nextActionType = 'intervention'
          nextActionLabel = 'Start priority'
        }
      }

      if (!nextActionHref) {
        const nextPending = activePending[0] || pendingEntries[0] || null
        if (nextPending?.task?.id) {
          nextActionHref = getTaskHref(String(nextPending.task.task_type || 'notes'), studysetId, String(nextPending.task.id))
          nextActionType = 'task'
          nextActionLabel = 'Start next task'
        }
      }

      const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
      const sortScore = Number(interventions.length > 0) * 1000 + dueTodayTasks * 10 + Math.max(0, 100 - percent)

      return {
        id: studysetId,
        title: String(studyset.name || 'Studyset'),
        updated_at: String(studyset.updated_at || new Date().toISOString()),
        status: String(studyset.status || 'draft'),
        progress: {
          completed_tasks: completedTasks,
          total_tasks: totalTasks,
          percent,
        },
        due_today_tasks: dueTodayTasks,
        pending_interventions: interventions.length,
        top_intervention: topIntervention
          ? {
              id: String(topIntervention.id),
              kind: String(topIntervention.kind || 'focus'),
              title: String(topIntervention.title || 'Intervention'),
              reason: String(topIntervention.reason || ''),
              priority: Number(topIntervention.priority || 0),
            }
          : null,
        pulse_summary: pulse?.summary ? String(pulse.summary) : null,
        pulse_weakest_tool: pulse?.weakest_tool ? String(pulse.weakest_tool) : null,
        pulse_focus_topics: Array.isArray(pulse?.focus_topics) ? pulse.focus_topics : [],
        next_action_href: nextActionHref,
        next_action_type: nextActionType,
        next_action_label: nextActionLabel,
        analytics_href: `/tools/studyset/${studysetId}`,
        sort_score: sortScore,
      }
    })
      .sort((a: any, b: any) => Number(b.sort_score || 0) - Number(a.sort_score || 0))
      .slice(0, limit)

    return NextResponse.json({ items })
  } catch (error) {
    console.error('studyset launchpad GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
