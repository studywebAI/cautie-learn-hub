-- ============================================
-- DISABLE RLS TEMPORARILY FOR DEBUGGING
-- Run this to test if RLS is causing the issue
-- ============================================

-- Disable RLS on class_members (temporarily for debugging)
ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;

-- Disable RLS on classes (temporarily for debugging)  
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;

-- Disable RLS on subjects
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;

-- Disable RLS on assignments
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;

SELECT 'RLS disabled on class_members, classes, subjects, assignments for debugging' as status;
SELECT 'If this fixes the issue, the problem is in the RLS policies' as hint;
