-- Fix missing relationship used by PostgREST joins:
-- class_members.user_id -> profiles.id
--
-- Run this in Supabase SQL Editor.
-- It is idempotent and safe to re-run.

BEGIN;

-- 1) Ensure supporting index exists for lookup performance.
CREATE INDEX IF NOT EXISTS idx_class_members_user_id
  ON public.class_members(user_id);

-- 2) Add FK from class_members.user_id to profiles.id if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'class_members_user_id_profiles_fkey'
      AND conrelid = 'public.class_members'::regclass
  ) THEN
    ALTER TABLE public.class_members
      ADD CONSTRAINT class_members_user_id_profiles_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- 3) Try to validate existing rows. If invalid legacy rows exist, keep constraint NOT VALID.
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.class_members
      VALIDATE CONSTRAINT class_members_user_id_profiles_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint class_members_user_id_profiles_fkey could not be validated yet: %', SQLERRM;
    RAISE NOTICE 'Run the orphan check below, clean bad rows, then validate again.';
  END;
END $$;

COMMIT;

-- Optional checks:
-- A) Verify FK exists:
SELECT
  conname AS constraint_name,
  convalidated AS is_validated
FROM pg_constraint
WHERE conrelid = 'public.class_members'::regclass
  AND conname = 'class_members_user_id_profiles_fkey';

-- B) Find orphan memberships that block validation:
SELECT cm.*
FROM public.class_members cm
LEFT JOIN public.profiles p ON p.id = cm.user_id
WHERE p.id IS NULL;

