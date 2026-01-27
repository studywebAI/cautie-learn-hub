-- Add email column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing profiles with email from auth.users (if accessible)
-- Note: This requires admin privileges to access auth.users
-- For now, we'll leave existing records with NULL email and populate on login

-- Optional: Add a comment for documentation
COMMENT ON COLUMN profiles.email IS 'User email address, populated from auth.users on login';