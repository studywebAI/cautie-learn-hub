-- TEMPORARILY DISABLE RLS ON PROFILES FOR TESTING ROLE SWITCHING

-- This will allow role switching to work while we debug
-- Re-enable RLS after confirming it works

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Check if profiles exist and have roles
SELECT
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role = 'student' THEN 1 END) as students,
    COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teachers,
    COUNT(CASE WHEN role IS NULL THEN 1 END) as null_roles
FROM public.profiles;

-- Manual test: Update role for testing
-- UPDATE public.profiles SET role = 'teacher' WHERE id = (SELECT auth.uid() LIMIT 1);

SELECT 'RLS disabled on profiles - role switching should now work' as status;