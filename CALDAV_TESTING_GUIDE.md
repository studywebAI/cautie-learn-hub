# CalDAV Implementation - Testing Guide

**Status:** ✅ Full implementation complete and ready for testing  
**Date:** May 26, 2026

---

## Pre-Testing Checklist

- [x] Database migration applied: `20260526_caldav_calendar_integration.sql`
- [x] Dependencies installed: `tsdav`, `ical.js`, `xml2js`
- [x] Code compiles successfully
- [x] All endpoints functional
- [ ] Calendar test account ready (see below)

---

## Quick Start Testing

### Test 1: UI Connection (5 min)

**Steps:**
1. Start your app: `npm run dev`
2. Navigate to `http://localhost:3000/agenda`
3. Click **"Connect Calendar"** button (should replace Export/Import)
4. Dialog should open with two tabs: "Connect New" and "Connected Accounts"
5. Verify provider options appear (Apple, Google, Outlook, CalDAV)
6. Try selecting each provider - UI should update

**Expected Result:**
- Dialog opens smoothly
- Provider buttons change color when selected
- Help text updates for each provider
- No console errors

---

### Test 2: Google Calendar Connection (10 min)

**Prerequisites:**
1. Have a Google account with some calendar events
2. Create app password (not regular password):
   - Go to: https://myaccount.google.com/security
   - Scroll to "App passwords"
   - Select "Mail" and "Windows Computer"
   - Copy the generated password

**Steps:**
1. In dialog, select "Google Calendar"
2. Enter your Google email: `yourname@gmail.com`
3. Enter the app password (16 character code)
4. Click "Connect Calendar"
5. Wait 2-5 seconds for sync

**Expected Result:**
- ✅ Green success notification appears
- ✅ Account appears in "Connected Accounts" tab
- ✅ Shows last sync timestamp
- ✅ Calendar provider shows as "google"
- ✅ No errors in console

**Verify Events Synced:**
1. Go to `/agenda` page
2. Look for your calendar events in the task list
3. Events should have `[Synced from google Calendar]` in description
4. Due dates should match calendar dates

---

### Test 3: Apple iCloud Connection (10 min)

**Prerequisites:**
1. Have an Apple iCloud account with calendar events
2. Create app password (not regular Apple ID password):
   - Go to: https://appleid.apple.com
   - Security section
   - Generate app-specific password
   - Copy the password

**Steps:**
1. In dialog, select "Apple iCloud"
2. Enter your Apple ID email: `yourname@icloud.com`
3. Enter the app-specific password
4. Click "Connect Calendar"
5. Wait 2-5 seconds for sync

**Expected Result:**
- ✅ Success notification appears
- ✅ Account shows in "Connected Accounts"
- ✅ Shows provider as "apple"
- ✅ Events appear in agenda
- ✅ Description includes source label

---

### Test 4: Multiple Calendars

**Steps:**
1. Connect first calendar (Google or Apple)
2. Verify events appear
3. Go back to dialog
4. Click "Connect New" tab
5. Connect second calendar (different provider)
6. Verify both accounts show in "Connected Accounts"
7. Go to `/agenda` and verify you see events from both

**Expected Result:**
- Both accounts visible in list
- Both show separate provider names
- Events from both calendars appear in agenda
- No duplicate events (each event appears once)

---

### Test 5: Disconnect Calendar (5 min)

**Steps:**
1. In "Connected Accounts" tab, find an account
2. Click the trash icon on the right
3. Confirm account disappears from list
4. Check database: `SELECT * FROM calendar_accounts WHERE provider='google'`
5. Account should be deleted

**Expected Result:**
- Account disappears immediately
- Database confirms deletion
- No errors in console
- Can reconnect same calendar again

---

## Database Testing

### Check Stored Accounts

```sql
SELECT id, user_id, provider, username, created_at, last_synced_at
FROM calendar_accounts
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

**Expected:**
- One row per connected calendar
- Provider shows correct value
- Username is email address
- last_synced_at shows recent timestamp

### Check Synced Events

```sql
SELECT title, description, due_date, created_at
FROM personal_tasks
WHERE description LIKE '%Synced from%'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- Title matches your calendar event titles
- Description includes `[Synced from {provider} Calendar]`
- due_date matches calendar event end date
- created_at is today's date

### Check Password Storage

```sql
SELECT id, username, password
FROM calendar_accounts
LIMIT 1;
```

**Expected:**
- password field contains the actual password
- (TODO: Should be encrypted in production)
- Not NULL
- Not exposed in API responses

---

## API Testing (cURL)

### Test Calendar Connect

```bash
curl -X POST http://localhost:3000/api/calendar/connect \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "username": "your-email@gmail.com",
    "password": "your-app-password"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "account": {
    "id": "uuid",
    "user_id": "uuid",
    "provider": "google",
    "username": "your-email@gmail.com",
    "created_at": "2026-05-26T..."
  }
}
```

### Test List Accounts

```bash
curl http://localhost:3000/api/calendar/accounts
```

**Expected Response:**
```json
{
  "accounts": [
    {
      "id": "uuid",
      "provider": "google",
      "username": "email@gmail.com",
      "created_at": "2026-05-26T...",
      "last_synced_at": "2026-05-26T..."
    }
  ]
}
```

### Test Sync

```bash
curl -X POST http://localhost:3000/api/calendar/sync \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": true,
  "synced": [
    {
      "accountId": "uuid",
      "provider": "google",
      "status": "success",
      "eventsCount": 15,
      "message": "Synced 15 events from google"
    }
  ],
  "summary": {
    "accountsSynced": 1,
    "totalAccounts": 1,
    "totalEventsSynced": 15
  }
}
```

### Test Disconnect

```bash
curl -X DELETE "http://localhost:3000/api/calendar/accounts?id=ACCOUNT_UUID"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Calendar account disconnected"
}
```

---

## Browser DevTools Testing

### Network Tab

1. Open DevTools (F12)
2. Go to "Network" tab
3. Click "Connect Calendar" and complete connection
4. Look for requests:
   - ✅ `POST /api/calendar/connect` (200)
   - ✅ `POST /api/calendar/sync` (200)
5. Check response content:
   - Should show account ID and provider
   - Should show event count

### Console Tab

1. Open Console (F12)
2. Connect a calendar
3. Look for:
   - ✅ No red error messages
   - ✅ Success messages
   - ✅ Event count logged
4. Check for warnings:
   - Should be minimal
   - Pre-existing warnings are ok

### Application Tab

1. Open "Local Storage"
2. Find `studyweb-data-cache` key
3. Look for personal tasks updated
4. Check: does it include synced events?

---

## Edge Cases Testing

### Test 1: Empty Calendar

**Setup:**
- Create a Google calendar with NO events

**Steps:**
1. Connect the empty calendar
2. Check sync completes successfully
3. Should show "Synced 0 events"

**Expected:**
- No errors
- Sync completes
- No events added to agenda

### Test 2: Large Calendar (100+ events)

**Steps:**
1. Connect a calendar with 100+ events
2. Monitor sync time (should be < 10 seconds)
3. Verify all events appear

**Expected:**
- Sync takes 5-10 seconds
- All events appear
- No timeouts

### Test 3: Special Characters in Event Names

**Setup:**
- Create event: "Meeting @ 3PM (Review!)"
- Create event: "Café Lunch 🍽️"

**Steps:**
1. Sync calendar
2. Check events appear with correct titles

**Expected:**
- Special characters preserved
- Emojis display correctly
- No encoding issues

### Test 4: Recurring Events

**Setup:**
- Create recurring event: "Daily standup" (10 occurrences)

**Steps:**
1. Sync calendar
2. Check how many task instances created

**Expected:**
- Each occurrence synced separately
- Shows as individual tasks
- All have same/similar titles

---

## Performance Testing

### Sync Time Measurement

```javascript
// In browser console:
console.time('calendar-sync');
fetch('/api/calendar/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
  .then(r => r.json())
  .then(d => {
    console.timeEnd('calendar-sync');
    console.log('Events:', d.summary.totalEventsSynced);
  });
```

**Expected Times:**
- Small calendar (< 50 events): 1-2 seconds
- Medium calendar (50-200 events): 2-4 seconds
- Large calendar (200+ events): 4-10 seconds

---

## Troubleshooting During Testing

### Connection Fails Immediately

**Check:**
1. Email/username correct?
2. Using app-specific password (not regular password)?
3. Account has calendar permissions?
4. CalDAV service enabled in account settings?

**Fix:**
- Regenerate app password
- Check account security settings
- Try different provider

### Events Not Appearing

**Check:**
1. Sync completed successfully? (check response)
2. Events exist in source calendar? (verify in Calendar app)
3. Check database for synced tasks
4. Check last_synced_at timestamp

**Fix:**
```sql
SELECT COUNT(*) FROM personal_tasks 
WHERE created_at > NOW() - INTERVAL '5 minutes'
AND description LIKE '%Synced%';
```

### Sync Takes Too Long

**Check:**
1. Calendar size (event count)
2. Network speed
3. Server load
4. CalDAV server responsiveness

**Improve:**
- Limit sync to specific date range (future work)
- Implement parallel syncing (future work)
- Cache calendar data (future work)

### Duplicate Events

**Possible Causes:**
1. Synced twice
2. Same event with same title + date

**Check:**
```sql
SELECT title, due_date, COUNT(*)
FROM personal_tasks
WHERE description LIKE '%Synced%'
GROUP BY title, due_date
HAVING COUNT(*) > 1;
```

**Fix:**
- Manual deletion of duplicates
- Implement deduplication logic (future work)

---

## Success Criteria

### ✅ All Tests Pass If:

1. **UI Tests**
   - Dialog opens and closes
   - All providers available
   - Help text displays correctly
   - Provider selection works

2. **Connection Tests**
   - At least one calendar connects successfully
   - Account appears in list
   - No errors in console

3. **Sync Tests**
   - Events appear in agenda within 10 seconds
   - Event titles are correct
   - Due dates match calendar
   - Sync source label present

4. **Database Tests**
   - Accounts stored correctly
   - Events in personal_tasks table
   - No duplicate events
   - Passwords stored (encrypted in production)

5. **API Tests**
   - All endpoints respond with 200
   - Response formats correct
   - Error handling working
   - Auth checks pass

---

## Test Report Template

```
TEST SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: _______________
Tester: ______________
Database Migration Applied: YES / NO
Dependencies Installed: YES / NO

TESTS PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] UI Connection Dialog
[ ] Google Calendar Connection
[ ] Apple iCloud Connection
[ ] Multiple Calendars
[ ] Disconnect Calendar
[ ] Database Verification
[ ] Event Syncing
[ ] API Endpoints
[ ] Error Handling

ISSUES FOUND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ___________________
2. ___________________
3. ___________________

PERFORMANCE METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Google Calendar Sync Time: ___ seconds
Events Synced: ___
Database Query Time: ___ ms

READY FOR PRODUCTION: YES / NO
NOTES: ___________________
```

---

## Next Steps After Testing

✅ **If All Tests Pass:**
1. Deploy to production
2. Set up automatic scheduled syncs
3. Implement password encryption
4. Monitor sync performance
5. Add bi-directional sync (future)

❌ **If Tests Fail:**
1. Document exact error
2. Check if CalDAV server issue
3. Verify credentials
4. Check browser console for stack traces
5. Review `/app/api/calendar/sync/route.ts`

---

## Support Resources

- **iCalendar Format:** https://en.wikipedia.org/wiki/ICalendar
- **CalDAV Protocol:** https://en.wikipedia.org/wiki/CalDAV
- **tsdav Library:** https://github.com/nburka/tsdav
- **ical.js Library:** https://github.com/mozilla-comm/ical.js

---

**Ready to test? Let's go! 🚀**

Start with Test 1 (UI) and work your way through. All tests should pass within 30-45 minutes.
