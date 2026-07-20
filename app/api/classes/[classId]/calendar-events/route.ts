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

// GET - list calendar events for a class. Any class member can read (merged
// into the Agenda feed for students too — Calendar used to be a teacher-only
// tab, folding it into Agenda closes that gap); only teachers can write.
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
  if (!perm.isMember) {
    return NextResponse.json({ error: 'Not a member of this class' }, { status: 403 })
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
}
