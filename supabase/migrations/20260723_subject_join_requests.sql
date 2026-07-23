-- ============================================
-- SUBJECT JOIN REQUESTS (students AND teachers)
-- Phase 4 follow-up: subjects need one join code that works for both
-- roles, and BOTH need approval from an existing subject teacher before
-- they're actually added -- not just teachers. Supersedes an earlier
-- version of this migration (subject_teacher_join_requests, teacher-only)
-- that was written but never run; renamed/generalized here with a `role`
-- column before anyone executed the old shape, so this is a clean
-- replacement, not a follow-up migration.
-- ============================================

BEGIN;

DROP TABLE IF EXISTS public.subject_teacher_join_requests;

CREATE TABLE IF NOT EXISTS public.subject_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_email text,
  role text NOT NULL CHECK (role IN ('student', 'teacher')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_subject_join_requests_subject
  ON public.subject_join_requests(subject_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_join_requests_pending_unique
  ON public.subject_join_requests(subject_id, requester_user_id)
  WHERE status = 'pending';

ALTER TABLE public.subject_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_join_requests_select" ON public.subject_join_requests;
CREATE POLICY "subject_join_requests_select"
ON public.subject_join_requests
FOR SELECT
USING (
  requester_user_id = auth.uid()
  OR public.is_teacher_of_subject(subject_id, auth.uid())
);

DROP POLICY IF EXISTS "subject_join_requests_insert" ON public.subject_join_requests;
CREATE POLICY "subject_join_requests_insert"
ON public.subject_join_requests
FOR INSERT
WITH CHECK (requester_user_id = auth.uid());

DROP POLICY IF EXISTS "subject_join_requests_update" ON public.subject_join_requests;
CREATE POLICY "subject_join_requests_update"
ON public.subject_join_requests
FOR UPDATE
USING (public.is_teacher_of_subject(subject_id, auth.uid()))
WITH CHECK (public.is_teacher_of_subject(subject_id, auth.uid()));

SELECT 'subject join requests migration completed' AS status;

COMMIT;
