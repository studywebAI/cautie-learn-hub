-- ============================================
-- AGENDA: SUBJECT-FIRST SUPPORT
-- Phase 2.6b (3/3) of the classes -> subjects data-model migration.
--
-- class_agenda_items.class_id and class_agenda_events.class_id have been
-- NOT NULL since 20260324_unified_agenda_items.sql, and every RLS policy
-- on class_agenda_items/class_agenda_item_links/class_agenda_events is
-- gated purely through class_members -- the same RLS-lockout pattern
-- already found and fixed for grade_sets. This migration:
--   1. Makes class_agenda_items.class_id and class_agenda_events.class_id
--      nullable, adds class_agenda_events.subject_id
--   2. Adds is_member_of_subject() (ownership OR subject_teachers OR
--      subject_students), reusing is_teacher_of_subject() from the grades
--      migration for teacher-only actions
--   3. Re-creates every affected policy to OR in the subject-based check
--
-- Purely additive: every policy keeps its original class-based branch,
-- this only adds a second way in.
-- ============================================

BEGIN;

-- ============================================
-- 1. RELAX class_id / ADD subject_id
-- ============================================
ALTER TABLE public.class_agenda_items ALTER COLUMN class_id DROP NOT NULL;
ALTER TABLE public.class_agenda_events ALTER COLUMN class_id DROP NOT NULL;
ALTER TABLE public.class_agenda_events ADD COLUMN IF NOT EXISTS subject_id uuid NULL REFERENCES public.subjects(id) ON DELETE SET NULL;

-- ============================================
-- 2. HELPER FUNCTION
-- is_teacher_of_subject() already exists (20260722_grades_subject_first.sql).
-- ============================================
CREATE OR REPLACE FUNCTION public.is_member_of_subject(p_subject_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_subject_id IS NOT NULL AND (
    public.is_teacher_of_subject(p_subject_id, p_user_id)
    OR EXISTS (
      SELECT 1 FROM public.subject_students ss
      WHERE ss.subject_id = p_subject_id AND ss.student_id = p_user_id
    )
  );
$$;

-- ============================================
-- 3. RE-CREATE CLASS_AGENDA_ITEMS POLICIES
-- ============================================
DROP POLICY IF EXISTS "agenda_items_select_members" ON public.class_agenda_items;
CREATE POLICY "agenda_items_select_members"
  ON public.class_agenda_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_agenda_items.class_id AND cm.user_id = auth.uid()
    )
    OR public.is_member_of_subject(subject_id, auth.uid())
  );

DROP POLICY IF EXISTS "agenda_items_insert_teachers" ON public.class_agenda_items;
CREATE POLICY "agenda_items_insert_teachers"
  ON public.class_agenda_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.class_members cm
        JOIN public.profiles p ON p.id = cm.user_id
        WHERE cm.class_id = class_agenda_items.class_id
          AND cm.user_id = auth.uid()
          AND p.subscription_type = 'teacher'
      )
      OR public.is_teacher_of_subject(subject_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "agenda_items_update_teachers" ON public.class_agenda_items;
CREATE POLICY "agenda_items_update_teachers"
  ON public.class_agenda_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.profiles p ON p.id = cm.user_id
      WHERE cm.class_id = class_agenda_items.class_id
        AND cm.user_id = auth.uid()
        AND p.subscription_type = 'teacher'
    )
    OR public.is_teacher_of_subject(subject_id, auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.profiles p ON p.id = cm.user_id
      WHERE cm.class_id = class_agenda_items.class_id
        AND cm.user_id = auth.uid()
        AND p.subscription_type = 'teacher'
    )
    OR public.is_teacher_of_subject(subject_id, auth.uid())
  );

DROP POLICY IF EXISTS "agenda_items_delete_teachers" ON public.class_agenda_items;
CREATE POLICY "agenda_items_delete_teachers"
  ON public.class_agenda_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.profiles p ON p.id = cm.user_id
      WHERE cm.class_id = class_agenda_items.class_id
        AND cm.user_id = auth.uid()
        AND p.subscription_type = 'teacher'
    )
    OR public.is_teacher_of_subject(subject_id, auth.uid())
  );

-- ============================================
-- 4. RE-CREATE CLASS_AGENDA_ITEM_LINKS POLICIES
-- ============================================
DROP POLICY IF EXISTS "agenda_links_select_members" ON public.class_agenda_item_links;
CREATE POLICY "agenda_links_select_members"
  ON public.class_agenda_item_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_agenda_items ai
      LEFT JOIN public.class_members cm ON cm.class_id = ai.class_id AND cm.user_id = auth.uid()
      WHERE ai.id = class_agenda_item_links.agenda_item_id
        AND (cm.user_id IS NOT NULL OR public.is_member_of_subject(ai.subject_id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "agenda_links_write_teachers" ON public.class_agenda_item_links;
CREATE POLICY "agenda_links_write_teachers"
  ON public.class_agenda_item_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_agenda_items ai
      LEFT JOIN public.class_members cm ON cm.class_id = ai.class_id AND cm.user_id = auth.uid()
      LEFT JOIN public.profiles p ON p.id = cm.user_id
      WHERE ai.id = class_agenda_item_links.agenda_item_id
        AND (p.subscription_type = 'teacher' OR public.is_teacher_of_subject(ai.subject_id, auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_agenda_items ai
      LEFT JOIN public.class_members cm ON cm.class_id = ai.class_id AND cm.user_id = auth.uid()
      LEFT JOIN public.profiles p ON p.id = cm.user_id
      WHERE ai.id = class_agenda_item_links.agenda_item_id
        AND (p.subscription_type = 'teacher' OR public.is_teacher_of_subject(ai.subject_id, auth.uid()))
    )
  );

-- ============================================
-- 5. RE-CREATE CLASS_AGENDA_EVENTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "agenda_events_select_members" ON public.class_agenda_events;
CREATE POLICY "agenda_events_select_members"
  ON public.class_agenda_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_agenda_events.class_id AND cm.user_id = auth.uid()
    )
    OR public.is_member_of_subject(subject_id, auth.uid())
  );

DROP POLICY IF EXISTS "agenda_events_insert_teachers" ON public.class_agenda_events;
CREATE POLICY "agenda_events_insert_teachers"
  ON public.class_agenda_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.class_members cm
        JOIN public.profiles p ON p.id = cm.user_id
        WHERE cm.class_id = class_agenda_events.class_id
          AND cm.user_id = auth.uid()
          AND p.subscription_type = 'teacher'
      )
      OR public.is_teacher_of_subject(subject_id, auth.uid())
    )
  );

-- ============================================
-- 6. VERIFICATION
-- ============================================
SELECT 'agenda subject-first migration completed' AS status;

COMMIT;
