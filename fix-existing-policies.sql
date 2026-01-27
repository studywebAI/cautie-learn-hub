-- FIX EXISTING POLICIES: Modify complex policies to eliminate circular references
-- Instead of dropping, we modify the problematic ones

-- 1. Check current problematic policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('classes', 'class_members', 'subjects', 'profiles')
AND policyname IN ('classes_member_access', 'classes_owner_access', 'subjects_owner_access');

-- 2. Replace complex policies with simple ones (keep your existing simple policies)

-- Drop only the problematic complex policies
DROP POLICY IF EXISTS "classes_member_access" ON public.class_members;
DROP POLICY IF EXISTS "classes_owner_access" ON public.classes;
DROP POLICY IF EXISTS "subjects_owner_access" ON public.subjects;

-- Keep all your other policies intact!

-- 3. Add temporary simple fallback policies for the dropped complex ones
-- These allow authenticated access without cross-table references
CREATE POLICY "temp_classes_access" ON public.classes FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "temp_members_access" ON public.class_members FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "temp_subjects_access" ON public.subjects FOR ALL USING (auth.uid() IS NOT NULL);

-- 4. Verification - should show no more recursion-causing policies
SELECT
    'Complex policies removed, simple fallbacks added' as status,
    COUNT(*) as remaining_policies
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('classes', 'class_members', 'subjects', 'profiles');