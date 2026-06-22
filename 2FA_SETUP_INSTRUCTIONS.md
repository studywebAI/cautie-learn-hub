# 2FA/TOTP Setup Instructions

This document provides manual setup instructions for the Two-Factor Authentication (2FA) implementation added in this session.

## What Was Implemented

1. **TOTP Secret Generation & Enrollment** — Users can enroll in 2FA from Settings → Two-Factor Auth tab
2. **TOTP Verification at Login** — After password verification, users with 2FA enabled must verify a code
3. **2FA Disable Flow** — Users can disable 2FA with TOTP verification
4. **Google OAuth Status Display** — Account settings show linked OAuth providers

## Database Setup (Required)

### Create the `user_2fa_secrets` table

Run this SQL in your Supabase dashboard (SQL Editor):

```sql
-- Create user_2fa_secrets table to store TOTP secrets
CREATE TABLE IF NOT EXISTS public.user_2fa_secrets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  totp_secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.user_2fa_secrets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own 2FA secrets"
  ON public.user_2fa_secrets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own 2FA secrets"
  ON public.user_2fa_secrets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own 2FA secrets"
  ON public.user_2fa_secrets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own 2FA secrets"
  ON public.user_2fa_secrets FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_user_2fa_secrets_user_id ON public.user_2fa_secrets(user_id);
```

The SQL file is also available at `/sql/20260622_user_2fa_secrets.sql`.

## API Endpoints

### `POST /api/auth/2fa/enroll`
- **Purpose**: Generate a TOTP secret and QR code
- **Auth**: Requires authenticated session
- **Response**: `{ success: true, secret: string, qrCode: string }`

### `POST /api/auth/2fa/verify-enroll`
- **Purpose**: Verify TOTP code and save secret (complete enrollment)
- **Payload**: `{ secret: string, code: string }`
- **Response**: `{ success: true, message: string }`

### `POST /api/auth/2fa/disable`
- **Purpose**: Disable 2FA after verifying current TOTP code
- **Payload**: `{ code: string }`
- **Response**: `{ success: true, message: string }`

### `GET /api/auth/2fa/status`
- **Purpose**: Check if 2FA is enabled for current user
- **Auth**: Requires authenticated session
- **Response**: `{ enabled: boolean }`

### `POST /api/auth/2fa/verify-login`
- **Purpose**: Verify TOTP code during login flow (after password verification)
- **Payload**: `{ email: string, code: string }`
- **Response**: `{ success: true, message: string }`

## UI Components

### `TwoFASetup` Component
- **File**: `app/components/settings/2fa-setup.tsx`
- **Usage**: Renders enrollment and disable flows in a Card
- **Props**: `isDutch?: boolean` (for Dutch language support)
- **Features**:
  - Enrollment with QR code display
  - Manual secret entry option
  - 6-digit code verification
  - Disable flow with verification

### Updated Settings Page
- **File**: `app/(main)/settings/page.tsx`
- **Changes**:
  - Added "Two-Factor Auth" tab to tab navigation
  - Integrated `<TwoFASetup />` component
  - Added Google OAuth provider display in Account tab
  - Shows "Connected: Google (email@example.com)" if user signed in with Google

### Updated Auth Form
- **File**: `app/components/auth-form.tsx`
- **Changes**:
  - Added `'totp-challenge'` step to login flow
  - After successful password verification, checks if 2FA is enabled
  - If enabled, shows TOTP code input before email verification
  - Flow: credentials → 2FA (if enabled) → email verification

## User Flow

### Enabling 2FA
1. User goes to Settings → Two-Factor Auth
2. Clicks "Enable 2FA"
3. System generates TOTP secret and displays QR code
4. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
5. User enters 6-digit code from authenticator app
6. Code is verified server-side and secret is saved
7. 2FA is now enabled

### Login with 2FA
1. User enters email + password
2. Credentials are verified
3. System checks if user has 2FA enabled
4. If enabled: Show TOTP prompt (before email verification)
5. User enters 6-digit code from authenticator app
6. Code is verified server-side
7. User continues to email verification step
8. Login completes after email verification

### Disabling 2FA
1. User goes to Settings → Two-Factor Auth
2. Clicks "Disable 2FA"
3. User enters 6-digit code from authenticator app
4. Code is verified server-side
5. 2FA is disabled

## Notes on Implementation

### TOTP Storage
- TOTP secrets are stored in the `user_2fa_secrets` table
- Secrets are base32-encoded (Speakeasy format)
- Each user has at most one active TOTP secret (UNIQUE constraint on user_id)

### RLS Security
- Table has Row-Level Security enabled
- Users can only access their own 2FA data
- No cross-user access possible

### Email-Based User Lookup in Login
⚠️ **Current Limitation**: The `verify-login` endpoint cannot directly look up a user by email because:
- Anon client cannot query `auth.users` directly
- We use a simplified approach that checks all enabled TOTP secrets

**Recommendation**: For production, use a Supabase Service Role client or create a custom function that can safely lookup users by email without exposing all secrets.

## Packages Added
- `speakeasy@^2.0.0` — TOTP secret generation and verification
- `@types/speakeasy` — TypeScript types for speakeasy

Both are already in `package.json` after `npm install speakeasy @types/speakeasy`.

## Testing Checklist

- [ ] SQL migration runs without errors in Supabase dashboard
- [ ] User can navigate to Settings → Two-Factor Auth tab
- [ ] User can click "Enable 2FA" and see QR code
- [ ] User can manually copy the secret
- [ ] User can enter 6-digit code and complete enrollment
- [ ] User can see "Enabled" status after enrollment
- [ ] User can verify secret works by entering code
- [ ] On login, user with 2FA enabled sees TOTP prompt
- [ ] Invalid TOTP code shows error
- [ ] Valid TOTP code allows progression to email verification
- [ ] User can disable 2FA with valid code
- [ ] User cannot disable 2FA with invalid code
- [ ] Google OAuth users see "Connected: Google" in Account settings
- [ ] All new code passes `npx tsc --noEmit` and `npx eslint`

## Troubleshooting

### QR Code Not Displaying
- Check browser console for CORS errors
- Verify `qrcode` package is installed (`npm list qrcode`)
- Check that `Image` component from `next/image` is properly imported

### TOTP Codes Not Verifying
- Ensure server time is synced (TOTP uses time-based codes)
- Verify secret is base32-encoded correctly
- Check that authenticator app shows 6-digit codes
- Try code immediately after generation (30-second window)

### Login Flow Not Progressing
- Check browser console for API errors
- Verify user_2fa_secrets table exists in Supabase
- Confirm RLS policies are enabled and correct
- Check Network tab to see API response data

## Future Enhancements

1. **Backup Codes**: Generate recovery codes when enabling 2FA
2. **Device Trusted**: Allow users to skip 2FA on trusted devices
3. **Multiple TOTP Devices**: Let users register multiple authenticator devices
4. **Proper Email Lookup**: Use service role client for secure user lookup in verify-login
5. **2FA Recovery Flow**: Add account recovery mechanism if user loses authenticator

---

**Last Updated**: June 22, 2026  
**Session**: `claude/session-nANUa`
