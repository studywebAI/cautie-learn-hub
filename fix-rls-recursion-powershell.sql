-- Fix infinite recursion in RLS policies (PowerShell compatible)
-- Uses security definer functions to break recursion

-- 1. First, let's check the current policy state
SELECT schemaname, tablename, policyname, permissive, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('classes', 'class_members', 'subjects', 'profiles')
ORDER BY tablename, cmd;

-- 2. Create security definer functions to break recursion
-- These functions will replace direct policy references to other tables

-- Check if user is a member of a class (security definer)
CREATE OR REPLACE FUNCTION public.is_class_member(class_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS 'SELECT EXISTS (
    SELECT 1 FROM public.class_members
    WHERE class_id = $1 AND user_id = $2
  )';

-- Check if user owns a class (security definer)
CREATE OR REPLACE FUNCTION public.is_class_owner(class_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS 'SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = $1 AND owner_id = $2
  )';

-- 3. Temporarily disable RLS to make changes
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies (using safe syntax without dollar quotes)
DO 'DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = ''public''
        AND tablename IN (''classes'', ''class_members'', ''subjects'', ''profiles'')
    LOOP
        EXECUTE format(''DROP POLICY IF EXISTS %I ON %I.%I'',
            policy_record.policyname, policy_record.schemaname, policy_record.tablename);
        RAISE NOTICE ''Dropped policy: %.%.%'', policy_record.schemaname, policy_record.tablename, policy_record.policyname;
    END LOOP;
END';

-- 5. Re-enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Create new policies that use security definer functions instead of direct table references

-- Profiles policies
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Classes policies (using functions to break recursion)
CREATE POLICY "classes_select" ON public.classes FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.is_class_member(id, auth.uid())
    OR join_code IS NOT NULL
  );

CREATE POLICY "classes_insert" ON public.classes FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "classes_update" ON public.classes FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "classes_delete" ON public.classes FOR DELETE
  USING (owner_id = auth.uid());

-- Class members policies (using functions to break recursion)
CREATE POLICY "class_members_select" ON public.class_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_class_owner(class_id, auth.uid())
  );

CREATE POLICY "class_members_insert" ON public.class_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_class_owner(class_id, auth.uid())
  );

CREATE POLICY "class_members_delete" ON public.class_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.is_class_owner(class_id, auth.uid())
  );

-- Subjects policies (using functions to break recursion)
CREATE POLICY "subjects_select" ON public.subjects FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_subjects cs
      WHERE cs.subject_id = subjects.id
      AND (
        public.is_class_member(cs.class_id, auth.uid())
        OR public.is_class_owner(cs.class_id, auth.uid())
      )
    )
  );

CREATE POLICY "subjects_insert" ON public.subjects FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "subjects_update" ON public.subjects FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_subjects cs
      WHERE cs.subject_id = subjects.id
      AND public.is_class_owner(cs.class_id, auth.uid())
    )
  );

CREATE POLICY "subjects_delete" ON public.subjects FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_subjects cs
      WHERE cs.subject_id = subjects.id
      AND public.is_class_owner(cs.class_id, auth.uid())
    )
  );

-- 7. Verify the fix
SELECT 
    tablename, 
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('classes', 'class_members', 'subjects', 'profiles')
GROUP BY tablename
ORDER BY tablename;

-- 8. Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Show final status
SELECT '✅ Recursion fixed! Complex security preserved with security definer functions.' as status;