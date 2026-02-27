-- Apply final RLS fix for classes table
-- This script implements the correct RLS policies for the current teacher collaboration system

-- Disable RLS temporarily to avoid conflicts
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;

-- Drop all existing conflicting policies
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

-- Create correct policies for teacher collaboration system
-- SELECT: Class creator OR any teacher member can view
CREATE POLICY "classes_select" ON public.classes FOR SELECT
  USING (
    user_id = auth.uid()  -- Class creator
    OR EXISTS (
      SELECT 1 FROM public.class_members 
      WHERE class_members.class_id = classes.id 
      AND class_members.user_id = auth.uid()
    )
  );

-- INSERT: Any authenticated user can create (API validates teacher status)
CREATE POLICY "classes_insert" ON public.classes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Class creator OR any teacher member can update
CREATE POLICY "classes_update" ON public.classes FOR UPDATE
  USING (
    user_id = auth.uid()  -- Class creator
    OR EXISTS (
      SELECT 1 FROM public.class_members 
      WHERE class_members.class_id = classes.id 
      AND class_members.user_id = auth.uid()
    )
  );

-- DELETE: Only class creator can delete (prevent accidental deletion by other teachers)
CREATE POLICY "classes_delete" ON public.classes FOR DELETE
  USING (user_id = auth.uid());

-- Verify policies are created correctly
SELECT polname, polcmd, polqual::text, polwithcheck::text 
FROM pg_policy 
WHERE polrelid = 'classes'::regclass;

-- Show current table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'classes' 
ORDER BY ordinal_position;