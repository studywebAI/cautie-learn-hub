import { NextRequest, NextResponse } from 'next/server';

/**
 * Export agenda events as ICS (iCalendar) format
 * Compatible with Apple Calendar, Google Calendar, Outlook, etc.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'ics';

    if (format !== 'ics') {
      return NextResponse.json({ error: 'Only ICS format is currently supported' }, { status: 400 });
    }

    // For now, return a template. In production, this would fetch actual agenda items
    const icsContent = generateEmptyICS();

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="agenda.ics"',
      },
    });
  } catch (error: any) {
    console.error('[agenda/export] error', error);
    return NextResponse.json({ error: error?.message || 'Export failed' }, { status: 500 });
  }
}

function generateEmptyICS(): string {
  const now = new Date();
  const dateStr = formatICSDate(now);

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cautie Learn Hub//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Cautie Agenda
X-WR-TIMEZONE:UTC
BEGIN:VTIMEZONE
TZID:UTC
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0000
TZOFFSETTO:+0000
TZNAME:UTC
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:cautie-sample-${now.getTime()}@cautie.app
DTSTAMP:${dateStr}
DTSTART:${dateStr}
DTEND:${dateStr}
SUMMARY:Sample Event
DESCRIPTION:Export your agenda from Cautie Learn Hub
STATUS:DRAFT
END:VEVENT
END:VCALENDAR`;
}

function formatICSDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}
