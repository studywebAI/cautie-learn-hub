-- Fix classes RLS INSERT policy
-- The current policy may not be working correctly after owner_id removal

-- First, let's drop and recreate the INSERT policy to be more permissive for teachers
DROP POLICY IF EXISTS "classes_insert" ON classes;

CREATE POLICY "classes_insert" ON classes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Also make sure SELECT works properly
DROP POLICY IF EXISTS "classes_select" ON classes;
CREATE POLICY "classes_select" ON classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid())
  );

-- Make sure UPDATE works
DROP POLICY IF EXISTS "classes_update" ON classes;
CREATE POLICY "classes_update" ON classes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid())
  );

-- Make sure DELETE works
DROP POLICY IF EXISTS "classes_delete" ON classes;
CREATE POLICY "classes_delete" ON classes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid())
  );

SELECT 'Fixed classes RLS policies' as status;
