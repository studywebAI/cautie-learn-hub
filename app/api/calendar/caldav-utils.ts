import { DAVClient } from 'tsdav';
import * as ICAL from 'ical.js';

export interface CalendarEvent {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  uid: string;
}

export async function parseICalendarData(icalData: string): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];

  try {
    const jcal = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcal);
    const vevents = comp.getAllSubcomponents('vevent');

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);

      events.push({
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        start: event.startDate.toJSDate(),
        end: event.endDate.toJSDate(),
        uid: event.uid,
      });
    }
  } catch (error) {
    console.error('Error parsing iCalendar data:', error);
  }

  return events;
}

export async function getCalDAVClient(
  provider: string,
  caldavUrl: string | null,
  username: string,
  password: string
): Promise<{ client: DAVClient; baseUrl: string } | null> {
  let baseUrl = caldavUrl;

  if (!baseUrl) {
    switch (provider) {
      case 'apple':
        baseUrl = 'https://caldav.icloud.com/';
        break;
      case 'google':
        baseUrl = 'https://caldav.google.com/caldav/v2/';
        break;
      case 'outlook':
        baseUrl = 'https://outlook.office365.com/api/v2.0/me/';
        break;
      default:
        return null;
    }
  }

  try {
    const client = new DAVClient({
      baseURL: baseUrl,
      credentials: {
        username,
        password,
      },
      authtype: 'basic',
      defaultAccountType: 'caldav',
    });

    // Test connection
    await client.fetchCalendarObjects({ rejectOnMissingUrl: false }).catch(
      () => null
    );

    return { client, baseUrl };
  } catch (error) {
    console.error(`Failed to create CalDAV client for ${provider}:`, error);
    return null;
  }
}
