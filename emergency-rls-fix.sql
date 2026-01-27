-- NUKE ALL RLS ON CLASSES - MOST AGGRESSIVE FIX

-- Completely disable RLS
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;

-- Drop every possible policy (run multiple times to be sure)
DROP POLICY IF EXISTS "Users can view classes they own or are a member of" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can update their classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can delete their classes" ON public.classes;
DROP POLICY IF EXISTS "Allow join_code access for uniqueness" ON public.classes;
DROP POLICY IF EXISTS "Users can view their own classes" ON public.classes;
DROP POLICY IF EXISTS "Users can create classes" ON public.classes;
DROP POLICY IF EXISTS "Users can update their own classes" ON public.classes;
DROP POLICY IF EXISTS "Users can delete their own classes" ON public.classes;
DROP POLICY IF EXISTS "Allow join_code checks" ON public.classes;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.classes;

-- Leave RLS DISABLED for now - no policies at all
-- This will allow all operations without any restrictions