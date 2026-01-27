-- DISABLE RLS ON ALL TABLES WITH ISSUES

-- Classes table
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;

-- Class members table (causing join issues)
ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;