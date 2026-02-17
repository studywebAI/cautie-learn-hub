-- ============================================================
-- TEACHER COLLABORATION MIGRATION
-- Enables: equal teachers, audit logging, teacher join codes
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add teacher_join_code to classes (separate from student join_code)
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS teacher_join_code text UNIQUE;

-- 2. Create audit_logs table for tracking who edited what
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  action text NOT NULL,          -- 'create', 'update', 'delete', 'grade', 'invite'
  entity_type text NOT NULL,     -- 'subject', 'chapter', 'assignment', 'block', 'grade', 'member', 'class'
  entity_id text,                -- ID of the affected entity
  changes jsonb,                 -- before/after snapshot
  metadata jsonb,                -- extra context
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_class_id ON public.audit_logs(class_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);

-- 4. Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for audit_logs
-- Teachers/management in the class can read audit logs
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (
    -- User can see their own audit entries
    user_id = auth.uid()
    OR
    -- Teachers in the same class can see all audit entries
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = audit_logs.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

-- Any authenticated user can insert audit logs (the API controls who logs what)
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service role full access
CREATE POLICY "audit_logs_service" ON public.audit_logs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 6. Generate teacher join code function
CREATE OR REPLACE FUNCTION public.generate_teacher_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate an 8-character alphanumeric code (longer than student codes for security)
    new_code := 'T-' || upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.classes WHERE teacher_join_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- 7. Update class_members RLS so teachers can see ALL members and manage the class
DROP POLICY IF EXISTS "class_members_select" ON public.class_members;
DROP POLICY IF EXISTS "class_members_insert" ON public.class_members;
DROP POLICY IF EXISTS "class_members_delete" ON public.class_members;
DROP POLICY IF EXISTS "class_members_update" ON public.class_members;

-- Teachers can see all members in their class
CREATE POLICY "class_members_select" ON public.class_members
  FOR SELECT USING (
    -- You can see your own membership
    user_id = auth.uid()
    OR
    -- You can see members in classes you're part of
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_members.class_id AND cm.user_id = auth.uid()
    )
  );

-- Teachers can invite/add members, students can join themselves
CREATE POLICY "class_members_insert" ON public.class_members
  FOR INSERT WITH CHECK (
    -- Self-join (student or teacher via join code)
    user_id = auth.uid()
    OR
    -- Teachers can add members
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_members.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

-- Teachers can update member roles, students can't
CREATE POLICY "class_members_update" ON public.class_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_members.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

-- Teachers can remove members, students can leave
CREATE POLICY "class_members_delete" ON public.class_members
  FOR DELETE USING (
    -- Self-leave
    user_id = auth.uid()
    OR
    -- Teachers can remove members
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_members.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

-- 8. Update classes RLS - teachers (members) can manage classes, not just owner_id
DROP POLICY IF EXISTS "classes_select" ON public.classes;
DROP POLICY IF EXISTS "classes_insert" ON public.classes;
DROP POLICY IF EXISTS "classes_update" ON public.classes;
DROP POLICY IF EXISTS "classes_delete" ON public.classes;

CREATE POLICY "classes_select" ON public.classes
  FOR SELECT USING (
    -- Legacy owner
    owner_id = auth.uid()
    OR
    -- Member of the class
    EXISTS (
      SELECT 1 FROM public.class_members cm WHERE cm.class_id = classes.id AND cm.user_id = auth.uid()
    )
    OR
    -- Public lookup by join_code for joining
    join_code IS NOT NULL
  );

CREATE POLICY "classes_insert" ON public.classes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Any teacher in the class can update it (not just owner)
CREATE POLICY "classes_update" ON public.classes
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = classes.id AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

-- Any teacher in the class can archive it
CREATE POLICY "classes_delete" ON public.classes
  FOR DELETE USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = classes.id AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

-- 9. Update subjects RLS - any teacher in a linked class can edit
DROP POLICY IF EXISTS "subjects_select" ON public.subjects;
DROP POLICY IF EXISTS "subjects_insert" ON public.subjects;
DROP POLICY IF EXISTS "subjects_update" ON public.subjects;
DROP POLICY IF EXISTS "subjects_delete" ON public.subjects;

CREATE POLICY "subjects_select" ON public.subjects
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_subjects cs
      JOIN public.class_members cm ON cm.class_id = cs.class_id
      WHERE cs.subject_id = subjects.id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "subjects_insert" ON public.subjects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Any teacher in a linked class can update subjects
CREATE POLICY "subjects_update" ON public.subjects
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_subjects cs
      JOIN public.class_members cm ON cm.class_id = cs.class_id
      WHERE cs.subject_id = subjects.id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

CREATE POLICY "subjects_delete" ON public.subjects
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_subjects cs
      JOIN public.class_members cm ON cm.class_id = cs.class_id
      WHERE cs.subject_id = subjects.id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

-- 10. Update class_subjects RLS - any teacher can link/unlink subjects
DROP POLICY IF EXISTS "class_subjects_select" ON public.class_subjects;
DROP POLICY IF EXISTS "class_subjects_insert" ON public.class_subjects;
DROP POLICY IF EXISTS "class_subjects_delete" ON public.class_subjects;

CREATE POLICY "class_subjects_select" ON public.class_subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_subjects.class_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "class_subjects_insert" ON public.class_subjects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_subjects.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

CREATE POLICY "class_subjects_delete" ON public.class_subjects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_subjects.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

-- 11. Update announcements RLS - any teacher can create/delete
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;

CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = announcements.class_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "announcements_insert" ON public.announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = announcements.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

CREATE POLICY "announcements_delete" ON public.announcements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = announcements.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

-- 12. Update materials RLS - any teacher in class can manage
DROP POLICY IF EXISTS "materials_access" ON public.materials;

CREATE POLICY "materials_access" ON public.materials FOR ALL USING (
  user_id = auth.uid()
  OR is_public = true
  OR EXISTS (
    SELECT 1 FROM public.class_members cm
    WHERE cm.class_id = materials.class_id AND cm.user_id = auth.uid()
  )
);

-- 13. Reload schema cache
NOTIFY pgrst, 'reload schema';
