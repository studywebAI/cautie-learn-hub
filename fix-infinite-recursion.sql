-- Fix infinite recursion in RLS policies (simplified, reusable version)
-- Run this SQL to resolve "infinite recursion detected in policy" errors

-- First, check the current policy state
SELECT schemaname, tablename, policyname, permissive, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('classes', 'class_members', 'subjects', 'profiles')
ORDER BY tablename, cmd;

-- 1. Disable RLS temporarily on affected tables
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies on these tables
DO $
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('classes', 'class_members', 'subjects', 'profiles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            policy_record.policyname, policy_record.schemaname, policy_record.tablename);
        RAISE NOTICE 'Dropped policy: %.%.%', policy_record.schemaname, policy_record.tablename, policy_record.policyname;
    END LOOP;
END
$;

-- 3. Re-enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create simple, recursion-free policies

-- Profiles: Users can only access their own profile
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT
  USING (auth.uid() = id);
  
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
  
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Classes: Simple policies with no cross-table dependencies
CREATE POLICY "classes_auth_read" ON public.classes FOR SELECT
  USING (auth.uid() IS NOT NULL);
  
CREATE POLICY "classes_auth_insert" ON public.classes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
  
CREATE POLICY "classes_auth_update" ON public.classes FOR UPDATE
  USING (auth.uid() IS NOT NULL);
  
CREATE POLICY "classes_auth_delete" ON public.classes FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Class Members: Simple policies with no cross-table dependencies
CREATE POLICY "class_members_auth_read" ON public.class_members FOR SELECT
  USING (auth.uid() IS NOT NULL);
  
CREATE POLICY "class_members_auth_insert" ON public.class_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
  
CREATE POLICY "class_members_auth_update" ON public.class_members FOR UPDATE
  USING (auth.uid() IS NOT NULL);
  
CREATE POLICY "class_members_auth_delete" ON public.class_members FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Subjects: Simple policies with no cross-table dependencies
CREATE POLICY "subjects_auth_read" ON public.subjects FOR SELECT
  USING (auth.uid() IS NOT NULL);
  
CREATE POLICY "subjects_auth_insert" ON public.subjects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
  
CREATE POLICY "subjects_auth_update" ON public.subjects FOR UPDATE
  USING (auth.uid() IS NOT NULL);
  
CREATE POLICY "subjects_auth_delete" ON public.subjects FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- 5. Verification
SELECT 
    tablename, 
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('classes', 'class_members', 'subjects', 'profiles')
GROUP BY tablename
ORDER BY tablename;

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Show final status
SELECT '✅ Infinite recursion fixed! Simple RLS policies applied.' as status;