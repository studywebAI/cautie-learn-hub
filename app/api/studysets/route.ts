import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { logAuditEntry } from '@/lib/auth/class-permissions'
import { runDailyReplanForUser } from '@/lib/studysets/daily-replan'
import { deriveStudysetRuntimeStatus } from '@/lib/studysets/runtime'

export const dynamic = 'force-dynamic'

function extractMeta(rawBundle: string | null | undefined) {
  if (!rawBundle) return { icon: null as string | null, color: null as string | null }
  try {
    const parsed = JSON.parse(rawBundle)
    const icon = typeof parsed?.meta?.icon === 'string' ? parsed.meta.icon : null
    const color = typeof parsed?.meta?.color === 'string' ? parsed.meta.color : null
    return { icon, color }
  } catch {
    return { icon: null, color: null }
  }
}

function getTaskHref(taskType: string, studysetId: string, taskId: string) {
  if (taskType === 'review') return `/tools/studyset/${studysetId}`
  if (taskType === 'flashcards') return `/tools/flashcards?studysetId=${studysetId}&taskId=${taskId}&launch=1`
  if (taskType === 'quiz') return `/tools/quiz?studysetId=${studysetId}&taskId=${taskId}&launch=1`
  return `/tools/notes?studysetId=${studysetId}&taskId=${taskId}&launch=1`
}

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: rows, error } = await (supabase as any)
      .from('studysets')
      .select('id, name, confidence_level, target_days, minutes_per_day, status, source_bundle, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Auto-run daily replan once per day per studyset through runtime metadata checks.
    await runDailyReplanForUser({
      supabase,
      userId: user.id,
      force: false,
    }).catch((runError) => {
      console.warn('daily replan auto-run skipped', {
        message: (runError as any)?.message || String(runError),
      })
    })

    const { data: refreshedRows } = await (supabase as any)
      .from('studysets')
      .select('id, name, confidence_level, target_days, minutes_per_day, status, source_bundle, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(100)
    const studysets = Array.isArray(refreshedRows) ? refreshedRows : Array.isArray(rows) ? rows : []
    const studysetIds = studysets.map((row: any) => String(row.id)).filter(Boolean)
    if (studysetIds.length === 0) return NextResponse.json({ studysets: [] })

    const [{ data: dayRows }, { data: recentAttempts }] = await Promise.all([
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
            position,
            completed
          )
        `)
        .in('studyset_id', studysetIds)
        .order('day_number', { ascending: true }),
      (supabase as any)
        .from('studyset_task_attempts')
        .select('studyset_id, score, created_at')
        .eq('user_id', user.id)
        .in('studyset_id', studysetIds)
        .order('created_at', { ascending: false })
        .limit(800),
    ])

    const daysByStudyset = new Map<string, any[]>()
    for (const row of Array.isArray(dayRows) ? dayRows : []) {
      const key = String(row?.studyset_id || '')
      if (!key) continue
      const list = daysByStudyset.get(key) || []
      list.push(row)
      daysByStudyset.set(key, list)
    }

    const attemptsByStudyset = new Map<string, any[]>()
    for (const row of Array.isArray(recentAttempts) ? recentAttempts : []) {
      const key = String(row?.studyset_id || '')
      if (!key) continue
      const list = attemptsByStudyset.get(key) || []
      list.push(row)
      attemptsByStudyset.set(key, list)
    }

    const todayIso = new Date().toISOString().slice(0, 10)
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000

    const enriched = studysets.map((row: any) => {
      const studysetId = String(row.id)
      const days = (daysByStudyset.get(studysetId) || []).sort(
        (a: any, b: any) => Number(a.day_number || 0) - Number(b.day_number || 0)
      )
      const { icon, color } = extractMeta(row.source_bundle)

      let totalTasks = 0
      let completedTasks = 0
      let dueTodayTasks = 0
      const pendingEntries: Array<{ day: any; task: any }> = []

      for (const day of days) {
        const tasks = Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks : []
        const sortedTasks = tasks
          .slice()
          .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))

        const planDate = String(day?.plan_date || '').slice(0, 10)
        for (const task of sortedTasks) {
          totalTasks += 1
          if (task?.completed === true) completedTasks += 1
          if (planDate && planDate === todayIso && task?.completed !== true) dueTodayTasks += 1
          if (task?.completed !== true) pendingEntries.push({ day, task })
        }
      }

      const activePending = pendingEntries.filter((entry) => {
        const planDate = String(entry?.day?.plan_date || '').slice(0, 10)
        return !planDate || planDate <= todayIso
      })
      const nextPending = activePending[0] || pendingEntries[0] || null
      const nextTaskId = nextPending?.task?.id ? String(nextPending.task.id) : null
      const nextTaskHref =
        nextPending && nextTaskId
          ? getTaskHref(String(nextPending.task.task_type || 'notes'), studysetId, nextTaskId)
          : null

      const attempts = (attemptsByStudyset.get(studysetId) || []).slice(0, 12)
      const avgScore =
        attempts.length > 0
          ? Math.round(
              attempts.reduce((sum: number, item: any) => sum + Number(item?.score || 0), 0) /
                attempts.length
            )
          : 0
      const recentAttemptCount = attempts.filter((item: any) => {
        const at = new Date(String(item?.created_at || '')).getTime()
        return Number.isFinite(at) && at >= sevenDaysAgoMs
      }).length

      const hasOverduePendingTasks = pendingEntries.some((entry) => {
        const planDate = String(entry?.day?.plan_date || '').slice(0, 10)
        return Boolean(planDate) && planDate < todayIso
      })
      const derivedStatus = deriveStudysetRuntimeStatus({
        currentStatus: row.status,
        totalTasks,
        completedTasks,
        hasOverduePendingTasks,
      })

      return {
        ...row,
        status: derivedStatus,
        meta: { icon, color },
        progress: {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          percent: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
        },
        analytics_summary: {
          avg_score: avgScore,
          recent_attempts_7d: recentAttemptCount,
          due_today_tasks: dueTodayTasks,
        },
        next_task_id: nextTaskId,
        next_task_href: nextTaskHref,
      }
    })

    const statusesToPersist = enriched.filter((item: any) => String(item.status || '') !== String(
      (studysets.find((row: any) => String(row.id) === String(item.id)) || {})?.status || ''
    ))
    for (const item of statusesToPersist) {
      await (supabase as any)
        .from('studysets')
        .update({
          status: item.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ studysets: enriched })
  } catch (error) {
    console.error('studysets GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json().catch(() => ({}))

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const name = String(body?.name || '').trim()
    const classId = body?.class_id ? String(body.class_id) : null
    const confidenceLevel = ['beginner', 'intermediate', 'advanced'].includes(String(body?.confidence_level))
      ? String(body.confidence_level)
      : 'beginner'
    const targetDays = Math.max(1, Math.min(60, Number(body?.target_days || 7)))
    const minutesPerDay = Math.max(10, Math.min(480, Number(body?.minutes_per_day || 45)))
    const sourceBundle = body?.source_bundle ? String(body.source_bundle) : null

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const { data: studyset, error: createError } = await (supabase as any)
      .from('studysets')
      .insert([
        {
          user_id: user.id,
          class_id: classId,
          name,
          confidence_level: confidenceLevel,
          target_days: targetDays,
          minutes_per_day: minutesPerDay,
          status: 'draft',
          source_bundle: sourceBundle,
        },
      ])
      .select('id, name, confidence_level, target_days, minutes_per_day, status, source_bundle, created_at, updated_at')
      .single()

    if (createError || !studyset) {
      return NextResponse.json({ error: createError?.message || 'Failed to create studyset' }, { status: 500 })
    }

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId: classId || undefined,
      action: 'studyset_created',
      entityType: 'studyset',
      entityId: studyset.id,
      metadata: {
        name: studyset.name,
        target_days: studyset.target_days,
        minutes_per_day: studyset.minutes_per_day,
      },
    })

    return NextResponse.json({ success: true, studyset })
  } catch (error) {
    console.error('studysets POST failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
