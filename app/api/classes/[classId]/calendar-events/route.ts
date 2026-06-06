<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET  /api/classes/[classId]/calendar-events  — list events
// POST /api/classes/[classId]/calendar-events  — create event

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify membership
    const { data: member } = await (supabase as any)
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: events, error } = await (supabase as any)
      .from('class_calendar_events')
      .select('id, title, description, event_type, starts_at, ends_at, all_day, created_at, created_by')
      .eq('class_id', classId)
      .order('starts_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ events: events || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only teachers can create events
    const { data: member } = await (supabase as any)
      .from('class_members')
      .select('role')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!member || member.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const title = String(body?.title || '').trim()
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const eventType = ['assignment', 'quiz', 'exam', 'cancellation', 'event', 'other'].includes(String(body?.event_type))
      ? String(body.event_type)
      : 'other'

    const startsAt = body?.starts_at ? new Date(String(body.starts_at)).toISOString() : new Date().toISOString()
    const endsAt = body?.ends_at ? new Date(String(body.ends_at)).toISOString() : null
    const allDay = Boolean(body?.all_day)
    const description = body?.description ? String(body.description).trim() : null

    const { data: event, error: createError } = await (supabase as any)
      .from('class_calendar_events')
      .insert([{
        class_id: classId,
        created_by: user.id,
        title,
        description,
        event_type: eventType,
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: allDay,
      }])
      .select('id, title, description, event_type, starts_at, ends_at, all_day, created_at')
      .single()

    if (createError || !event) {
      return NextResponse.json({ error: createError?.message || 'Failed to create event' }, { status: 500 })
    }

    return NextResponse.json({ event })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
=======
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getClassPermission } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

const ALLOWED_EVENT_TYPES = ['exam', 'deadline', 'session', 'other'] as const

function createClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
        remove(name: string, options: any) { cookieStore.set(name, '', { ...options, maxAge: 0 }) },
      },
    }
  )
}

// GET - list calendar events for a class (teachers only)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const { classId } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const perm = await getClassPermission(supabase, classId, user.id)
  if (!perm.isTeacher) {
    return NextResponse.json({ error: 'Only teachers can view class calendar events' }, { status: 403 })
  }

  const { data: events, error } = await (supabase as any)
    .from('class_calendar_events')
    .select('id, title, event_type, starts_at, ends_at, description, created_by, created_at')
    .eq('class_id', classId)
    .order('starts_at', { ascending: true })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to load calendar events' }, { status: 500 })
  }

  return NextResponse.json({ events: events || [] })
}

// POST - create a calendar event (teachers only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const { classId } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const perm = await getClassPermission(supabase, classId, user.id)
  if (!perm.isTeacher) {
    return NextResponse.json({ error: 'Only teachers can create class calendar events' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const startsAtRaw = typeof body?.starts_at === 'string' ? body.starts_at : ''
  const endsAtRaw = typeof body?.ends_at === 'string' ? body.ends_at : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  let eventType = typeof body?.event_type === 'string' ? body.event_type : 'other'

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  if (!startsAtRaw || Number.isNaN(new Date(startsAtRaw).getTime())) {
    return NextResponse.json({ error: 'starts_at must be a valid date' }, { status: 400 })
  }

  if (!(ALLOWED_EVENT_TYPES as readonly string[]).includes(eventType)) {
    eventType = 'other'
  }

  const { data: inserted, error } = await (supabase as any)
    .from('class_calendar_events')
    .insert({
      class_id: classId,
      title,
      event_type: eventType,
      starts_at: startsAtRaw,
      ends_at: endsAtRaw || null,
      description: description || null,
      created_by: user.id,
    })
    .select('id, title, event_type, starts_at, ends_at, description, created_by, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to create calendar event' }, { status: 500 })
  }

  return NextResponse.json({ event: inserted })
>>>>>>> a6edf58496d4da4e9e7b76a0867852440e40ef56
}
