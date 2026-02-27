-- Check if classes table still has owner_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'classes' 
ORDER BY ordinal_position;

-- Check if owner_id column exists and needs to be removed
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'classes' AND column_name = 'owner_id';

-- Check current RLS policies on classes
SELECT polname, polcmd, polqual::text, polwithcheck::text 
FROM pg_policy 
WHERE polrelid = 'classes'::regclass;

-- If owner_id exists, remove it
ALTER TABLE public.classes DROP COLUMN IF EXISTS owner_id;

-- Verify the column is removed
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'classes' 
ORDER BY ordinal_position;