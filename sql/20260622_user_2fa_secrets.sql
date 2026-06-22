-- Create user_2fa_secrets table to store TOTP secrets
-- This table stores user TOTP secrets for 2FA enrollment

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

-- Policy: Users can only view their own 2FA status
CREATE POLICY "Users can view their own 2FA secrets"
  ON public.user_2fa_secrets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own 2FA secrets
CREATE POLICY "Users can insert their own 2FA secrets"
  ON public.user_2fa_secrets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own 2FA secrets
CREATE POLICY "Users can update their own 2FA secrets"
  ON public.user_2fa_secrets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can only delete their own 2FA secrets
CREATE POLICY "Users can delete their own 2FA secrets"
  ON public.user_2fa_secrets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index on user_id for faster lookups
CREATE INDEX idx_user_2fa_secrets_user_id ON public.user_2fa_secrets(user_id);
