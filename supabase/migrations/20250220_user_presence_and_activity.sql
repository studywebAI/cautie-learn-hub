-- Simple presence tracking: add last_seen to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now();

-- Create index for efficient last_seen queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen);

-- Add updated_at column to profiles for tracking last activity
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create function to update last_seen
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_seen
DROP TRIGGER IF EXISTS update_last_seen_trigger ON public.profiles;
CREATE TRIGGER update_last_seen_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();
