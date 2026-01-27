-- Add missing columns to profiles table
-- These columns are expected by the app but missing from the current schema

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'pastel',
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
ADD COLUMN IF NOT EXISTS high_contrast boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dyslexia_font boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reduced_motion boolean DEFAULT false;

-- Verify columns were added
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
AND column_name IN ('theme', 'language', 'high_contrast', 'dyslexia_font', 'reduced_motion')
ORDER BY column_name;

-- Check current profile data
SELECT * FROM public.profiles WHERE id = auth.uid();