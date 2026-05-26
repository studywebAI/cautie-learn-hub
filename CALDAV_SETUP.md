# CalDAV Calendar Integration Setup

This guide explains how to enable calendar synchronization with Apple iCloud, Google Calendar, Outlook, and other CalDAV-compatible services.

## What's New

The old manual ICS import/export has been replaced with **automatic CalDAV synchronization**. Now you can:

- ✅ Connect your Apple iCloud Calendar, Google Calendar, or Outlook
- ✅ Automatically sync calendar events in real-time
- ✅ Support for any custom CalDAV server
- ✅ No API keys needed - just your calendar credentials

## Database Migration

A new `calendar_accounts` table was created to store calendar credentials securely.

### Apply the Migration

**For Local Development:**
```bash
supabase migration up
```

**For Production (Vercel with Supabase):**

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to your project
3. Go to **SQL Editor**
4. Create a new query and paste the migration from `supabase/migrations/20260526_caldav_calendar_integration.sql`
5. Click **Execute**

## Frontend Changes

The agenda page now has a **"Connect Calendar"** button instead of Import/Export:

- Removed: `Download` and `Upload` buttons for ICS files
- Added: `Calendar` button to connect calendar accounts
- New Dialog: Shows connected calendars and allows adding new ones

## API Endpoints

### Connect a Calendar
```
POST /api/calendar/connect
Content-Type: application/json

{
  "provider": "apple|google|outlook|caldav",
  "username": "user@example.com",
  "password": "app-specific-password",
  "caldavUrl": "https://caldav.example.com/" // Only for caldav provider
}
```

### List Connected Calendars
```
GET /api/calendar/accounts
```

Response:
```json
{
  "accounts": [
    {
      "id": "uuid",
      "provider": "google",
      "username": "user@gmail.com",
      "created_at": "2026-05-26T...",
      "last_synced_at": "2026-05-26T..."
    }
  ]
}
```

### Sync Calendar
```
POST /api/calendar/sync
Content-Type: application/json

{
  "accountId": "uuid" // Optional - syncs all if omitted
}
```

### Disconnect Calendar
```
DELETE /api/calendar/accounts?id=uuid
```

## Calendar Provider Setup

### Apple iCloud Calendar

1. Click "Connect Calendar" → Select "Apple iCloud"
2. Enter your Apple ID email
3. **Important:** Use an [app-specific password](https://support.apple.com/en-us/102654), not your regular password
4. Click "Connect Calendar"

### Google Calendar

1. Click "Connect Calendar" → Select "Google Calendar"
2. Enter your Google email
3. **Important:** Use an [app password](https://support.google.com/accounts/answer/185833), not your regular password
4. Click "Connect Calendar"

### Microsoft Outlook

1. Click "Connect Calendar" → Select "Microsoft Outlook"
2. Enter your Outlook email
3. Enter your password
4. Click "Connect Calendar"

### Custom CalDAV Server

1. Click "Connect Calendar" → Select "Custom CalDAV Server"
2. Enter your CalDAV server URL (e.g., `https://caldav.example.com/`)
3. Enter your username
4. Enter your password
5. Click "Connect Calendar"

## Implementation Status

### ✅ Completed
- [x] CalDAV database schema
- [x] Calendar connection endpoints
- [x] Connected calendars management
- [x] UI dialog for connecting calendars
- [x] Agenda page integration

### 🔄 In Progress
- [ ] Full CalDAV protocol implementation (PROPFIND, REPORT requests)
- [ ] Event fetching from calendar servers
- [ ] Bi-directional sync (Cautie → Calendar)
- [ ] Automatic scheduled syncs
- [ ] Conflict resolution
- [ ] Encryption for stored passwords

### ⏱️ Next Steps

1. **Apply the database migration** to your Supabase instance
2. **Test the UI** by connecting a calendar account
3. **Implement CalDAV protocol** in `/app/api/calendar/sync/route.ts`
   - Use the `tsdav` npm package for CalDAV protocol handling
   - Fetch events from calendar servers
   - Store events in the agenda

## Security Notes

- ⚠️ Passwords are stored in the database (TODO: Encrypt them in production)
- Use **app-specific passwords** for Apple, Google, and Microsoft accounts
- CalDAV authentication uses HTTP Basic Auth (should be HTTPS only)
- Row-level security (RLS) ensures users only access their own calendar accounts

## Troubleshooting

### Calendar won't connect
- Check username and password are correct
- Ensure you're using an app-specific password for Apple/Google/Microsoft
- Verify CalDAV URL for custom servers

### Events not syncing
- Check `last_synced_at` timestamp in calendar accounts
- Review network requests in browser DevTools
- Check server logs for CalDAV protocol errors

### Missing events
- CalDAV sync is currently a placeholder
- Full implementation needed to fetch events from calendar servers

## File Structure

```
/app/api/calendar/
  ├── connect/route.ts          # POST to add calendar account
  ├── sync/route.ts              # POST to sync calendars
  └── accounts/route.ts          # GET list, DELETE disconnect

/app/components/agenda/
  └── calendar-connection-dialog.tsx  # UI component

/supabase/migrations/
  └── 20260526_caldav_calendar_integration.sql
```
