-- ============================================
-- SUBJECT_TEACHERS + SUBJECT_STUDENTS — subject-level membership
-- Phase 2.3 of the classes -> subjects data-model migration.
--
-- subject_teachers was supposed to already exist (added in
-- 20250218_teacher_collaboration_system.sql), but a live-DB check on
-- 2026-07-22 confirmed it was never actually applied to production
-- (to_regclass('public.subject_teachers') returns NULL), and that migration's
-- own RLS policies reference subjects.owner_id, a column that also doesn't
-- exist live (subjects only has user_id). This migration creates
-- subject_teachers itself (targeting the real live schema, user_id not
-- owner_id) and subject_students (the genuinely new table this phase needs),
-- then backfills subject_students from the existing class-based chain.
--
-- Purely additive: no existing table, column, or RLS policy is touched, and
-- nothing about how the app currently grants subject access changes as a
-- result of running this. subject_teachers/subject_students start as
-- additional, parallel sources of truth, not a replacement for the
-- class-based path.
--
-- Safe to run multiple times: table creation is IF NOT EXISTS, policy
-- creation is guarded with DROP POLICY IF EXISTS first, and the backfill
-- INSERT is ON CONFLICT DO NOTHING.
-- ============================================

-- ============================================
-- 1. CREATE SUBJECT_TEACHERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.subject_teachers (
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner', 'collaborator', 'assistant')),
    permissions JSONB NOT NULL DEFAULT '{
        "can_view": true,
        "can_edit": false,
        "can_grade": false,
        "can_manage_students": false,
        "can_share": false,
        "can_delete": false
    }',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (subject_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_teachers_subject_id ON public.subject_teachers(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_teachers_teacher_id ON public.subject_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subject_teachers_role ON public.subject_teachers(role);

ALTER TABLE public.subject_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_teachers_select_policy" ON subject_teachers;
CREATE POLICY "subject_teachers_select_policy" ON subject_teachers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_teachers.subject_id
            AND s.user_id = auth.uid()
        )
        OR teacher_id = auth.uid()
    );

DROP POLICY IF EXISTS "subject_teachers_insert_policy" ON subject_teachers;
CREATE POLICY "subject_teachers_insert_policy" ON subject_teachers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_teachers.subject_id
            AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "subject_teachers_update_policy" ON subject_teachers;
CREATE POLICY "subject_teachers_update_policy" ON subject_teachers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_teachers.subject_id
            AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "subject_teachers_delete_policy" ON subject_teachers;
CREATE POLICY "subject_teachers_delete_policy" ON subject_teachers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_teachers.subject_id
            AND s.user_id = auth.uid()
        )
    );

-- ============================================
-- 2. CREATE SUBJECT_STUDENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.subject_students (
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Records how this row came to exist:
    --   class_link  -- backfilled from / derived from an existing class_members relationship
    --   direct_join -- student joined the subject directly via a subject join code (Phase 2.5)
    --   manual      -- a teacher added the student directly
    source TEXT NOT NULL DEFAULT 'class_link' CHECK (source IN ('class_link', 'direct_join', 'manual')),
    PRIMARY KEY (subject_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_students_subject_id ON public.subject_students(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_students_student_id ON public.subject_students(student_id);
CREATE INDEX IF NOT EXISTS idx_subject_students_source ON public.subject_students(source);

ALTER TABLE public.subject_students ENABLE ROW LEVEL SECURITY;

-- Select: the student themself, the subject owner, or any subject_teachers member.
DROP POLICY IF EXISTS "subject_students_select_policy" ON subject_students;
CREATE POLICY "subject_students_select_policy" ON subject_students
    FOR SELECT USING (
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
        )
    );

-- Insert: subject owner, or a subject_teachers member with can_manage_students.
-- (Student self-enrollment via join code is added in Phase 2.5, alongside
-- the join endpoint -- not opened here since that flow doesn't exist yet.)
DROP POLICY IF EXISTS "subject_students_insert_policy" ON subject_students;
CREATE POLICY "subject_students_insert_policy" ON subject_students
    FOR INSERT WITH CHECK (
        EXISTS (
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

-- Delete: the student themself (leave), subject owner, or a subject_teachers
-- member with can_manage_students.
DROP POLICY IF EXISTS "subject_students_delete_policy" ON subject_students;
CREATE POLICY "subject_students_delete_policy" ON subject_students
    FOR DELETE USING (
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
-- 3. BACKFILL SUBJECT_STUDENTS
-- Every (subject, student) pair reachable today via the class-based chain:
-- class_members -> subjects.class_id OR class_subjects join.
--
-- "Is this class member a student" mirrors getClassPermission()'s own
-- logic (app/lib/auth/class-permissions.ts): exclude class_members.role
-- values that mean teacher, AND exclude profiles.subscription_type =
-- 'teacher' as a fallback for legacy/missing per-class roles.
--
-- subject_teachers is NOT backfilled here -- current teacher access to
-- class-linked subjects already works via subjects.user_id ownership /
-- the class_members fallback in the existing permission-check code, so an
-- empty subject_teachers table changes nothing for existing users. It's
-- a genuinely new table meant to be populated going forward (e.g. Phase
-- 2.5's collaboration features), not a backfill target.
-- ============================================
INSERT INTO public.subject_students (subject_id, student_id, source)
SELECT DISTINCT subj_link.subject_id, cm.user_id, 'class_link'
FROM class_members cm
JOIN profiles p ON p.id = cm.user_id
JOIN (
    SELECT cs.class_id, cs.subject_id FROM class_subjects cs
    UNION
    SELECT s.class_id, s.id AS subject_id FROM subjects s WHERE s.class_id IS NOT NULL
) subj_link ON subj_link.class_id = cm.class_id
WHERE LOWER(COALESCE(cm.role, '')) NOT IN ('teacher', 'owner', 'admin', 'creator', 'ta')
  AND COALESCE(p.subscription_type, 'student') <> 'teacher'
ON CONFLICT (subject_id, student_id) DO NOTHING;

-- ============================================
-- 4. VERIFICATION
-- ============================================
SELECT 'subject_teachers + subject_students migration completed' AS status;
SELECT count(*) AS backfilled_rows FROM public.subject_students WHERE source = 'class_link';
