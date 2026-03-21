import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

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

