-- ============================================
-- GRADES: SUBJECT-FIRST SUPPORT
-- Phase 2.6b (2/3) of the classes -> subjects data-model migration.
--
-- grade_sets.class_id has been NOT NULL since the grading system's original
-- migration (20250228_grading_system.sql), and every RLS policy on
-- grade_sets/student_grades/grade_history (20260302_harden_grades_security.sql)
-- is gated purely through is_teacher_member_of_class(class_id, ...). That
-- means a standalone (class-less) subject's grade sets would be completely
-- invisible even to the teacher who owns the subject -- not just a missing
-- feature, an RLS lockout. This migration:
--   1. Makes grade_sets.class_id nullable
--   2. Adds is_teacher_of_subject() / subject_id_for_grade_set(), mirroring
--      the existing class-based helper functions
--   3. Re-creates every grade_sets/student_grades/grade_history policy to
--      OR in the subject-based check alongside the original class-based one
--
-- Purely additive to existing behavior: every policy keeps its original
-- class-based branch untouched, this only adds a second way in. A
-- class-linked grade set's access is completely unaffected.
-- ============================================

BEGIN;

-- ============================================
-- 1. RELAX class_id
-- ============================================
ALTER TABLE public.grade_sets ALTER COLUMN class_id DROP NOT NULL;

-- ============================================
-- 2. HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.is_teacher_of_subject(p_subject_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_subject_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = p_subject_id AND s.user_id = p_user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.subject_teachers st
      WHERE st.subject_id = p_subject_id AND st.teacher_id = p_user_id
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.subject_id_for_grade_set(p_grade_set_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gs.subject_id
  FROM public.grade_sets gs
  WHERE gs.id = p_grade_set_id
  LIMIT 1;
$$;

-- ============================================
-- 3. RE-CREATE GRADE_SETS POLICIES
-- ============================================
DROP POLICY IF EXISTS "grade_sets_select_policy" ON public.grade_sets;
CREATE POLICY "grade_sets_select_policy"
ON public.grade_sets
FOR SELECT
USING (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(class_id, auth.uid())
  OR public.is_teacher_of_subject(subject_id, auth.uid())
  OR (
    status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.student_grades sg
      WHERE sg.grade_set_id = grade_sets.id
        AND sg.student_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "grade_sets_insert_policy" ON public.grade_sets;
CREATE POLICY "grade_sets_insert_policy"
ON public.grade_sets
FOR INSERT
WITH CHECK (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(class_id, auth.uid())
  OR public.is_teacher_of_subject(subject_id, auth.uid())
);

DROP POLICY IF EXISTS "grade_sets_update_policy" ON public.grade_sets;
CREATE POLICY "grade_sets_update_policy"
ON public.grade_sets
FOR UPDATE
USING (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(class_id, auth.uid())
  OR public.is_teacher_of_subject(subject_id, auth.uid())
)
WITH CHECK (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(class_id, auth.uid())
  OR public.is_teacher_of_subject(subject_id, auth.uid())
);

DROP POLICY IF EXISTS "grade_sets_delete_policy" ON public.grade_sets;
CREATE POLICY "grade_sets_delete_policy"
ON public.grade_sets
FOR DELETE
USING (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(class_id, auth.uid())
  OR public.is_teacher_of_subject(subject_id, auth.uid())
);

-- ============================================
-- 4. RE-CREATE STUDENT_GRADES POLICIES
-- ============================================
DROP POLICY IF EXISTS "student_grades_select_policy" ON public.student_grades;
CREATE POLICY "student_grades_select_policy"
ON public.student_grades
FOR SELECT
USING (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(public.class_id_for_grade_set(grade_set_id), auth.uid())
  OR public.is_teacher_of_subject(public.subject_id_for_grade_set(grade_set_id), auth.uid())
  OR (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.grade_sets gs
      WHERE gs.id = student_grades.grade_set_id
        AND gs.status = 'published'
    )
  )
);

DROP POLICY IF EXISTS "student_grades_insert_policy" ON public.student_grades;
CREATE POLICY "student_grades_insert_policy"
ON public.student_grades
FOR INSERT
WITH CHECK (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(public.class_id_for_grade_set(grade_set_id), auth.uid())
  OR public.is_teacher_of_subject(public.subject_id_for_grade_set(grade_set_id), auth.uid())
);

DROP POLICY IF EXISTS "student_grades_update_policy" ON public.student_grades;
CREATE POLICY "student_grades_update_policy"
ON public.student_grades
FOR UPDATE
USING (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(public.class_id_for_grade_set(grade_set_id), auth.uid())
  OR public.is_teacher_of_subject(public.subject_id_for_grade_set(grade_set_id), auth.uid())
)
WITH CHECK (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(public.class_id_for_grade_set(grade_set_id), auth.uid())
  OR public.is_teacher_of_subject(public.subject_id_for_grade_set(grade_set_id), auth.uid())
);

DROP POLICY IF EXISTS "student_grades_delete_policy" ON public.student_grades;
CREATE POLICY "student_grades_delete_policy"
ON public.student_grades
FOR DELETE
USING (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(public.class_id_for_grade_set(grade_set_id), auth.uid())
  OR public.is_teacher_of_subject(public.subject_id_for_grade_set(grade_set_id), auth.uid())
);

-- ============================================
-- 5. RE-CREATE GRADE_HISTORY POLICY
-- ============================================
DROP POLICY IF EXISTS "grade_history_select_policy" ON public.grade_history;
CREATE POLICY "grade_history_select_policy"
ON public.grade_history
FOR SELECT
USING (
  public.is_admin_user(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.student_grades sg
    JOIN public.grade_sets gs ON gs.id = sg.grade_set_id
    WHERE sg.id = grade_history.student_grade_id
      AND (
        public.is_teacher_member_of_class(gs.class_id, auth.uid())
        OR public.is_teacher_of_subject(gs.subject_id, auth.uid())
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.student_grades sg
    JOIN public.grade_sets gs ON gs.id = sg.grade_set_id
    WHERE sg.id = grade_history.student_grade_id
      AND sg.student_id = auth.uid()
      AND gs.status = 'published'
  )
);

-- ============================================
-- 6. VERIFICATION
-- ============================================
SELECT 'grades subject-first migration completed' AS status;

COMMIT;
