-- Ensure PostgREST can resolve submissions -> assignments relationship.
-- This fixes errors like:
-- PGRST200: Could not find a relationship between 'submissions' and 'assignments'

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'assignments'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submissions'
      AND column_name = 'assignment_id'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'submissions'
      AND tc.constraint_name = 'submissions_assignment_id_fkey'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.submissions
      ADD CONSTRAINT submissions_assignment_id_fkey
      FOREIGN KEY (assignment_id)
      REFERENCES public.assignments(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- Keep lookup fast for joins and FK checks.
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id
  ON public.submissions(assignment_id);

-- Try to validate if existing data is clean.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'submissions'
      AND tc.constraint_name = 'submissions_assignment_id_fkey'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    BEGIN
      ALTER TABLE public.submissions
        VALIDATE CONSTRAINT submissions_assignment_id_fkey;
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'submissions_assignment_id_fkey exists but could not be validated due to legacy data.';
    END;
  END IF;
END $$;

