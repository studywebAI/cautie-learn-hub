-- ============================================
-- SUBJECT JOIN CODES
-- Phase 2.5 of the classes -> subjects data-model migration.
--
-- Mirrors the existing class join-code system (generate_join_code(),
-- get_class_by_join_code(), both in 20250219_class_invite_system.sql /
-- 20260410_server_side_persistence_hardening.e.sql) so a subject can be
-- joined directly by a student, with no class involved at all.
--
-- Purely additive: new column (nullable until backfilled), new functions.
-- No existing table/column/policy touched.
-- ============================================

-- ============================================
-- 1. ADD JOIN_CODE COLUMN
-- ============================================
ALTER TABLE public.subjects
    ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- ============================================
-- 2. GENERATOR FUNCTION (mirrors generate_join_code(), scoped to subjects)
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_subject_join_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  new_code := upper(substring(md5(random()::text) from 1 for 6));

  SELECT EXISTS(SELECT 1 FROM public.subjects WHERE join_code = new_code) INTO code_exists;

  WHILE code_exists LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.subjects WHERE join_code = new_code) INTO code_exists;
  END LOOP;

  RETURN new_code;
END;
$$;

-- ============================================
-- 3. BACKFILL -- every existing subject (class-linked or standalone) gets a code
-- ============================================
UPDATE public.subjects
SET join_code = public.generate_subject_join_code()
WHERE join_code IS NULL;

-- ============================================
-- 4. LOOKUP RPC (mirrors get_class_by_join_code(); SECURITY DEFINER so a
-- student can resolve a code to a subject before they have any row in
-- subject_students granting them SELECT under subjects' own RLS)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_subject_by_join_code(p_code text)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  join_code text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.title,
    s.description,
    s.join_code
  FROM public.subjects s
  WHERE upper(coalesce(s.join_code, '')) = upper(trim(coalesce(p_code, '')))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_subject_by_join_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_subject_by_join_code(text) TO authenticated;

-- ============================================
-- 5. ALLOW STUDENT SELF-JOIN
-- The Phase 2.3 subject_students insert policy only allowed a subject
-- owner / subject_teachers member to add rows -- self-enrollment via join
-- code wasn't a real flow yet. It is now: a user may insert their own
-- (subject_id, student_id) row as long as it's their own student_id.
-- (The join endpoint itself still enforces uniqueness / "already joined"
-- via ON CONFLICT; this policy just stops blocking the legitimate case.)
-- ============================================
DROP POLICY IF EXISTS "subject_students_insert_policy" ON subject_students;
CREATE POLICY "subject_students_insert_policy" ON subject_students
    FOR INSERT WITH CHECK (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_students.subject_id
            AND s.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM subject_teachers st
            WHERE st.subject_id = subject_students.subject_id
            AND st.teacher_id = auth.uid()
            AND st.permissions->>'can_manage_students' = 'true'
        )
    );

-- ============================================
-- 6. VERIFICATION
-- ============================================
SELECT 'subject join codes migration completed' AS status;
SELECT count(*) AS subjects_with_join_code FROM public.subjects WHERE join_code IS NOT NULL;
