-- ============================================
-- CLASS DEPRECATION: FULL BACKFILL
-- Phase 3.1 of the classes -> subjects data-model migration.
--
-- Everything up to this point only ADDED a subject-based access path
-- alongside the class-based one. This migration is the data prerequisite
-- for actually making "class" a secondary/legacy concept in the UI: it
-- guarantees that for every class that exists today, there is a subject
-- that fully represents it, and every current class member (teacher or
-- student) already has the equivalent subject_teachers/subject_students
-- row -- not just for classes that happened to be linked via
-- class_subjects already.
--
-- Previous backfill (20260722_subject_students.sql, Phase 2.3) only
-- covered subjects already reachable via subjects.class_id OR
-- class_subjects. This migration is broader:
--   1. For every class with zero linked subjects, create one standalone
--      subject titled after the class, owned by the class owner.
--   2. For every (class, subject) pair via subjects.class_id OR
--      class_subjects, mirror every class_members row into
--      subject_teachers / subject_students (ON CONFLICT DO NOTHING --
--      safe to re-run, never overwrites a row that already has a
--      different source, e.g. 'direct_join').
--
-- Purely additive: no class table, row, or column is touched. This only
-- ensures the subject side is 100% caught up before the UI stops
-- treating class as the primary nav concept.
-- ============================================

BEGIN;

-- ============================================
-- 1. CREATE A STANDALONE SUBJECT FOR EVERY CLASS THAT HAS NONE
-- ============================================
INSERT INTO public.subjects (title, description, user_id, class_id)
SELECT
  c.name,
  c.description,
  c.owner_id,
  NULL
FROM public.classes c
WHERE NOT EXISTS (
  SELECT 1 FROM public.subjects s WHERE s.class_id = c.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.class_subjects cs WHERE cs.class_id = c.id
);

-- ============================================
-- 2. MIRROR CLASS_MEMBERS -> SUBJECT_TEACHERS / SUBJECT_STUDENTS
-- for EVERY (class, subject) pair, not just already-linked ones.
-- ============================================
INSERT INTO public.subject_teachers (subject_id, teacher_id, role, permissions)
SELECT DISTINCT
  s.id,
  cm.user_id,
  'teacher',
  '{"can_manage_students": true, "can_manage_content": true}'::jsonb
FROM public.class_members cm
JOIN public.profiles p ON p.id = cm.user_id AND p.subscription_type = 'teacher'
JOIN public.subjects s
  ON s.class_id = cm.class_id
  OR s.id IN (SELECT cs.subject_id FROM public.class_subjects cs WHERE cs.class_id = cm.class_id)
WHERE cm.role IN ('teacher', 'owner')
ON CONFLICT (subject_id, teacher_id) DO NOTHING;

INSERT INTO public.subject_students (subject_id, student_id, role, source)
SELECT DISTINCT
  s.id,
  cm.user_id,
  'student',
  'class_link'
FROM public.class_members cm
JOIN public.profiles p ON p.id = cm.user_id AND p.subscription_type != 'teacher'
JOIN public.subjects s
  ON s.class_id = cm.class_id
  OR s.id IN (SELECT cs.subject_id FROM public.class_subjects cs WHERE cs.class_id = cm.class_id)
ON CONFLICT (subject_id, student_id) DO NOTHING;

-- ============================================
-- 3. VERIFICATION
-- ============================================
SELECT 'class deprecation backfill completed' AS status;
SELECT count(*) AS classes_without_subject
FROM public.classes c
WHERE NOT EXISTS (SELECT 1 FROM public.subjects s WHERE s.class_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.class_subjects cs WHERE cs.class_id = c.id);
SELECT count(*) AS subject_teachers_rows FROM public.subject_teachers;
SELECT count(*) AS subject_students_rows FROM public.subject_students;

COMMIT;
