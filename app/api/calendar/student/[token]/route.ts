import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type StudyEvent = {
  uid: string
  title: string
  description: string
  starts_at: string
  ends_at: string | null
}

/**
 * Format a date into the ICS UTC date-time form: YYYYMMDDTHHMMSSZ
 */
function formatDateToICS(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
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

function add1Hour(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value)
  const base = Number.isNaN(date.getTime()) ? new Date() : date
  return new Date(base.getTime() + 60 * 60 * 1000)
}

/**
 * Escape text for inclusion in ICS property values (RFC 5545).
 */
function escapeICS(value: string): string {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function buildVCalendar(events: StudyEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cautie Learn Hub//Student Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Study Schedule',
    'X-WR-TIMEZONE:UTC',
  ]

  for (const event of events) {
    if (!event?.starts_at) continue
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.uid}@cautie.app`)
    lines.push(`DTSTAMP:${formatDateToICS(new Date())}`)
    lines.push(`DTSTART:${formatDateToICS(event.starts_at)}`)
    lines.push(`DTEND:${formatDateToICS(event.ends_at || add1Hour(event.starts_at))}`)
    lines.push(`SUMMARY:${escapeICS(event.title || 'Study session')}`)
    lines.push(`DESCRIPTION:${escapeICS(event.description || '')}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

function calendarResponse(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="study-schedule.ics"',
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

/**
 * Convert a plan date (YYYY-MM-DD) into an ISO timestamp at a default study
 * hour. Study plan days are date-only, so we anchor them to a sensible time.
 */
function planDateToStart(planDate: string): string {
  // Default study sessions to start at 16:00 UTC.
  const iso = `${String(planDate).slice(0, 10)}T16:00:00.000Z`
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    // For now the "token" is the userId. Proper opaque-token auth can be added
    // later by resolving the token to a user via a tokens table.
    const userId = token

    const supabase = createAdminClient()

    // Pull this student's study plan days together with their tasks so each
    // day becomes a calendar event describing the planned study session.
    const { data: dayRows, error: daysError } = await (supabase as any)
      .from('studyset_plan_days')
      .select(`
        id,
        studyset_id,
        day_number,
        plan_date,
        completed,
        estimated_minutes,
        studysets ( name, user_id ),
        studyset_plan_tasks ( id, title, task_type, completed )
      `)
      .order('plan_date', { ascending: true })

    let events: StudyEvent[] = []

    if (!daysError && Array.isArray(dayRows)) {
      events = dayRows
        // Only keep days that belong to this student and have a real date.
        .filter((day: any) => {
          const ownerId = day?.studysets?.user_id
          const planDate = day?.plan_date
          return Boolean(planDate) && (!ownerId || String(ownerId) === String(userId))
        })
        .map((day: any) => {
          const studysetName = day?.studysets?.name ? String(day.studysets.name) : 'Studyset'
          const start = planDateToStart(String(day.plan_date))
          const minutes = Number(day?.estimated_minutes || 0)
          const ends = minutes > 0
            ? new Date(new Date(start).getTime() + minutes * 60 * 1000).toISOString()
            : null

          const tasks = Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks : []
          const taskLines = tasks
            .map((task: any) => `${task?.completed ? '[x]' : '[ ]'} ${String(task?.title || 'Task')}`)
            .join('\n')

          const dayNumber = Number(day?.day_number || 0)
          return {
            uid: `studyday-${String(day.id)}`,
            title: `Study: ${studysetName}${dayNumber ? ` (Day ${dayNumber})` : ''}`,
            description: taskLines || 'Study session',
            starts_at: start,
            ends_at: ends,
          } as StudyEvent
        })
    }

    return calendarResponse(buildVCalendar(events))
  } catch {
    return calendarResponse(buildVCalendar([]))
  }
}
