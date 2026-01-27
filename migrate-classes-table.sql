-- Add missing columns to classes table to match the current API expectations
-- Run this in your Supabase SQL editor

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS status text;

-- Update existing records to set user_id where owner_id exists
UPDATE public.classes SET user_id = owner_id WHERE owner_id IS NOT NULL AND user_id IS NULL;

-- Optional: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON public.classes(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON public.classes(status);