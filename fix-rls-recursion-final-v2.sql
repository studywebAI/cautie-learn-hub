-- FINAL FIX: Complete RLS policy reset to eliminate infinite recursion
-- Run this to fix all RLS issues

-- 1. Disable RLS temporarily on all affected tables
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies manually (most reliable approach)
DROP POLICY IF EXISTS "classes_auth_read" ON public.classes;
DROP POLICY IF EXISTS "classes_auth_insert" ON public.classes;
DROP POLICY IF EXISTS "classes_auth_update" ON public.classes;
DROP POLICY IF EXISTS "classes_auth_delete" ON public.classes;
DROP POLICY IF EXISTS "members_auth_read" ON public.class_members;
DROP POLICY IF EXISTS "members_auth_insert" ON public.class_members;
DROP POLICY IF EXISTS "members_auth_update" ON public.class_members;
DROP POLICY IF EXISTS "members_auth_delete" ON public.class_members;
DROP POLICY IF EXISTS "subjects_auth_read" ON public.subjects;
DROP POLICY IF EXISTS "subjects_auth_insert" ON public.subjects;
DROP POLICY IF EXISTS "subjects_auth_update" ON public.subjects;
DROP POLICY IF EXISTS "subjects_auth_delete" ON public.subjects;
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

-- Also drop any other policies that might exist
DROP POLICY IF EXISTS "allow_all_authenticated_classes" ON public.classes;
DROP POLICY IF EXISTS "allow_all_authenticated_members" ON public.class_members;
DROP POLICY IF EXISTS "allow_all_authenticated_subjects" ON public.subjects;
DROP POLICY IF EXISTS "users_can_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;

-- 3. Re-enable RLS on all tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create ULTRA-SIMPLE policies with ZERO cross-table references
-- These policies ONLY check auth.uid() - nothing else!

-- Classes: Allow authenticated users full access
CREATE POLICY "classes_auth_read" ON public.classes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "classes_auth_insert" ON public.classes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "classes_auth_update" ON public.classes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "classes_auth_delete" ON public.classes FOR DELETE USING (auth.uid() IS NOT NULL);

-- Class Members: Allow authenticated users full access
CREATE POLICY "members_auth_read" ON public.class_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "members_auth_insert" ON public.class_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "members_auth_update" ON public.class_members FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "members_auth_delete" ON public.class_members FOR DELETE USING (auth.uid() IS NOT NULL);

-- Subjects: Allow authenticated users full access
CREATE POLICY "subjects_auth_read" ON public.subjects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "subjects_auth_insert" ON public.subjects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "subjects_auth_update" ON public.subjects FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "subjects_auth_delete" ON public.subjects FOR DELETE USING (auth.uid() IS NOT NULL);

-- Profiles: Users can access their OWN profiles (more permissive for updates)
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 5. Verification
SELECT
    'RLS policies reset successfully!' as status,
    COUNT(*) as policies_created
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('classes', 'class_members', 'subjects', 'profiles');