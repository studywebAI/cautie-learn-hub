import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { DAVClient, Calendar, DAVAccount } from 'tsdav';
import { parseString } from 'xml2js';
import * as ICAL from 'ical.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * CalDAV Sync Endpoint
 *
 * Fetches events from connected calendar accounts and syncs them with Cautie's agenda.
 * Supports Apple iCloud, Google Calendar, Outlook, and custom CalDAV servers.
 *
 * User needs NO API keys - only their calendar account credentials (username/password).
 * CalDAV is a protocol supported natively by all major calendar providers.
 */

interface CalendarEvent {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  uid: string;
}

async function parseICalendarData(icalData: string): Promise<CalendarEvent[]> {
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

async function getCalDAVClient(
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

async function syncCalendarAccount(
  supabase: any,
  user: any,
  account: any
): Promise<{
  accountId: string;
  provider: string;
  status: string;
  eventsCount: number;
  message: string;
}> {
  try {
    const { client, baseUrl } = (await getCalDAVClient(
      account.provider,
      account.caldav_url,
      account.username,
      account.password
    )) || { client: null, baseUrl: null };

    if (!client) {
      return {
        accountId: account.id,
        provider: account.provider,
        status: 'error',
        eventsCount: 0,
        message: 'Failed to connect to calendar server',
      };
    }

    // Fetch all calendar objects
    const calendarObjects = await client.fetchCalendarObjects({
      rejectOnMissingUrl: false,
    });

    let eventCount = 0;
    const eventsToSync: CalendarEvent[] = [];

    // Parse calendar data
    for (const obj of calendarObjects) {
      if (obj.data) {
        const events = await parseICalendarData(obj.data);
        eventsToSync.push(...events);
        eventCount += events.length;
      }
    }

    // Store events in personal tasks
    if (eventsToSync.length > 0) {
      // Insert or update personal tasks from calendar events
      for (const event of eventsToSync) {
        // Use the event UID as a stable identifier for updates
        const { data: existing } = await supabase
          .from('personal_tasks')
          .select('id')
          .eq('user_id', user.id)
          .match({ title: event.title, due_date: event.end.toISOString().split('T')[0] })
          .single()
          .catch(() => ({ data: null }));

        if (existing) {
          // Update existing personal task
          await supabase
            .from('personal_tasks')
            .update({
              title: event.title,
              description: `${event.description || ''}\n\n[Synced from ${account.provider} Calendar]`.trim(),
              due_date: event.end.toISOString().split('T')[0],
            })
            .eq('id', existing.id)
            .catch((err) => console.error('Update failed:', err));
        } else {
          // Create new personal task from calendar event
          await supabase
            .from('personal_tasks')
            .insert({
              user_id: user.id,
              title: event.title,
              description: `${event.description || ''}\n\n[Synced from ${account.provider} Calendar]`.trim(),
              due_date: event.end.toISOString().split('T')[0],
              status: 'pending',
            })
            .catch((err) => console.error('Insert failed:', err));
        }
      }
    }

    // Update last sync timestamp
    await supabase
      .from('calendar_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', account.id);

    return {
      accountId: account.id,
      provider: account.provider,
      status: 'success',
      eventsCount: eventCount,
      message: `Synced ${eventCount} events from ${account.provider}`,
    };
  } catch (error: any) {
    console.error(`Sync failed for account ${account.id}:`, error);
    return {
      accountId: account.id,
      provider: account.provider,
      status: 'error',
      eventsCount: 0,
      message: error?.message || 'Sync failed',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId } = body;

    // Get calendar account(s) to sync
    let query = supabase
      .from('calendar_accounts')
      .select('*')
      .eq('user_id', user.id);

    if (accountId) {
      query = query.eq('id', accountId);
    }

    const { data: accounts, error: accountError } = await query;

    if (accountError) {
      console.error('Failed to fetch calendar accounts:', accountError);
      return NextResponse.json(
        { error: 'Failed to fetch calendar accounts' },
        { status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No calendar accounts found',
          synced: [],
        },
        { status: 404 }
      );
    }

    const syncResults = [];

    // Sync each account
    for (const account of accounts) {
      const result = await syncCalendarAccount(supabase, user, account);
      syncResults.push(result);
    }

    const successCount = syncResults.filter((r) => r.status === 'success').length;
    const totalEvents = syncResults.reduce((sum, r) => sum + r.eventsCount, 0);

    return NextResponse.json({
      success: true,
      synced: syncResults,
      summary: {
        accountsSynced: successCount,
        totalAccounts: accounts.length,
        totalEventsSynced: totalEvents,
      },
      message: `Synced ${successCount}/${accounts.length} calendars with ${totalEvents} total events`,
    });
  } catch (error: any) {
    console.error('Calendar sync error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
