import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type CalendarEventRow = {
  id: string
  class_id: string
  title: string | null
  event_type: string | null
  starts_at: string | null
  ends_at: string | null
  description: string | null
  created_by: string | null
}

/**
 * Format a date into the ICS UTC date-time form: YYYYMMDDTHHMMSSZ
 */
function formatDateToICS(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    // Fallback to "now" so we never emit an invalid DTSTART/DTEND.
    return formatDateToICS(new Date())
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = date.getUTCFullYear()
  const mo = pad(date.getUTCMonth() + 1)
  const d = pad(date.getUTCDate())
  const h = pad(date.getUTCHours())
  const mi = pad(date.getUTCMinutes())
  const s = pad(date.getUTCSeconds())
  return `${y}${mo}${d}T${h}${mi}${s}Z`
}

/**
 * Add one hour to a date string, returning a Date.
 */
function add1Hour(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value)
  const base = Number.isNaN(date.getTime()) ? new Date() : date
  return new Date(base.getTime() + 60 * 60 * 1000)
}

/**
 * Escape text for inclusion in ICS property values.
 * Per RFC 5545: backslashes, newlines, commas and semicolons must be escaped.
 */
function escapeICS(value: string): string {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function buildVCalendar(events: CalendarEventRow[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cautie Learn Hub//Class Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Class Calendar',
    'X-WR-TIMEZONE:UTC',
  ]

  for (const event of events) {
    if (!event?.starts_at) continue
    const dtStart = formatDateToICS(event.starts_at)
    const dtEnd = formatDateToICS(event.ends_at || add1Hour(event.starts_at))

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.id}@cautie.app`)
    lines.push(`DTSTAMP:${formatDateToICS(new Date())}`)
    lines.push(`DTSTART:${dtStart}`)
    lines.push(`DTEND:${dtEnd}`)
    lines.push(`SUMMARY:${escapeICS(event.title || 'Class Event')}`)
    lines.push(`DESCRIPTION:${escapeICS(event.description || '')}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  // RFC 5545 requires CRLF line endings.
  return lines.join('\r\n') + '\r\n'
}

function calendarResponse(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="class-calendar.ics"',
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params

    if (!classId) {
      return NextResponse.json({ error: 'Missing classId' }, { status: 400 })
    }

    // Use the admin client: calendar apps subscribe to this URL without
    // sending auth cookies, so we cannot rely on the cookie-based client.
    const supabase = createAdminClient()

    // Verify the class exists. We accept either a real classes row or a
    // dedicated calendar-token row if the project adds one later.
    const { data: classRow, error: classError } = await (supabase as any)
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .maybeSingle()

    if (classError) {
      return NextResponse.json({ error: classError.message }, { status: 500 })
    }
    if (!classRow) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Query calendar events. If the table does not exist yet (or there are no
    // rows) we still serve a valid, empty calendar.
    let events: CalendarEventRow[] = []
    const { data: eventRows, error: eventsError } = await (supabase as any)
      .from('class_calendar_events')
      .select('id, class_id, title, event_type, starts_at, ends_at, description, created_by')
      .eq('class_id', classId)
      .order('starts_at', { ascending: true })

    if (!eventsError && Array.isArray(eventRows)) {
      events = eventRows as CalendarEventRow[]
    }

    return calendarResponse(buildVCalendar(events))
  } catch {
    // Even on unexpected failure, return a syntactically valid empty calendar
    // so subscribing apps do not break.
    return calendarResponse(buildVCalendar([]))
  }
}
