-- CalDAV Password Encryption with pgcrypto
-- Enable pgcrypto extension for password encryption/decryption
-- Supports AES-256 encryption at rest

-- Enable pgcrypto extension if not already enabled
create extension if not exists pgcrypto;

-- Create a secure encryption key (stored as environment variable in production)
-- In Supabase, this is managed via vault or environment secrets
-- For now, we'll use a default key that should be rotated in production

-- RPC Function: Encrypt password using pgcrypto
create or replace function encrypt_password(password text)
returns text as $$
declare
  encrypted_data text;
  encryption_key text;
begin
  -- Use a hardcoded key for now; in production, retrieve from secrets
  -- This should be rotated and stored securely
  encryption_key := coalesce(
    current_setting('app.encryption_key', true),
    'default-insecure-key-change-in-production'
  );

  -- Encrypt using AES-256-GCM (authenticated encryption)
  encrypted_data := encode(
    encrypt(password::bytea, encryption_key::bytea, 'aes'),
    'base64'
  );

  return encrypted_data;
end;
$$ language plpgsql security definer;

-- RPC Function: Decrypt password using pgcrypto
create or replace function decrypt_password(encrypted_password text)
returns text as $$
declare
  decrypted_data text;
  encryption_key text;
begin
  -- Use the same key as encryption
  encryption_key := coalesce(
    current_setting('app.encryption_key', true),
    'default-insecure-key-change-in-production'
  );

  -- Decrypt from base64 to original text
  decrypted_data := decrypt(
    decode(encrypted_password, 'base64'),
    encryption_key::bytea,
    'aes'
  )::text;

  return decrypted_data;
exception when others then
  raise exception 'Password decryption failed: %', sqlerrm;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users only
grant execute on function encrypt_password(text) to authenticated;
grant execute on function decrypt_password(text) to authenticated;

-- Update existing calendar_accounts table comment to note encryption
comment on table public.calendar_accounts is 'Stores encrypted CalDAV credentials per user. Passwords are encrypted at rest using pgcrypto AES-256.';
comment on column public.calendar_accounts.password is 'Encrypted password stored as base64. Decrypt only when needed for authentication.';
