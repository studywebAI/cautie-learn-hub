-- ============================================
-- FIX TEACHER EQUALITY VALIDATION ISSUES
-- Ensures your equal-teacher model works correctly
-- ============================================

-- ============================================
-- 1. ENSURE ALL REQUIRED COLUMNS EXIST
-- ============================================
-- Add teacher_join_code to classes if not exists
ALTER TABLE public.classes 
    ADD COLUMN IF NOT EXISTS teacher_join_code text UNIQUE;

-- ============================================
-- 2. CREATE AUDIT_LOGS TABLE IF MISSING
-- ============================================
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

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_class_id ON public.audit_logs(class_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CREATE GENERATE_TEACHER_JOIN_CODE FUNCTION
-- ============================================
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

-- ============================================
-- 4. FIX CLASS_MEMBERS RLS POLICIES
-- ============================================
-- Drop existing restrictive policies
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
    -- You can see members in classes you're part of (any role)
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
    -- Teachers in the class can add members
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_members.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

-- Teachers can update member roles
CREATE POLICY "class_members_update" ON public.class_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_members.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

-- Teachers can remove members (but not themselves if they're the only teacher?)
CREATE POLICY "class_members_delete" ON public.class_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_members.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'management')
    )
  );

-- ============================================
-- 5. FIX CLASSES RLS POLICIES
-- ============================================
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view classes they own or are a member of" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can update their classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can delete their classes" ON public.classes;

-- NEW: Teachers can view classes they're members of (via class_members)
CREATE POLICY "classes_select_teacher_equality" ON public.classes FOR SELECT
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.class_members cm 
            WHERE cm.class_id = classes.id AND cm.user_id = auth.uid()
        )
    );

-- Teachers can create classes
CREATE POLICY "classes_insert_teacher" ON public.classes FOR INSERT
    WITH CHECK (
        auth.uid() = owner_id
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    );

-- Teachers in the class can update it (not just owner)
CREATE POLICY "classes_update_teacher_equality" ON public.classes FOR UPDATE
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.class_members cm 
            WHERE cm.class_id = classes.id 
            AND cm.user_id = auth.uid()
            AND cm.role IN ('teacher', 'management')
        )
    );

-- Class owner can delete (or maybe any teacher? keep it as owner for safety)
CREATE POLICY "classes_delete_owner" ON public.classes FOR DELETE
    USING (auth.uid() = owner_id);

-- ============================================
-- 6. FIX AUDIT_LOGS RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_service" ON public.audit_logs;

-- Teachers/management in the class can read audit logs
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (
    -- User can see their own audit entries
    user_id = auth.uid()
    OR
    -- Teachers in the same class can see all audit entries for that class
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

-- ============================================
-- 7. BACKFILL TEACHER_JOIN_CODE FOR EXISTING CLASSES
-- ============================================
UPDATE public.classes 
SET teacher_join_code = 'T-' || upper(substring(md5(id::text) from 1 for 6))
WHERE teacher_join_code IS NULL;

-- ============================================
-- 8. VERIFICATION QUERIES
-- ============================================
-- Show what we fixed
SELECT 'Columns added/verified: teacher_join_code on classes' as fix_summary;
SELECT 'Tables created/verified: audit_logs' as table_summary;
SELECT 'Functions created: generate_teacher_join_code()' as function_summary;

-- Count accessible classes for current user
SELECT 
    'Accessible classes (via class_members):' as metric,
    COUNT(*) as count
FROM public.classes c
JOIN public.class_members cm ON c.id = cm.class_id
WHERE cm.user_id = auth.uid();

-- Count teacher roles
SELECT 
    'Classes where user is teacher/management:' as metric,
    COUNT(*) as count
FROM public.class_members
WHERE user_id = auth.uid()
AND role IN ('teacher', 'management');

SELECT 'Teacher equality validation fixes applied successfully!' as status;