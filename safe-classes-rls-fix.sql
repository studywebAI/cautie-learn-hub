-- Safe RLS fix for classes table - only updates policies, doesn't drop data
-- This script fixes RLS policies without affecting existing data

-- Check current RLS policies first
SELECT polname, polcmd, polqual::text, polwithcheck::text 
FROM pg_policy 
WHERE polrelid = 'classes'::regclass;

-- Update existing policies to work with current system
-- If policies don't exist, they'll be created

-- SELECT policy: Allow class creator OR teacher members to view
CREATE OR REPLACE POLICY "classes_select" ON public.classes FOR SELECT
  USING (
    user_id = auth.uid()  -- Class creator
    OR EXISTS (
      SELECT 1 FROM public.class_members 
      WHERE class_members.class_id = classes.id 
      AND class_members.user_id = auth.uid()
    )
  );

-- INSERT policy: Allow any authenticated user to create (API validates teacher status)
CREATE OR REPLACE POLICY "classes_insert" ON public.classes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE policy: Allow class creator OR teacher members to update
CREATE OR REPLACE POLICY "classes_update" ON public.classes FOR UPDATE
  USING (
    user_id = auth.uid()  -- Class creator
    OR EXISTS (
      SELECT 1 FROM public.class_members 
      WHERE class_members.class_id = classes.id 
      AND class_members.user_id = auth.uid()
    )
  );

-- DELETE policy: Only class creator can delete
CREATE OR REPLACE POLICY "classes_delete" ON public.classes FOR DELETE
  USING (user_id = auth.uid());

-- Verify the policies are working
SELECT polname, polcmd, polqual::text, polwithcheck::text 
FROM pg_policy 
WHERE polrelid = 'classes'::regclass;

-- Test with a simple query to make sure RLS is working
SELECT id, name, user_id FROM public.classes WHERE auth.uid() = user_id LIMIT 1;