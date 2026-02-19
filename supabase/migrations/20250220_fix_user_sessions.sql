-- Fix: Add is_active column to user_sessions if it doesn't exist
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Recreate the index (will fail silently if already exists)
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active) WHERE is_active = true;
