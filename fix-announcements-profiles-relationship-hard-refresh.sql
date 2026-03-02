-- Hard fix for PostgREST relationship:
-- announcements.created_by -> profiles.id
--
-- Use this if PGRST200 still appears after running the previous fix.
-- Run in Supabase SQL Editor.

BEGIN;

-- 0) Quick metadata snapshot
SELECT
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'announcements'
  AND c.column_name IN ('id', 'created_by');

SELECT
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'profiles'
  AND c.column_name = 'id';

-- 1) Ensure index exists
CREATE INDEX IF NOT EXISTS idx_announcements_created_by
  ON public.announcements(created_by);

-- 2) Drop any existing FK with the expected name (might point to wrong table/schema)
ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_created_by_fkey;

-- 3) Recreate FK exactly as API join hint expects
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE
  NOT VALID;

-- 4) Validate if possible (if legacy bad rows exist, keep NOT VALID and report)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.announcements
      VALIDATE CONSTRAINT announcements_created_by_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Validation failed for announcements_created_by_fkey: %', SQLERRM;
    RAISE NOTICE 'Clean orphan rows below, then validate manually.';
  END;
END $$;

COMMIT;

-- 5) Force PostgREST schema cache reload (supported on Supabase PostgREST)
NOTIFY pgrst, 'reload schema';

-- 6) Verification
SELECT
  con.conname AS constraint_name,
  con.convalidated AS is_validated,
  con.conrelid::regclass AS source_table,
  con.confrelid::regclass AS target_table
FROM pg_constraint con
WHERE con.conname = 'announcements_created_by_fkey'
  AND con.conrelid = 'public.announcements'::regclass;

-- 7) Orphan rows that block validation
SELECT a.*
FROM public.announcements a
LEFT JOIN public.profiles p ON p.id = a.created_by
WHERE p.id IS NULL;

