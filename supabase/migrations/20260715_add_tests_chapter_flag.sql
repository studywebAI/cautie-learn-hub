-- =============================================
-- Toetsen-hoofdstuk: marks a chapter as a subject's dedicated tests chapter
-- Date: 2026-07-15
-- Context: docs/subjects-feature-brainstorm.md section A/G (toetsen-hoofdstuk)
-- =============================================

BEGIN;

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS is_tests_chapter boolean NOT NULL DEFAULT false;

-- At most one tests chapter per subject.
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_tests_chapter_unique
  ON public.chapters(subject_id)
  WHERE is_tests_chapter = true;

COMMENT ON COLUMN public.chapters.is_tests_chapter IS
  'Marks this chapter as the subject''s dedicated tests chapter (docs/subjects-feature-brainstorm.md). At most one per subject, enforced by idx_chapters_tests_chapter_unique.';

COMMIT;
