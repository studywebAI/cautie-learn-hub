import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i
const NON_SESSION_WINDOW_MS = 30000
const nonSessionRateState = new Map<string, number>()

function isDateString(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

function hasLikelySessionCookie(rawCookie: string): boolean {
  return /sb-[^=]+=/.test(rawCookie) || /supabase-auth-token/i.test(rawCookie)
}

function getClientKey(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for') || ''
  const ip = forwardedFor.split(',')[0]?.trim() || 'unknown-ip'
  const ua = req.headers.get('user-agent') || 'unknown-ua'
  const from = req.nextUrl.searchParams.get('from') || ''
  const to = req.nextUrl.searchParams.get('to') || ''
  return `${ip}|${ua}|studysets-agenda|${from}|${to}`
}

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || `studyset-agenda-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  try {
    const userAgent = req.headers.get('user-agent') || ''
    const cookieHeader = req.headers.get('cookie') || ''
    const hasSessionCookie = hasLikelySessionCookie(cookieHeader)
    const looksLikeBot = BOT_UA_PATTERN.test(userAgent)

    // Hard lock anonymous bot/non-session traffic for this endpoint.
    if (!hasSessionCookie || looksLikeBot) {
      const key = getClientKey(req)
      const now = Date.now()
      const lastAt = nonSessionRateState.get(key) || 0
      if (now - lastAt < NON_SESSION_WINDOW_MS) {
        return NextResponse.json({ items: [] }, { status: 200 })
      }
      nonSessionRateState.set(key, now)
      if (looksLikeBot) {
        console.info('[studysets-agenda] blocked bot request', { requestId, userAgent })
        return NextResponse.json({ items: [] }, { status: 200 })
      }
    }

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.warn('[studysets-agenda] unauthorized', { requestId, message: userError?.message || null })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')

    const fromDate = isDateString(from) ? from : new Date().toISOString().slice(0, 10)
    const toDate = isDateString(to) ? to : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10)

    const { data: days, error } = await (supabase as any)
      .from('studyset_plan_days')
      .select(`
        id,
        studyset_id,
        day_number,
        plan_date,
        summary,
        estimated_minutes,
        completed,
        studysets!inner (
          id,
          user_id,
          name,
          status
        ),
        studyset_plan_tasks (
          id,
          task_type,
          title,
          description,
          estimated_minutes,
          position,
          completed
        )
      `)
      .eq('studysets.user_id', user.id)
      .gte('plan_date', fromDate)
      .lte('plan_date', toDate)
      .order('plan_date', { ascending: true })
      .order('day_number', { ascending: true })

    if (error) {
      console.error('[studysets-agenda] query failed', { requestId, message: error.message, fromDate, toDate, userId: user.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const items = (days || []).flatMap((day: any) => {
      const studysetName = day.studysets?.name || 'Studyset'
      const dayTitle = `${studysetName} - Day ${day.day_number}`
      const tasks = (day.studyset_plan_tasks || [])
        .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
        .map((task: any) => ({
          id: task.id,
          type: task.task_type,
          title: task.title,
          description: task.description,
          estimated_minutes: Number(task.estimated_minutes || 0),
          completed: Boolean(task.completed),
        }))

      return {
        id: day.id,
        studyset_id: day.studyset_id,
        title: dayTitle,
        plan_date: day.plan_date,
        summary: day.summary,
        estimated_minutes: Number(day.estimated_minutes || 0),
        completed: Boolean(day.completed),
        tasks,
      }
    })

    console.info('[studysets-agenda] success', {
      requestId,
      userId: user.id,
      fromDate,
      toDate,
      dayRows: Array.isArray(days) ? days.length : 0,
      itemCount: items.length,
    })
    return NextResponse.json({ items })
  } catch (error) {
    console.error('[studysets-agenda] exception', {
      requestId,
      message: (error as any)?.message || 'Internal server error',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
