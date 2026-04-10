-- e.sql
-- Manual one-shot hardening script for server-side persistence.
-- Safe to run multiple times.

BEGIN;

-- =====================================================
-- 1) ASSIGNMENT SETTINGS MUST BE SERVER-SIDE
-- =====================================================
ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS answers_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS answer_mode text DEFAULT 'view_only',
  ADD COLUMN IF NOT EXISTS ai_grading_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_grading_strictness integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS ai_grading_check_spelling boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_grading_check_grammar boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_grading_keywords text,
  ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- Normalize nulls so UI/API always gets stable values.
UPDATE public.assignments
SET
  is_visible = COALESCE(is_visible, true),
  answers_enabled = COALESCE(answers_enabled, false),
  answer_mode = COALESCE(answer_mode, 'view_only'),
  ai_grading_enabled = COALESCE(ai_grading_enabled, false),
  ai_grading_strictness = COALESCE(ai_grading_strictness, 5),
  ai_grading_check_spelling = COALESCE(ai_grading_check_spelling, true),
  ai_grading_check_grammar = COALESCE(ai_grading_check_grammar, true),
  is_locked = COALESCE(is_locked, false)
WHERE
  is_visible IS NULL
  OR answers_enabled IS NULL
  OR answer_mode IS NULL
  OR ai_grading_enabled IS NULL
  OR ai_grading_strictness IS NULL
  OR ai_grading_check_spelling IS NULL
  OR ai_grading_check_grammar IS NULL
  OR is_locked IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assignments_answer_mode_check'
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT assignments_answer_mode_check
      CHECK (answer_mode IN ('view_only', 'editable', 'self_grade'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assignments_answer_mode ON public.assignments(answer_mode);
CREATE INDEX IF NOT EXISTS idx_assignments_is_visible ON public.assignments(is_visible);
CREATE INDEX IF NOT EXISTS idx_assignments_answers_enabled ON public.assignments(answers_enabled);
CREATE INDEX IF NOT EXISTS idx_assignments_ai_grading_enabled ON public.assignments(ai_grading_enabled);

-- =====================================================
-- 2) BLOCK FLAGS USED BY EDITOR/API MUST PERSIST
-- =====================================================
ALTER TABLE IF EXISTS public.blocks
  ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_feedback boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_grading_override jsonb;

UPDATE public.blocks
SET
  locked = COALESCE(locked, false),
  show_feedback = COALESCE(show_feedback, false)
WHERE locked IS NULL OR show_feedback IS NULL;

CREATE INDEX IF NOT EXISTS idx_blocks_assignment_position ON public.blocks(assignment_id, position);

-- =====================================================
-- 3) PROFILE FIELDS USED BY ONBOARDING/SETTINGS
-- =====================================================
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS theme text,
  ADD COLUMN IF NOT EXISTS subscription_type text DEFAULT 'student';

UPDATE public.profiles
SET subscription_type = COALESCE(subscription_type, 'student')
WHERE subscription_type IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_subscription_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_subscription_type_check
      CHECK (subscription_type IN ('student', 'teacher', 'pro', 'enterprise'));
  END IF;
END $$;

-- =====================================================
-- 4) USER PREFERENCES TABLE FOR ONBOARDING STATE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key text NOT NULL,
  preference_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_key ON public.user_preferences(user_id, preference_key);

-- =====================================================
-- 5) JOIN-CODE FUNCTION USED BY /api/classes/join
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_class_by_join_code(p_code text)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  join_code text,
  teacher_join_code text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    c.join_code,
    c.teacher_join_code
  FROM public.classes c
  WHERE
    upper(coalesce(c.join_code, '')) = upper(trim(coalesce(p_code, '')))
    OR upper(coalesce(c.teacher_join_code, '')) = upper(trim(coalesce(p_code, '')))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_class_by_join_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_class_by_join_code(text) TO authenticated;

-- =====================================================
-- 6) RLS: ensure own profile/preferences writable by user
-- (Only adds if missing; does not drop existing policies)
-- =====================================================
ALTER TABLE IF EXISTS public.user_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'user_preferences_select_own'
  ) THEN
    CREATE POLICY user_preferences_select_own
      ON public.user_preferences
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'user_preferences_insert_own'
  ) THEN
    CREATE POLICY user_preferences_insert_own
      ON public.user_preferences
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'user_preferences_update_own'
  ) THEN
    CREATE POLICY user_preferences_update_own
      ON public.user_preferences
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

COMMIT;

-- Quick checks you can run after migration:
-- SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='assignments' ORDER BY column_name;
-- SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='blocks' ORDER BY column_name;
-- SELECT * FROM public.get_class_by_join_code('TESTCODE');
