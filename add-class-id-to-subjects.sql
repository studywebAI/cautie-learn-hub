-- Add class_id field to subjects table if it doesn't exist
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

-- Force PostgREST to reload schema to pick up the new column
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subjects' AND table_schema = 'public'
ORDER BY ordinal_position;