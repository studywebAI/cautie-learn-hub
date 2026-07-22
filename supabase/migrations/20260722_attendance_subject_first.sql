-- ============================================
-- ATTENDANCE: SUBJECT-FIRST SUPPORT
-- Phase 2.7 of the classes -> subjects data-model migration.
--
-- Of the four class-only tables flagged in Phase 2 planning (attendance,
-- grading_categories, rubrics, announcements), a live-usage check found
-- rubrics and announcements have zero callers anywhere in app/api or
-- app/components (dead legacy tables from an old schema dump), and
-- grading_categories has exactly one route with zero UI callers (also
-- effectively dead). Only student_attendance is genuinely live -- this
-- migration covers that one table; the other three are left untouched.
--
-- student_attendance.class_id has been NOT NULL since
-- 20250221_attendance_system.sql, and its RLS policies are gated purely
-- through class ownership/class_members -- the same lockout pattern
-- already fixed for grades and agenda. This migration:
--   1. Makes student_attendance.class_id nullable, adds subject_id
--   2. Re-creates its RLS policies to OR in the subject-based check
--      (reusing is_teacher_of_subject()/is_member_of_subject() from the
--      grades/agenda migrations)
--
-- Purely additive: the original class-based branch is untouched.
-- ============================================

BEGIN;

ALTER TABLE public.student_attendance ALTER COLUMN class_id DROP NOT NULL;
ALTER TABLE public.student_attendance ADD COLUMN IF NOT EXISTS subject_id uuid NULL REFERENCES public.subjects(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "attendance_all_teachers" ON public.student_attendance;
CREATE POLICY "attendance_all_teachers" ON public.student_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = student_attendance.class_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = student_attendance.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'owner')
    )
    OR public.is_teacher_of_subject(subject_id, auth.uid())
  );

-- Student can see their own attendance (unchanged, already class-agnostic).
DROP POLICY IF EXISTS "attendance_student_own" ON public.student_attendance;
CREATE POLICY "attendance_student_own" ON public.student_attendance
  FOR SELECT USING (auth.uid() = student_id);

SELECT 'attendance subject-first migration completed' AS status;

COMMIT;
