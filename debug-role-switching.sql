-- DEBUG ROLE SWITCHING - Temporarily disable RLS to test

-- Temporarily disable RLS on profiles to test role switching
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Check current profiles
SELECT id, role, updated_at FROM public.profiles LIMIT 5;

-- Update a profile manually to test
-- (Replace 'user-id-here' with actual user ID)
-- UPDATE public.profiles SET role = 'teacher' WHERE id = 'user-id-here';

-- Re-enable with minimal policy
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "profiles_allow_all" ON public.profiles;
DROP POLICY IF EXISTS "users_can_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;

-- Create very simple policy
CREATE POLICY "profiles_simple" ON public.profiles FOR ALL USING (true);

-- Alternative: No RLS at all for testing
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

SELECT 'Role switching debug setup complete' as status;