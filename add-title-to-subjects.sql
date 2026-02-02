-- Add title field to subjects table if it doesn't exist
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';

-- Make class_id column nullable
ALTER TABLE public.subjects
ALTER COLUMN class_id DROP NOT NULL;

-- Create index on title for better performance
CREATE INDEX IF NOT EXISTS idx_subjects_title ON public.subjects(title);

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subjects' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any subjects without a title
SELECT id, title, class_id
FROM public.subjects
WHERE title IS NULL OR title = ''
LIMIT 5;

-- Update any subjects with empty title (optional)
UPDATE public.subjects
SET title = 'Untitled Subject'
WHERE title IS NULL OR title = '';