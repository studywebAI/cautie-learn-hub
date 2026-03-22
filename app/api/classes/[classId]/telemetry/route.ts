import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

const RATE_WINDOW_MS = 10000
const MAX_EVENTS_PER_WINDOW = 20
const DEDUPE_WINDOW_MS = 2500
const telemetryRateState = new Map<string, number[]>()
const telemetryLastEventAt = new Map<string, number>()

function shouldAcceptTelemetry(input: {
  userId: string
  classId: string
  tab: string
  event: string
  stage: string
  level: string
}) {
  if (input.level === 'error') {
    return { accepted: true as const }
  }

  const now = Date.now()
  const rateKey = `${input.userId}:${input.classId}`
  const eventKey = `${rateKey}:${input.tab}:${input.event}:${input.stage}:${input.level}`

  const timestamps = telemetryRateState.get(rateKey) || []
  const rateCutoff = now - RATE_WINDOW_MS
  const kept = timestamps.filter((ts) => ts >= rateCutoff)
  if (kept.length >= MAX_EVENTS_PER_WINDOW) {
    telemetryRateState.set(rateKey, kept)
    return { accepted: false as const, reason: 'rate_limited' as const }
  }

  const lastEventAt = telemetryLastEventAt.get(eventKey) || 0
  if (now - lastEventAt < DEDUPE_WINDOW_MS) {
    return { accepted: false as const, reason: 'duplicate' as const }
  }

  kept.push(now)
  telemetryRateState.set(rateKey, kept)
  telemetryLastEventAt.set(eventKey, now)
  return { accepted: true as const }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const perm = await getClassPermission(supabase as any, classId, user.id)
    if (!perm.isMember) {
      return NextResponse.json({ error: 'Not a class member' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const tab = String(body?.tab || '').trim()
    const event = String(body?.event || '').trim()
    const stage = String(body?.stage || 'runtime').trim()
    const level = String(body?.level || 'info').trim()
    const message = body?.message ? String(body.message) : null
    const meta = body?.meta && typeof body.meta === 'object' ? body.meta : {}

    if (!tab || !event) {
      return NextResponse.json({ error: 'tab and event are required' }, { status: 400 })
    }

    const admission = shouldAcceptTelemetry({
      userId: user.id,
      classId,
      tab,
      event,
      stage,
      level,
    })
    if (!admission.accepted) {
      return NextResponse.json({ success: true, dropped: admission.reason }, { status: 202 })
    }

    await logAuditEntry(supabase as any, {
      userId: user.id,
      classId,
      action: `telemetry_${event}`,
      entityType: 'class_tab',
      entityId: tab,
      metadata: {
        stage,
        level,
        message,
        ...meta,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('class telemetry POST failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
