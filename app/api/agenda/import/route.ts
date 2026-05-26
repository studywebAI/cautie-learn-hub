import { NextRequest, NextResponse } from 'next/server';

/**
 * Import agenda events from ICS (iCalendar) format
 * Parses events from Apple Calendar, Google Calendar, Outlook exports
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.includes('calendar') && !file.name.endsWith('.ics')) {
      return NextResponse.json({ error: 'Only ICS calendar files are supported' }, { status: 400 });
    }

    const content = await file.text();
    const events = parseICS(content);

    if (events.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No events found in the calendar file',
        events: [],
      });
    }

    return NextResponse.json({
      success: true,
      message: `Found ${events.length} events in the calendar file`,
      events,
      preview: events.slice(0, 5), // Show first 5 for preview
    });
  } catch (error: any) {
    console.error('[agenda/import] error', error);
    return NextResponse.json({ error: error?.message || 'Import failed' }, { status: 500 });
  }
}

interface ParsedEvent {
  id: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  source: string;
}

function parseICS(content: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  try {
    // Simple ICS parser - handles basic VEVENT blocks
    const eventBlocks = content.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

    for (const block of eventBlocks) {
      const event = parseVEvent(block);
      if (event.title) {
        events.push(event);
      }
    }
  } catch (error) {
    console.error('[ICS parser] error:', error);
  }

  return events;
}

function parseVEvent(vEvent: string): ParsedEvent {
  const lines = vEvent.split(/\r?\n/);
  const event: ParsedEvent = {
    id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: 'Untitled Event',
    source: 'ics-import',
  };

  for (const line of lines) {
    if (line.startsWith('SUMMARY:')) {
      event.title = line.slice(8).trim();
    } else if (line.startsWith('DESCRIPTION:')) {
      event.description = line.slice(12).trim();
    } else if (line.startsWith('DTSTART')) {
      const timeMatch = line.match(/:(.*?)(?:;|$)/);
      if (timeMatch) {
        event.startTime = parseICSDatetime(timeMatch[1]);
        event.allDay = !line.includes('T');
      }
    } else if (line.startsWith('DTEND')) {
      const timeMatch = line.match(/:(.*?)(?:;|$)/);
      if (timeMatch) {
        event.endTime = parseICSDatetime(timeMatch[1]);
      }
    } else if (line.startsWith('UID:')) {
      event.id = line.slice(4).trim();
    }
  }

  return event;
}

function parseICSDatetime(dateStr: string): string {
  try {
    // Handle formats: 20230515, 20230515T100000Z, 20230515T100000
    if (dateStr.length === 8) {
      // YYYYMMDD format
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const day = dateStr.slice(6, 8);
      return `${year}-${month}-${day}`;
    } else if (dateStr.includes('T')) {
      // Has time component
      const datePart = dateStr.slice(0, 8);
      const timePart = dateStr.slice(9, 15);
      const year = datePart.slice(0, 4);
      const month = datePart.slice(4, 6);
      const day = datePart.slice(6, 8);
      const hour = timePart.slice(0, 2);
      const min = timePart.slice(2, 4);
      const sec = timePart.slice(4, 6);
      return `${year}-${month}-${day}T${hour}:${min}:${sec}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}
