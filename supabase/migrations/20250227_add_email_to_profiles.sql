-- Add email column to profiles for teacher collaboration lookup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Create a function to handle email sync from auth.users
-- This will be called by a trigger on profile insert/update
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Get email from auth.users
  SELECT email INTO NEW.email
  FROM auth.users
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync email on profile insert
DROP TRIGGER IF EXISTS trigger_sync_profile_email ON profiles;
CREATE TRIGGER trigger_sync_profile_email
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email();
