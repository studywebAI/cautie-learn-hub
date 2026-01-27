-- NUKE ALL POLICIES: Complete reset of RLS to eliminate recursion
-- This drops EVERY policy on our tables and recreates simple ones

-- 1. Disable RLS temporarily
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL policies dynamically
DO $$
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
$$;

-- 3. Re-enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create ONLY simple policies with ZERO cross-references
CREATE POLICY "classes_basic_read" ON public.classes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "classes_basic_insert" ON public.classes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "classes_basic_update" ON public.classes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "classes_basic_delete" ON public.classes FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "members_basic_read" ON public.class_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "members_basic_insert" ON public.class_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "members_basic_update" ON public.class_members FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "members_basic_delete" ON public.class_members FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "subjects_basic_read" ON public.subjects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "subjects_basic_insert" ON public.subjects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "subjects_basic_update" ON public.subjects FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "subjects_basic_delete" ON public.subjects FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_basic_read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_basic_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_basic_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5. Verification
SELECT
    'All policies nuked and reset!' as status,
    COUNT(*) as simple_policies_created
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('classes', 'class_members', 'subjects', 'profiles')
    AND policyname LIKE '%basic_%';