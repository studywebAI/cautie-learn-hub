-- =============================================
-- Hardened Grades Security + Data Integrity
-- Date: 2026-03-02
-- =============================================

BEGIN;

-- 1) Defensive helper functions (SECURITY DEFINER + fixed search_path)
CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND p.subscription_type = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_member_of_class(p_class_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.class_id = p_class_id
      AND cm.user_id = p_user_id
      AND p.subscription_type = 'teacher'
  );
$$;

CREATE OR REPLACE FUNCTION public.class_id_for_grade_set(p_grade_set_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gs.class_id
  FROM public.grade_sets gs
  WHERE gs.id = p_grade_set_id
  LIMIT 1;
$$;

-- 2) Harden grade_sets schema
ALTER TABLE public.grade_sets
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN created_by SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'draft',
  ALTER COLUMN category SET DEFAULT 'test',
  ALTER COLUMN weight SET DEFAULT 1;

ALTER TABLE public.grade_sets
  ADD CONSTRAINT grade_sets_title_len_chk
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  ADD CONSTRAINT grade_sets_weight_chk
    CHECK (weight > 0 AND weight <= 100),
  ADD CONSTRAINT grade_sets_status_chk
    CHECK (status IN ('draft', 'published', 'archived')),
  ADD CONSTRAINT grade_sets_category_chk
    CHECK (category IN ('test', 'quiz', 'homework', 'project', 'exam', 'assignment', 'other'));

-- 3) Harden student_grades schema + typed score support
ALTER TABLE public.student_grades
  ADD COLUMN IF NOT EXISTS grade_numeric numeric(7,2),
  ADD COLUMN IF NOT EXISTS grade_letter text,
  ADD COLUMN IF NOT EXISTS max_points numeric(7,2),
  ADD COLUMN IF NOT EXISTS excused boolean NOT NULL DEFAULT false,
  ALTER COLUMN status SET DEFAULT 'draft';

UPDATE public.student_grades
SET max_points = 100
WHERE max_points IS NULL;

ALTER TABLE public.student_grades
  ALTER COLUMN max_points SET NOT NULL;

ALTER TABLE public.student_grades
  ADD CONSTRAINT student_grades_status_chk
    CHECK (status IN ('draft', 'final', 'missing', 'excused')),
  ADD CONSTRAINT student_grades_numeric_range_chk
    CHECK (grade_numeric IS NULL OR (grade_numeric >= 0 AND grade_numeric <= 1000)),
  ADD CONSTRAINT student_grades_max_points_chk
    CHECK (max_points > 0 AND max_points <= 1000),
  ADD CONSTRAINT student_grades_letter_len_chk
    CHECK (grade_letter IS NULL OR char_length(grade_letter) BETWEEN 1 AND 8);

-- 4) Strengthen audit table for forensics
ALTER TABLE public.grade_history
  ADD COLUMN IF NOT EXISTS change_type text NOT NULL DEFAULT 'grade_update',
  ADD COLUMN IF NOT EXISTS old_numeric numeric(7,2),
  ADD COLUMN IF NOT EXISTS new_numeric numeric(7,2),
  ADD COLUMN IF NOT EXISTS old_letter text,
  ADD COLUMN IF NOT EXISTS new_letter text,
  ADD COLUMN IF NOT EXISTS old_status text,
  ADD COLUMN IF NOT EXISTS new_status text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.grade_history
  ADD CONSTRAINT grade_history_change_type_chk
    CHECK (change_type IN ('grade_update', 'publish', 'rollback', 'status_update', 'delete'));

-- 5) Additional index coverage
CREATE INDEX IF NOT EXISTS idx_grade_sets_class_status_created
  ON public.grade_sets(class_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_grades_set_status_student
  ON public.student_grades(grade_set_id, status, student_id);

CREATE INDEX IF NOT EXISTS idx_student_grades_student_grade_set
  ON public.student_grades(student_id, grade_set_id);

CREATE INDEX IF NOT EXISTS idx_grade_history_student_grade_created
  ON public.grade_history(student_grade_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_grade_history_change_type_created
  ON public.grade_history(change_type, created_at DESC);

-- 6) Safe updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grade_sets_updated_at ON public.grade_sets;
CREATE TRIGGER trg_grade_sets_updated_at
BEFORE UPDATE ON public.grade_sets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_student_grades_updated_at ON public.student_grades;
CREATE TRIGGER trg_student_grades_updated_at
BEFORE UPDATE ON public.student_grades
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 7) Guard rails: only teacher-members can mutate grade data
CREATE OR REPLACE FUNCTION public.enforce_grade_set_mutation_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_class_id uuid;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  target_class_id := COALESCE(NEW.class_id, OLD.class_id);

  IF NOT public.is_teacher_member_of_class(target_class_id, actor_id)
     AND NOT public.is_admin_user(actor_id) THEN
    RAISE EXCEPTION 'Only teacher class members can modify grade sets';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := actor_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_grade_set_permissions ON public.grade_sets;
CREATE TRIGGER trg_enforce_grade_set_permissions
BEFORE INSERT OR UPDATE OR DELETE ON public.grade_sets
FOR EACH ROW
EXECUTE FUNCTION public.enforce_grade_set_mutation_permissions();

CREATE OR REPLACE FUNCTION public.enforce_student_grade_mutation_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  target_grade_set_id uuid;
  target_class_id uuid;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  target_grade_set_id := COALESCE(NEW.grade_set_id, OLD.grade_set_id);
  target_class_id := public.class_id_for_grade_set(target_grade_set_id);

  IF target_class_id IS NULL THEN
    RAISE EXCEPTION 'Invalid grade_set_id';
  END IF;

  IF NOT public.is_teacher_member_of_class(target_class_id, actor_id)
     AND NOT public.is_admin_user(actor_id) THEN
    RAISE EXCEPTION 'Only teacher class members can modify student grades';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_student_grade_permissions ON public.student_grades;
CREATE TRIGGER trg_enforce_student_grade_permissions
BEFORE INSERT OR UPDATE OR DELETE ON public.student_grades
FOR EACH ROW
EXECUTE FUNCTION public.enforce_student_grade_mutation_permissions();

-- 8) Robust audit trigger (captures value, status, letter and metadata)
CREATE OR REPLACE FUNCTION public.log_grade_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  v_change_type text := 'grade_update';
BEGIN
  IF actor_id IS NULL THEN
    -- Keep strict; this avoids unauthenticated writes that cannot be attributed.
    RAISE EXCEPTION 'Authentication required for grade change logging';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (OLD.status IS DISTINCT FROM NEW.status)
       AND (OLD.grade_value IS NOT DISTINCT FROM NEW.grade_value)
       AND (OLD.grade_numeric IS NOT DISTINCT FROM NEW.grade_numeric)
       AND (OLD.grade_letter IS NOT DISTINCT FROM NEW.grade_letter) THEN
      v_change_type := 'status_update';
    END IF;

    IF OLD.grade_value IS DISTINCT FROM NEW.grade_value
       OR OLD.grade_numeric IS DISTINCT FROM NEW.grade_numeric
       OR OLD.grade_letter IS DISTINCT FROM NEW.grade_letter
       OR OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.grade_history (
        student_grade_id,
        old_value,
        new_value,
        old_numeric,
        new_numeric,
        old_letter,
        new_letter,
        old_status,
        new_status,
        change_reason,
        change_type,
        changed_by,
        metadata
      )
      VALUES (
        NEW.id,
        OLD.grade_value,
        NEW.grade_value,
        OLD.grade_numeric,
        NEW.grade_numeric,
        OLD.grade_letter,
        NEW.grade_letter,
        OLD.status,
        NEW.status,
        NEW.feedback_text,
        v_change_type,
        actor_id,
        jsonb_build_object(
          'grade_set_id', NEW.grade_set_id,
          'student_id', NEW.student_id,
          'timestamp', now()
        )
      );
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.grade_history (
      student_grade_id,
      old_value,
      new_value,
      old_numeric,
      new_numeric,
      old_letter,
      new_letter,
      old_status,
      new_status,
      change_reason,
      change_type,
      changed_by,
      metadata
    )
    VALUES (
      OLD.id,
      OLD.grade_value,
      NULL,
      OLD.grade_numeric,
      NULL,
      OLD.grade_letter,
      NULL,
      OLD.status,
      NULL,
      'Row deleted',
      'delete',
      actor_id,
      jsonb_build_object(
        'grade_set_id', OLD.grade_set_id,
        'student_id', OLD.student_id,
        'timestamp', now()
      )
    );

    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_grade_change ON public.student_grades;
CREATE TRIGGER trigger_log_grade_change
BEFORE UPDATE OR DELETE ON public.student_grades
FOR EACH ROW
EXECUTE FUNCTION public.log_grade_change();

-- 9) RLS reset and hardened policies (teacher-member model, no owner_id assumptions)
ALTER TABLE public.grade_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view grade sets for their classes" ON public.grade_sets;
DROP POLICY IF EXISTS "Class owners can create grade sets" ON public.grade_sets;
DROP POLICY IF EXISTS "Class owners can update grade sets" ON public.grade_sets;
DROP POLICY IF EXISTS "Class owners can delete grade sets" ON public.grade_sets;
DROP POLICY IF EXISTS "grade_sets_select_policy" ON public.grade_sets;
DROP POLICY IF EXISTS "grade_sets_insert_policy" ON public.grade_sets;
DROP POLICY IF EXISTS "grade_sets_update_policy" ON public.grade_sets;
DROP POLICY IF EXISTS "grade_sets_delete_policy" ON public.grade_sets;

CREATE POLICY "grade_sets_select_policy"
ON public.grade_sets
FOR SELECT
USING (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(class_id, auth.uid())
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

CREATE POLICY "grade_sets_insert_policy"
ON public.grade_sets
FOR INSERT
WITH CHECK (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(class_id, auth.uid())
);

CREATE POLICY "grade_sets_update_policy"
ON public.grade_sets
FOR UPDATE
USING (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(class_id, auth.uid())
)
WITH CHECK (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(class_id, auth.uid())
);

CREATE POLICY "grade_sets_delete_policy"
ON public.grade_sets
FOR DELETE
USING (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(class_id, auth.uid())
);

DROP POLICY IF EXISTS "Teachers can view student grades for their classes" ON public.student_grades;
DROP POLICY IF EXISTS "Class owners can manage student grades" ON public.student_grades;
DROP POLICY IF EXISTS "student_grades_select_policy" ON public.student_grades;
DROP POLICY IF EXISTS "student_grades_insert_policy" ON public.student_grades;
DROP POLICY IF EXISTS "student_grades_update_policy" ON public.student_grades;
DROP POLICY IF EXISTS "student_grades_delete_policy" ON public.student_grades;

CREATE POLICY "student_grades_select_policy"
ON public.student_grades
FOR SELECT
USING (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(public.class_id_for_grade_set(grade_set_id), auth.uid())
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

CREATE POLICY "student_grades_insert_policy"
ON public.student_grades
FOR INSERT
WITH CHECK (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(public.class_id_for_grade_set(grade_set_id), auth.uid())
);

CREATE POLICY "student_grades_update_policy"
ON public.student_grades
FOR UPDATE
USING (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(public.class_id_for_grade_set(grade_set_id), auth.uid())
)
WITH CHECK (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(public.class_id_for_grade_set(grade_set_id), auth.uid())
);

CREATE POLICY "student_grades_delete_policy"
ON public.student_grades
FOR DELETE
USING (
  public.is_admin_user(auth.uid())
  OR public.is_teacher_member_of_class(public.class_id_for_grade_set(grade_set_id), auth.uid())
);

DROP POLICY IF EXISTS "Teachers can view grade history for their classes" ON public.grade_history;
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
      AND public.is_teacher_member_of_class(gs.class_id, auth.uid())
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

-- No INSERT/UPDATE/DELETE policy on grade_history: append-only via trigger/function.

COMMIT;

