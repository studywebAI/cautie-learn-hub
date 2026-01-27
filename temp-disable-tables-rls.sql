-- TEMPORARY FIX: Disable RLS on tables with circular policies
-- This allows queries to work while keeping your policy definitions intact

-- Disable RLS on tables with circular reference issues
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;

-- Profiles RLS already disabled for role switching

-- Your policy definitions stay in the database, just not enforced!

-- Verification
SELECT
    'RLS disabled on problematic tables - queries should work now' as status,
    schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('classes', 'class_members', 'subjects', 'profiles')
ORDER BY tablename;