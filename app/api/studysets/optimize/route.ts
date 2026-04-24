import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { runDailyReplanForStudyset, runDailyReplanForUser } from '@/lib/studysets/daily-replan'
import { runDailyAdaptiveSyncForStudyset, runDailyAdaptiveSyncForUser } from '@/lib/studysets/adaptive-engine'
import { upsertDailyPulseForStudyset, upsertDailyPulseForUser } from '@/lib/studysets/daily-pulse'

export const dynamic = 'force-dynamic'

function getTaskHref(taskType: string, studysetId: string, taskId: string) {
  if (taskType === 'review') return `/tools/studyset/${studysetId}`
  if (taskType === 'flashcards') return `/tools/flashcards?studysetId=${studysetId}&taskId=${taskId}&launch=1`
  if (taskType === 'quiz') return `/tools/quiz?studysetId=${studysetId}&taskId=${taskId}&launch=1`
  return `/tools/notes?studysetId=${studysetId}&taskId=${taskId}&launch=1`
}

async function getLaunchpadPreview(input: {
  supabase: any
  userId: string
  limit: number
  studysetId?: string | null
}) {
  const { supabase, userId, limit, studysetId } = input
  const query = (supabase as any)
    .from('studysets')
    .select('id, name, status, updated_at')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
    .limit(100)

  const scopedQuery = studysetId ? query.eq('id', studysetId) : query
  const { data: studysets, error: studysetsError } = await scopedQuery
  if (studysetsError) throw studysetsError

  const rows = Array.isArray(studysets) ? studysets : []
  const studysetIds = rows.map((row: any) => String(row?.id || '')).filter(Boolean)
  if (studysetIds.length === 0) return []

  const [daysResult, interventionsResult] = await Promise.all([
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
      .select('id, studyset_id, studyset_task_id, kind, title, priority, payload, created_at')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .in('studyset_id', studysetIds)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  if (daysResult.error) throw daysResult.error
  if (interventionsResult.error) throw interventionsResult.error

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

  const todayIso = new Date().toISOString().slice(0, 10)
  const items = rows
    .map((studyset: any) => {
      const studysetKey = String(studyset.id)
      const days = (daysByStudyset.get(studysetKey) || [])
        .slice()
        .sort((a: any, b: any) => Number(a.day_number || 0) - Number(b.day_number || 0))

      const pendingTasks: Array<{ day: any; task: any }> = []
      let totalTasks = 0
      let completedTasks = 0
      for (const day of days) {
        const tasks = Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks : []
        for (const task of tasks) {
          totalTasks += 1
          if (task?.completed === true) {
            completedTasks += 1
            continue
          }
          pendingTasks.push({ day, task })
        }
      }

      const interventions = (interventionsByStudyset.get(studysetKey) || []).slice()
      const topIntervention = interventions[0] || null
      const activePending = pendingTasks.filter((entry) => {
        const planDate = String(entry?.day?.plan_date || '').slice(0, 10)
        return !planDate || planDate <= todayIso
      })
      const nextPending = activePending[0] || pendingTasks[0] || null

      let nextActionHref: string | null = null
      let nextActionLabel = 'Open studyset'
      if (topIntervention) {
        const payloadHref =
          typeof topIntervention?.payload?.href === 'string' ? String(topIntervention.payload.href) : ''
        if (payloadHref) {
          nextActionHref = payloadHref
          nextActionLabel = 'Keep going'
        }
      }
      if (!nextActionHref && nextPending?.task?.id) {
        nextActionHref = getTaskHref(
          String(nextPending.task.task_type || 'notes'),
          studysetKey,
          String(nextPending.task.id)
        )
        nextActionLabel = 'Keep going'
      }

      const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
      const sortScore = Number(interventions.length > 0) * 1000 + Math.max(0, 100 - percent)

      return {
        id: studysetKey,
        title: String(studyset.name || 'Studyset'),
        status: String(studyset.status || 'draft'),
        progress: {
          completed_tasks: completedTasks,
          total_tasks: totalTasks,
          percent,
        },
        pending_interventions: interventions.length,
        top_intervention: topIntervention
          ? {
              id: String(topIntervention.id),
              kind: String(topIntervention.kind || 'focus'),
              title: String(topIntervention.title || 'Intervention'),
              priority: Number(topIntervention.priority || 0),
            }
          : null,
        next_action_href: nextActionHref,
        next_action_label: nextActionLabel,
        sort_score: sortScore,
      }
    })
    .sort((a: any, b: any) => Number(b.sort_score || 0) - Number(a.sort_score || 0))
    .slice(0, limit)

  return items
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json().catch(() => ({}))
    const force = body?.force === true
    const studysetId = body?.studysetId ? String(body.studysetId) : null
    const includeLaunchpad = body?.includeLaunchpad !== false
    const launchpadLimit = Math.max(1, Math.min(20, Number(body?.launchpadLimit || 6)))

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let replan: any
    let adaptive: any
    let pulse: any

    if (studysetId) {
      replan = await runDailyReplanForStudyset({
        supabase,
        userId: user.id,
        studysetId,
        force,
      })
      adaptive = await runDailyAdaptiveSyncForStudyset({
        supabase,
        userId: user.id,
        studysetId,
        force,
      })
      pulse = await upsertDailyPulseForStudyset({
        supabase,
        userId: user.id,
        studysetId,
      })
    } else {
      replan = await runDailyReplanForUser({
        supabase,
        userId: user.id,
        force,
      })
      adaptive = await runDailyAdaptiveSyncForUser({
        supabase,
        userId: user.id,
        force,
      })
      pulse = await upsertDailyPulseForUser({
        supabase,
        userId: user.id,
      })
    }

    const launchpadPreview = includeLaunchpad
      ? await getLaunchpadPreview({
          supabase,
          userId: user.id,
          limit: launchpadLimit,
          studysetId,
        })
      : []

    return NextResponse.json({
      success: true,
      force,
      scope: studysetId ? 'studyset' : 'user',
      studyset_id: studysetId,
      replan,
      adaptive,
      pulse,
      launchpad_preview: launchpadPreview,
    })
  } catch (error) {
    console.error('studyset optimize POST failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
