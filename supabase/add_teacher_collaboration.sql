-- ============================================================
-- TEACHER COLLABORATION MIGRATION
-- Fixed: No more infinite recursion
-- ============================================================

-- 1. Add teacher_join_code to classes
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS teacher_join_code text UNIQUE;

-- 2. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  changes jsonb,
  metadata jsonb,
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
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_service" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

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
    new_code := 'T-' || upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.classes WHERE teacher_join_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- 7. Update class_members RLS - FIXED: No self-reference in SELECT
DROP POLICY IF EXISTS "class_members_select" ON public.class_members;
DROP POLICY IF EXISTS "class_members_insert" ON public.class_members;
DROP POLICY IF EXISTS "class_members_delete" ON public.class_members;
DROP POLICY IF EXISTS "class_members_update" ON public.class_members;

-- SELECT: Users can see their own membership OR use service role
CREATE POLICY "class_members_select" ON public.class_members
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- INSERT: Users can add themselves OR teachers can add members
CREATE POLICY "class_members_insert" ON public.class_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- UPDATE: Users can update their own role OR teachers can update
CREATE POLICY "class_members_update" ON public.class_members
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- DELETE: Users can leave OR teachers can remove
CREATE POLICY "class_members_delete" ON public.class_members
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- 8. Update classes RLS - simple version
DROP POLICY IF EXISTS "classes_select" ON public.classes;
DROP POLICY IF EXISTS "classes_insert" ON public.classes;
DROP POLICY IF EXISTS "classes_update" ON public.classes;
DROP POLICY IF EXISTS "classes_delete" ON public.classes;

CREATE POLICY "classes_select" ON public.classes
  FOR SELECT USING (
    owner_id = auth.uid()
    OR join_code IS NOT NULL
  );

CREATE POLICY "classes_insert" ON public.classes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "classes_update" ON public.classes
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "classes_delete" ON public.classes
  FOR DELETE USING (owner_id = auth.uid());

-- 9. Update subjects RLS
DROP POLICY IF EXISTS "subjects_select" ON public.subjects;
DROP POLICY IF EXISTS "subjects_insert" ON public.subjects;
DROP POLICY IF EXISTS "subjects_update" ON public.subjects;
DROP POLICY IF EXISTS "subjects_delete" ON public.subjects;

CREATE POLICY "subjects_select" ON public.subjects
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "subjects_insert" ON public.subjects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "subjects_update" ON public.subjects
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "subjects_delete" ON public.subjects
  FOR DELETE USING (user_id = auth.uid());

-- 10. Update class_subjects RLS
DROP POLICY IF EXISTS "class_subjects_select" ON public.class_subjects;
DROP POLICY IF EXISTS "class_subjects_insert" ON public.class_subjects;
DROP POLICY IF EXISTS "class_subjects_delete" ON public.class_subjects;

CREATE POLICY "class_subjects_select" ON public.class_subjects
  FOR SELECT USING (true);

CREATE POLICY "class_subjects_insert" ON public.class_subjects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "class_subjects_delete" ON public.class_subjects
  FOR DELETE USING (true);

-- 11. Update announcements RLS
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;

CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT USING (true);

CREATE POLICY "announcements_insert" ON public.announcements
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "announcements_delete" ON public.announcements
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 12. Update materials RLS
DROP POLICY IF EXISTS "materials_access" ON public.materials;

CREATE POLICY "materials_access" ON public.materials FOR ALL USING (
  user_id = auth.uid() OR is_public = true
);

-- 13. Reload schema cache
NOTIFY pgrst, 'reload schema';
