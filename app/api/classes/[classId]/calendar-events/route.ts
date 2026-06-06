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
}
