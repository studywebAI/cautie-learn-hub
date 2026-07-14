-- =============================================
-- Link grade_sets to the assignment (test) they came from
-- Date: 2026-07-14
-- Context: docs/grades-feature-brainstorm.md, section J (point 14)
-- =============================================

BEGIN;

-- A grade set can now originate from a test/assignment instead of always
-- being created by hand. Nullable + ON DELETE SET NULL so manually-created
-- grade sets (oral exams etc.) keep working exactly as before.
ALTER TABLE public.grade_sets
  ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL;

-- One grade set per test: the "get or create" flow that auto-creates a
-- grade_sets row when the first attempt comes in must be idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_grade_sets_assignment_id_unique
  ON public.grade_sets(assignment_id)
  WHERE assignment_id IS NOT NULL;

-- Two separate release actions (nakijkresultaten vs. cijfer), decided in
-- docs/grades-feature-brainstorm.md section H point 4/9.
ALTER TABLE public.grade_sets
  ADD COLUMN IF NOT EXISTS answers_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS grade_released_at timestamptz;

COMMENT ON COLUMN public.grade_sets.assignment_id IS 'Test/assignment this grade set was auto-created from, if any. Null for manually-created grade sets.';
COMMENT ON COLUMN public.grade_sets.answers_released_at IS 'When the teacher released per-question correct/incorrect results to students. Independent from grade_released_at.';
COMMENT ON COLUMN public.grade_sets.grade_released_at IS 'When the teacher released the final grade to students. Independent from answers_released_at.';

-- grade_sets.status has no CHECK constraint (plain text), so the new
-- 'grading' state (nakijken in progress, before a grade exists) needs no
-- schema change — just documenting the now-wider set of values here.
COMMENT ON COLUMN public.grade_sets.status IS 'draft, grading, published (see docs/grades-feature-brainstorm.md)';

COMMIT;
