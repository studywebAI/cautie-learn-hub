-- Fix classes table RLS policies to work without owner_id
-- This script removes the conflicting policies and creates the correct ones

-- First, disable RLS temporarily to avoid conflicts
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on classes table
DROP POLICY IF EXISTS "Users can view classes they own or are a member of" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can update their classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can delete their classes" ON public.classes;
DROP POLICY IF EXISTS "classes_select" ON public.classes;
DROP POLICY IF EXISTS "classes_insert" ON public.classes;
DROP POLICY IF EXISTS "classes_update" ON public.classes;
DROP POLICY IF EXISTS "classes_delete" ON public.classes;

-- Re-enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create the correct policies for classes table (no owner_id)
-- SELECT: Any authenticated user can view classes they're members of
CREATE POLICY "classes_select" ON public.classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members 
      WHERE class_members.class_id = classes.id 
      AND class_members.user_id = auth.uid()
    )
  );

-- INSERT: Any authenticated user can create (API validates teacher status)
CREATE POLICY "classes_insert" ON public.classes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Any class member can update
CREATE POLICY "classes_update" ON public.classes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members 
      WHERE class_members.class_id = classes.id 
      AND class_members.user_id = auth.uid()
    )
  );

-- DELETE: Any class member can delete
CREATE POLICY "classes_delete" ON public.classes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members 
      WHERE class_members.class_id = classes.id 
      AND class_members.user_id = auth.uid()
    )
  );

-- Verify the policies are created correctly
SELECT polname, polcmd, polqual::text, polwithcheck::text 
FROM pg_policy 
WHERE polrelid = 'classes'::regclass;

-- Test the current classes table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'classes' 
ORDER BY ordinal_position;