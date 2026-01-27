-- FINAL FIX: Complete RLS policy reset to eliminate infinite recursion
-- Run this to fix all RLS issues

-- 1. Disable RLS temporarily on all affected tables
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. FORCE DROP ALL POLICIES using system catalog (more aggressive)
DO $
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on our tables
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

-- Profiles: Users can ONLY access their OWN profiles
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5. Verification
SELECT
    'RLS policies reset successfully!' as status,
    COUNT(*) as policies_created
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('classes', 'class_members', 'subjects', 'profiles');