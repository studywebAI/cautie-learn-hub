-- Backend Schema Alignment Migration
-- Safe operations that can be run multiple times

-- Ensure paragraph_id is NOT NULL
ALTER TABLE public.assignments ALTER COLUMN paragraph_id SET NOT NULL;

-- Recreate unique index
DROP INDEX IF EXISTS idx_assignments_unique;
CREATE UNIQUE INDEX idx_assignments_unique ON public.assignments(paragraph_id, assignment_index);

-- Add id column to class_members (safe to run multiple times)
ALTER TABLE public.class_members ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
UPDATE public.class_members SET id = gen_random_uuid() WHERE id IS NULL AND id = gen_random_uuid()::uuid;
ALTER TABLE public.class_members DROP CONSTRAINT IF EXISTS class_members_pkey;
ALTER TABLE public.class_members ADD CONSTRAINT class_members_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_members_unique ON public.class_members(class_id, user_id);

SELECT 'Schema alignment completed' as status;