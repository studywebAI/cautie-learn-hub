# Error Logging & Support System

This document describes the unified error logging, user notification, and support contact system implemented in the app.

## Architecture Overview

```
┌─────────────────────┐
│  Client Error       │
│  (Browser/App)      │
└──────────┬──────────┘
           │
           ├─→ ErrorLogger.handleError()
           │   (client-side logging)
           │
           ├─→ POST /api/errors/log
           │   (centralized server logging)
           │
           ├─→ NotificationService
           │   (user-facing notification)
           │
           └─→ Error Code + UI Display
               (user sees copyable code)

┌─────────────────────┐
│  Team Monitoring    │
│  (.data/errors.jsonl)
└─────────────────────┘
```

## Components

### 1. Error Codes System (`app/lib/error-codes.ts`)

Defines user-friendly error messages and codes.

**Error Code Format:** `{CATEGORY}-{SUBCATEGORY}-{NUMBER}`
- Examples: `AUTH-LOGIN-001`, `API-NETWORK-002`, `STUDY-QUIZ-001`

**Categories:**
- `AUTH`: Authentication, login, 2FA, sessions
- `API`: Network, timeouts, server errors
- `STUDY`: Quiz, flashcards, notes loading failures
- `SYNC`: Data synchronization issues
- `DATA`: Storage, quota, database errors
- `SYSTEM`: Browser, environment, system issues

**Severity Levels:**
- `info`: Informational, no action required
- `warning`: User should be aware, but not critical
- `error`: Something failed, user action needed
- `critical`: Data loss risk, immediate attention needed

### 2. Error Logger Service (`app/lib/error-logger.ts`)

Client-side service that:
1. Catches errors
2. Logs them to the server via `/api/errors/log`
3. Notifies the user via `NotificationService`
4. Generates unique error codes for tracking

**Usage:**

```typescript
import { ErrorLogger } from '@/lib/error-logger';

// Automatic error handling
ErrorLogger.initialize(); // Call once on app load

// Manual error handling
try {
  await fetchData();
} catch (error) {
  await ErrorLogger.handleError(error, 'manual', { userId: '123' });
}

// Log known error codes
await ErrorLogger.logWithCode('AUTH-LOGIN-001', 'Username not found');
```

### 3. Error Logging API (`app/api/errors/log/route.ts`)

**POST /api/errors/log**

Stores errors to a JSONL file (`.data/errors.jsonl`) for team monitoring.

**Request:**
```json
{
  "code": "AUTH-LOGIN-001",
  "message": "Invalid credentials",
  "stack": "...",
  "url": "https://app.com/login",
  "timestamp": "2026-06-22T10:30:00Z",
  "userId": "user-123",
  "context": { "source": "manual" }
}
```

**Response:**
```json
{
  "success": true,
  "code": "AUTH-LOGIN-001",
  "message": "Error logged successfully"
}
```

**GET /api/errors/log/stats**

Returns error statistics for the monitoring dashboard:
```json
{
  "stats": {
    "total": 42,
    "byCategoryFive": {
      "AUTH": 15,
      "API": 12,
      "STUDY": 8,
      "SYNC": 5,
      "SYSTEM": 2
    },
    "recent": [...]
  }
}
```

### 4. Support Contact Form (`app/components/support/contact-form.tsx`)

Component for users to contact support with error code pre-filled.

**Props:**
```typescript
interface ContactFormProps {
  errorCode?: string;           // Pre-fill error code
  onSubmit?: (data: ContactFormData) => Promise<void>;
  locale?: 'en' | 'nl';         // Language
}
```

**Usage:**
```tsx
import { ContactForm } from '@/components/support/contact-form';

<ContactForm 
  errorCode="AUTH-LOGIN-001"
  locale="en"
/>
```

### 5. Support Contact API (`app/api/support/contact/route.ts`)

**POST /api/support/contact**

Stores support messages to `.data/contact-messages.jsonl`

**Request:**
```json
{
  "email": "user@example.com",
  "subject": "Login issue",
  "message": "Can't log in with my credentials",
  "errorCode": "AUTH-LOGIN-001"
}
```

### 6. Support & Error Codes Page (`app/(main)/support/page.tsx`)

Public-facing support page with:
- Searchable error code reference
- Error code explanations in multiple languages
- Contact support form
- FAQ section

**Access:** `/support`

## Integration Points

### App Initialize Error Handlers

In your root layout or App component:

```typescript
'use client';
import { useEffect } from 'react';
import { ErrorLogger } from '@/lib/error-logger';

export default function RootLayout({ children }) {
  useEffect(() => {
    ErrorLogger.initialize();
  }, []);

  return <>{children}</>;
}
```

### Error Boundary Integration

The `AppErrorBoundary` component now:
1. Catches React component errors
2. Logs them via `ErrorLogger`
3. Displays error code to user
4. Offers "Copy Error Code" button

### Global Error Handling

Unhandled errors and promise rejections are automatically caught and logged by `ErrorLogger.initialize()`.

## User Notifications

When an error is logged, the user receives an in-app notification:

**Notification Type:** `'error'`

**Notification Data:**
```typescript
{
  type: 'error',
  title: 'Invalid credentials',  // User-friendly title
  message: 'The email or password you entered is incorrect. (AUTH-LOGIN-001)',
  data: {
    error_code: 'AUTH-LOGIN-001',
    timestamp: '2026-06-22T10:30:00Z',
    action: 'Check your email and password, then try again.'
  }
}
```

## Monitoring & Analytics

### Local Monitoring

Errors are stored in `.data/errors.jsonl` (JSONL format):
```json
{"code":"AUTH-LOGIN-001","message":"Invalid credentials","timestamp":"2026-06-22T10:30:00Z"}
{"code":"API-NETWORK-001","message":"Network timeout","timestamp":"2026-06-22T10:31:00Z"}
...
```

### Team Monitoring Dashboard (Future)

The `/api/errors/log/stats` endpoint provides data for a dashboard showing:
- Total errors by category
- Error frequency trends
- Recent errors
- Patterns (e.g., same error from multiple users)

### Future Integrations

The system is designed to integrate with:
- **Sentry**: Real-time error tracking
- **Datadog**: Infrastructure monitoring
- **Slack**: Team notifications ("5 AUTH-LOGIN errors in the last hour")
- **Database**: Long-term analysis and retention
- **Email**: User confirmations, team alerts

### Adding Integration Example

```typescript
// In app/api/errors/log/route.ts, POST handler:

import { Sentry } from '@sentry/nextjs';
import { sendSlackNotification } from '@/lib/slack';

export async function POST(request: NextRequest) {
  // ... existing code ...
  
  // Send to Sentry
  Sentry.captureException(new Error(error.message), {
    tags: { errorCode: error.code },
    contexts: { error: error.context },
  });
  
  // Alert team if critical
  if (error.context?.severity === 'critical') {
    await sendSlackNotification({
      text: `🚨 CRITICAL ERROR: ${error.code}\n${error.message}`,
      channel: '#alerts'
    });
  }
}
```

## Error Code Reference

See `/support` page or `app/lib/error-codes.ts` for the complete list of defined error codes.

Add new error codes by:
1. Defining in `errorCodes` object in `error-codes.ts`
2. Including EN/NL descriptions
3. Specifying category and severity
4. Optional user action guidance

## Best Practices

1. **Wrap API calls:**
   ```typescript
   try {
     const response = await fetch('/api/data');
     if (!response.ok) {
       await ErrorLogger.logWithCode('API-SERVER-001');
     }
   } catch (error) {
     await ErrorLogger.handleError(error, 'api_call');
   }
   ```

2. **Provide context:**
   ```typescript
   await ErrorLogger.handleError(error, 'quiz_load', {
     userId: user.id,
     quizId: quiz.id,
     locale: locale
   });
   ```

3. **Use known error codes when possible:**
   ```typescript
   // Good
   await ErrorLogger.logWithCode('STUDY-QUIZ-001');
   
   // Fallback if unknown
   await ErrorLogger.handleError(error, 'auto');
   ```

4. **Handle sync failures gracefully:**
   ```typescript
   try {
     await syncData();
   } catch (error) {
     // Log but don't crash
     await ErrorLogger.logWithCode('SYNC-DATA-001');
     // Offer user to retry or continue offline
   }
   ```

## Testing

To test error logging:

1. **Manual error:**
   ```javascript
   // In browser console
   import { ErrorLogger } from '/lib/error-logger.js';
   await ErrorLogger.handleError(new Error('Test error'), 'test');
   ```

2. **Check logs:**
   ```bash
   cat .data/errors.jsonl | tail -5
   ```

3. **Check stats:**
   ```bash
   curl http://localhost:3000/api/errors/log/stats
   ```

4. **Test support form:**
   - Navigate to `/support`
   - Fill and submit contact form
   - Check `.data/contact-messages.jsonl`
