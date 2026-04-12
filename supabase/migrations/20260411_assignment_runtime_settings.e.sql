-- 20260411_assignment_runtime_settings.e.sql
-- Run manually in Supabase SQL editor.
-- Idempotent migration for full assignment + block settings persistence.

BEGIN;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS access_code text,
  ADD COLUMN IF NOT EXISTS timer_mode text NOT NULL DEFAULT 'deadline',
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS auto_submit_on_timeout boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_attempts integer,
  ADD COLUMN IF NOT EXISTS attempt_score_mode text NOT NULL DEFAULT 'best',
  ADD COLUMN IF NOT EXISTS cooldown_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_correct_answers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_points boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS total_points numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS assignment_weight numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grade_display_mode text NOT NULL DEFAULT 'score',
  ADD COLUMN IF NOT EXISTS rounding_decimals integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS require_fullscreen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS detect_tab_switch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS per_question_time_limit_seconds integer,
  ADD COLUMN IF NOT EXISTS restrict_ip_or_device boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuffle_questions boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuffle_answers boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuffle_questions_per_student boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS autosave_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_resume boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS instruction_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS show_timer boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS question_pool_size integer,
  ADD COLUMN IF NOT EXISTS adaptive_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adaptive_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_mode_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reflection_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS improvement_attempt_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_class_ids uuid[];

ALTER TABLE IF EXISTS public.blocks
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.assignment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_no integer NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  submitted_at timestamptz,
  score numeric,
  max_score numeric,
  tab_switch_count integer NOT NULL DEFAULT 0,
  fullscreen_exit_count integer NOT NULL DEFAULT 0,
  ip_address inet,
  user_agent text,
  settings_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id, attempt_no)
);

CREATE TABLE IF NOT EXISTS public.assignment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.assignment_attempts(id) ON DELETE SET NULL,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.student_answers
  ADD COLUMN IF NOT EXISTS assignment_attempt_id uuid REFERENCES public.assignment_attempts(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assignments_timer_mode_check'
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT assignments_timer_mode_check
      CHECK (timer_mode IN ('deadline', 'per_student'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assignments_attempt_score_mode_check'
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT assignments_attempt_score_mode_check
      CHECK (attempt_score_mode IN ('best', 'latest'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assignments_grade_display_mode_check'
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT assignments_grade_display_mode_check
      CHECK (grade_display_mode IN ('score', 'points'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assignment_attempts_status_check'
  ) THEN
    ALTER TABLE public.assignment_attempts
      ADD CONSTRAINT assignment_attempts_status_check
      CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'expired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assignments_settings_gin ON public.assignments USING gin (settings);
CREATE INDEX IF NOT EXISTS idx_blocks_settings_gin ON public.blocks USING gin (settings);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_assignment_student ON public.assignment_attempts(assignment_id, student_id, attempt_no DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_status ON public.assignment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_assignment_events_assignment ON public.assignment_events(assignment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_events_student ON public.assignment_events(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_answers_assignment_attempt ON public.student_answers(assignment_attempt_id);

ALTER TABLE IF EXISTS public.assignment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assignment_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='assignment_attempts' AND policyname='attempts_select_member'
  ) THEN
    CREATE POLICY attempts_select_member
      ON public.assignment_attempts
      FOR SELECT
      USING (
        auth.uid() = student_id OR EXISTS (
          SELECT 1
          FROM public.assignments a
          JOIN public.class_members cm ON cm.class_id = a.class_id
          WHERE a.id = assignment_attempts.assignment_id
            AND cm.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='assignment_attempts' AND policyname='attempts_insert_self'
  ) THEN
    CREATE POLICY attempts_insert_self
      ON public.assignment_attempts
      FOR INSERT
      WITH CHECK (
        auth.uid() = student_id OR EXISTS (
          SELECT 1
          FROM public.assignments a
          JOIN public.class_members cm ON cm.class_id = a.class_id
          WHERE a.id = assignment_attempts.assignment_id
            AND cm.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='assignment_attempts' AND policyname='attempts_update_member'
  ) THEN
    CREATE POLICY attempts_update_member
      ON public.assignment_attempts
      FOR UPDATE
      USING (
        auth.uid() = student_id OR EXISTS (
          SELECT 1
          FROM public.assignments a
          JOIN public.class_members cm ON cm.class_id = a.class_id
          WHERE a.id = assignment_attempts.assignment_id
            AND cm.user_id = auth.uid()
        )
      )
      WITH CHECK (
        auth.uid() = student_id OR EXISTS (
          SELECT 1
          FROM public.assignments a
          JOIN public.class_members cm ON cm.class_id = a.class_id
          WHERE a.id = assignment_attempts.assignment_id
            AND cm.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='assignment_events' AND policyname='assignment_events_select_member'
  ) THEN
    CREATE POLICY assignment_events_select_member
      ON public.assignment_events
      FOR SELECT
      USING (
        auth.uid() = student_id OR EXISTS (
          SELECT 1
          FROM public.assignments a
          JOIN public.class_members cm ON cm.class_id = a.class_id
          WHERE a.id = assignment_events.assignment_id
            AND cm.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='assignment_events' AND policyname='assignment_events_insert_member'
  ) THEN
    CREATE POLICY assignment_events_insert_member
      ON public.assignment_events
      FOR INSERT
      WITH CHECK (
        auth.uid() = student_id OR EXISTS (
          SELECT 1
          FROM public.assignments a
          JOIN public.class_members cm ON cm.class_id = a.class_id
          WHERE a.id = assignment_events.assignment_id
            AND cm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

COMMIT;
