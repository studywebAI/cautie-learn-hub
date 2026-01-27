-- Temporarily disable RLS to test if that's causing the authentication issues
-- Run this in Supabase SQL editor

ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;

-- Test creating a class now
-- If it works, RLS policies are the issue
-- Then re-enable RLS and fix the policies