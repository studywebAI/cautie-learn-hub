# CalDAV Implementation Status

## Summary
✅ **CalDAV infrastructure is now in place** for connecting to Apple iCloud, Google Calendar, Outlook, and custom CalDAV servers without needing API keys - only user credentials.

## Changes Made (May 26, 2026)

### UI Updates
- ✅ **Agenda Page** (`/app/(main)/agenda/page.tsx`)
  - Removed old "Export" and "Import" buttons for ICS files
  - Added new "Connect Calendar" button
  - Added `isCalendarDialogOpen` state
  - Integrated CalendarConnectionDialog component

### New Components
- ✅ **CalendarConnectionDialog** (`/app/components/agenda/calendar-connection-dialog.tsx`)
  - Two tabs: "Connect New" and "Connected Accounts"
  - Provider selection (Apple, Google, Outlook, CalDAV)
  - Credential input forms
  - Display of connected calendars with sync status
  - Disconnect functionality

### Backend Endpoints
- ✅ **POST /api/calendar/connect**
  - Accepts provider, username, password, caldavUrl
  - Stores calendar account in database
  - Triggers background sync

- ✅ **POST /api/calendar/sync**
  - Fetches all calendar accounts for user
  - Updates last_synced_at timestamp
  - Ready for full CalDAV protocol implementation

- ✅ **GET /api/calendar/accounts**
  - Lists all connected calendar accounts
  - Shows last sync time
  - Does not return passwords (security)

- ✅ **DELETE /api/calendar/accounts?id={accountId}**
  - Disconnects a calendar account
  - Verifies user ownership before deletion

### Database Schema
- ✅ **Migration: `20260526_caldav_calendar_integration.sql`**
  - Creates `calendar_accounts` table
  - Columns: id, user_id, provider, username, password, caldav_url, created_at, updated_at, last_synced_at
  - Row-level security (RLS) to protect user data
  - Unique constraints to prevent duplicate calendar connections

### Documentation
- ✅ **CALDAV_SETUP.md** - Complete setup guide for users
- ✅ **CALDAV_IMPLEMENTATION_STATUS.md** - This file

## Provider Support

### Apple iCloud Calendar
- CalDAV URL: `https://caldav.icloud.com/`
- Requires: Apple ID email + app-specific password
- Status: ✅ Ready for protocol implementation

### Google Calendar
- CalDAV URL: `https://caldav.google.com/caldav/v2/`
- Requires: Google email + app password
- Status: ✅ Ready for protocol implementation

### Microsoft Outlook
- CalDAV URL: `https://outlook.office365.com/api/v2.0/me/calendarview/`
- Requires: Outlook email + password
- Status: ✅ Ready for protocol implementation

### Custom CalDAV Servers
- CalDAV URL: User-provided
- Requires: CalDAV server URL + username + password
- Status: ✅ Ready for protocol implementation

## What's NOT Implemented Yet (Placeholder Phase)

The sync endpoints exist but don't yet fetch actual calendar events. Next steps:

1. **Install CalDAV Library**
   ```bash
   npm install tsdav
   ```

2. **Implement CalDAV Protocol** in `/app/api/calendar/sync/route.ts`
   - Use `tsdav` to make PROPFIND requests to calendar servers
   - Parse iCalendar (RFC 5545) responses
   - Extract VEVENT components from calendar data
   - Store events in agenda tables

3. **Implement Bi-Directional Sync**
   - Fetch events from calendar servers (done above)
   - Push Cautie events to user's calendar (CREATEEVENT, MODIFYEVENT)
   - Handle conflicts between local and remote events

4. **Add Scheduled Sync**
   - Set up automatic syncs every N hours
   - Update `last_synced_at` timestamp
   - Notify user of sync status

5. **Password Encryption**
   - Currently stored in plaintext (TODO)
   - Encrypt using Supabase's `pgcrypto` extension
   - Decrypt only when needed for authentication

## Testing Checklist

- [ ] Apply migration to Supabase database
- [ ] Test "Connect Calendar" button opens dialog
- [ ] Test connecting Apple iCloud account
- [ ] Test connecting Google Calendar account
- [ ] Test connecting Outlook account
- [ ] Test listing connected accounts
- [ ] Test disconnecting a calendar
- [ ] Verify database stores credentials correctly
- [ ] Test full CalDAV sync (after protocol implementation)

## File Structure

```
cautie-learn-hub/
├── app/
│   ├── api/
│   │   └── calendar/
│   │       ├── connect/route.ts          ✅ POST
│   │       ├── sync/route.ts             ✅ POST (placeholder)
│   │       └── accounts/route.ts         ✅ GET/DELETE
│   ├── components/
│   │   └── agenda/
│   │       └── calendar-connection-dialog.tsx  ✅ UI
│   └── (main)/
│       └── agenda/
│           └── page.tsx                  ✅ Integrated
├── supabase/
│   └── migrations/
│       └── 20260526_caldav_calendar_integration.sql  ✅
└── CALDAV_SETUP.md                        ✅ Documentation
```

## Next Phase: Full CalDAV Implementation

When ready to implement actual calendar event fetching:

```typescript
// Pseudo-code for sync endpoint

for (const account of accounts) {
  const { url, username, password } = account;
  
  // 1. PROPFIND to get calendar list
  const calendars = await propfind(url, { username, password });
  
  // 2. For each calendar, REPORT to get events
  for (const calendar of calendars) {
    const events = await report(calendar.url, { username, password });
    
    // 3. Parse iCalendar and create agenda items
    for (const event of events) {
      await createAgendaItem({
        title: event.summary,
        due_at: event.dtend,
        description: event.description,
        external_calendar_id: event.uid,
      });
    }
  }
  
  // 4. Update sync timestamp
  await updateLastSyncedAt(account.id);
}
```

## Security Notes

- ⚠️ Passwords currently stored unencrypted
- ⚠️ Use app-specific passwords for major providers
- ⚠️ CalDAV traffic should be HTTPS only
- ✅ Row-level security ensures user data isolation
- ✅ Credentials never returned in API responses
- ✅ User ownership verified before any delete operations

## Environment Variables

No additional API keys needed! Users only need:
- Their calendar provider email
- Their password (or app-specific password)
- For custom CalDAV: the server URL

## Zero API Keys Policy

Unlike the old approach:
- ❌ No Google Cloud API configuration needed
- ❌ No Microsoft Azure setup required
- ❌ No Apple Developer account needed
- ✅ Works with CalDAV protocol natively supported by all providers
- ✅ Users provide their own credentials

This makes setup significantly simpler for end users!
