-- Fix missing relationship used by PostgREST join:
-- announcements.created_by -> profiles.id
--
-- Run this in Supabase SQL Editor.
-- Safe to re-run.

BEGIN;

-- 1) Ensure supporting index exists.
CREATE INDEX IF NOT EXISTS idx_announcements_created_by
  ON public.announcements(created_by);

-- 2) Create FK with the exact name referenced by API join:
-- profiles!announcements_created_by_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'announcements_created_by_fkey'
      AND conrelid = 'public.announcements'::regclass
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT announcements_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- 3) Attempt validation (keeps NOT VALID if old orphan rows exist).
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.announcements
      VALIDATE CONSTRAINT announcements_created_by_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not validate announcements_created_by_fkey: %', SQLERRM;
    RAISE NOTICE 'Run orphan check below, clean rows, then validate again.';
  END;
END $$;

COMMIT;

-- Optional verification:
SELECT
  conname AS constraint_name,
  convalidated AS is_validated
FROM pg_constraint
WHERE conrelid = 'public.announcements'::regclass
  AND conname = 'announcements_created_by_fkey';

-- Optional orphan check:
SELECT a.*
FROM public.announcements a
LEFT JOIN public.profiles p ON p.id = a.created_by
WHERE p.id IS NULL;

