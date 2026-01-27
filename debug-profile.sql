-- DEBUG: Check if current user has a profile and create if missing
-- Run this in Supabase SQL Editor while logged in

-- 0. First check what columns exist in profiles table
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1. Check if you have a profile
SELECT
    auth.uid() as your_user_id,
    (SELECT COUNT(*) FROM public.profiles WHERE id = auth.uid()) as has_profile;

-- 2. Show your current profile if exists
SELECT * FROM public.profiles WHERE id = auth.uid();

-- 3. Create profile if missing (using only basic columns that should exist)
INSERT INTO public.profiles (id, role)
VALUES (auth.uid(), 'student')
ON CONFLICT (id) DO NOTHING;

-- 4. Verify profile exists now
SELECT id, role FROM public.profiles WHERE id = auth.uid();

-- 5. Test manual role update to teacher
UPDATE public.profiles
SET role = 'teacher'
WHERE id = auth.uid();

-- 6. Check if role changed
SELECT id, role FROM public.profiles WHERE id = auth.uid();

-- 7. Switch back to student
UPDATE public.profiles
SET role = 'student'
WHERE id = auth.uid();

SELECT 'Profile debug completed - check if role updates work manually' as status;