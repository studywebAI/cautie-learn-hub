-- ============================================
-- GRADING PRESETS: SUBJECT-FIRST SUPPORT
-- Final gap-close of the classes -> subjects data-model migration.
--
-- class_grading_presets backs BOTH grading templates (scale conversion)
-- AND category weights (a singleton row with
-- config.templateType='category_weights') -- there is no separate
-- category-weights table. class_id has been NOT NULL since
-- 20260302_grading_presets_and_flexible_scores.sql, with RLS gated purely
-- through class membership. This migration:
--   1. Makes class_grading_presets.class_id nullable, adds subject_id
--   2. Re-creates its RLS policies to OR in is_teacher_of_subject()
--      (reused from the grades/agenda/attendance migrations)
--
-- Purely additive: the original class-based branch is untouched.
-- ============================================

BEGIN;

ALTER TABLE public.class_grading_presets ALTER COLUMN class_id DROP NOT NULL;
ALTER TABLE public.class_grading_presets ADD COLUMN IF NOT EXISTS subject_id uuid NULL REFERENCES public.subjects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_class_grading_presets_subject_id
  ON public.class_grading_presets(subject_id);

-- Re-create RLS policies (originals were added directly in
-- 20260302_grading_presets_and_flexible_scores.sql without a helper
-- function -- inline class_members checks, mirrored here with an
-- is_teacher_of_subject() OR-branch added).
ALTER TABLE public.class_grading_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_grading_presets_select" ON public.class_grading_presets;
CREATE POLICY "class_grading_presets_select"
ON public.class_grading_presets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.class_members cm
    WHERE cm.class_id = class_grading_presets.class_id AND cm.user_id = auth.uid()
  )
  OR public.is_teacher_of_subject(subject_id, auth.uid())
);

DROP POLICY IF EXISTS "class_grading_presets_insert" ON public.class_grading_presets;
CREATE POLICY "class_grading_presets_insert"
ON public.class_grading_presets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.class_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.class_id = class_grading_presets.class_id
      AND cm.user_id = auth.uid()
      AND p.subscription_type = 'teacher'
  )
  OR public.is_teacher_of_subject(subject_id, auth.uid())
);

DROP POLICY IF EXISTS "class_grading_presets_update" ON public.class_grading_presets;
CREATE POLICY "class_grading_presets_update"
ON public.class_grading_presets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.class_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.class_id = class_grading_presets.class_id
      AND cm.user_id = auth.uid()
      AND p.subscription_type = 'teacher'
  )
  OR public.is_teacher_of_subject(subject_id, auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.class_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.class_id = class_grading_presets.class_id
      AND cm.user_id = auth.uid()
      AND p.subscription_type = 'teacher'
  )
  OR public.is_teacher_of_subject(subject_id, auth.uid())
);

DROP POLICY IF EXISTS "class_grading_presets_delete" ON public.class_grading_presets;
CREATE POLICY "class_grading_presets_delete"
ON public.class_grading_presets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.class_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.class_id = class_grading_presets.class_id
      AND cm.user_id = auth.uid()
      AND p.subscription_type = 'teacher'
  )
  OR public.is_teacher_of_subject(subject_id, auth.uid())
);

SELECT 'grading presets subject-first migration completed' AS status;

COMMIT;
