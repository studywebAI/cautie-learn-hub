-- Fix classes RLS INSERT policy
-- The current policy may not be working correctly after owner_id removal
-- This is a more aggressive fix that drops ALL policies and recreates them

-- First, drop ALL existing policies on classes table
DROP POLICY IF EXISTS "Users can view classes they own or are a member of" ON classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
DROP POLICY IF EXISTS "Class owners can update their classes" ON classes;
DROP POLICY IF EXISTS "Class owners can delete their classes" ON classes;
DROP POLICY IF EXISTS "classes_select" ON classes;
DROP POLICY IF EXISTS "classes_insert" ON classes;
DROP POLICY IF EXISTS "classes_update" ON classes;
DROP POLICY IF EXISTS "classes_delete" ON classes;
DROP POLICY IF EXISTS "Allow authenticated read" ON classes;
DROP POLICY IF EXISTS "Allow authenticated insert" ON classes;
DROP POLICY IF EXISTS "Allow authenticated update for owners" ON classes;
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON classes;

-- Now recreate all policies with the new logic
-- SELECT: Any logged in user who is a member of the class
CREATE POLICY "classes_select" ON classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid())
  );

-- INSERT: Any logged in user can create (API validates teacher status separately)
CREATE POLICY "classes_insert" ON classes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Any class member can update
CREATE POLICY "classes_update" ON classes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid())
  );

-- DELETE: Any class member can delete
CREATE POLICY "classes_delete" ON classes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid())
  );

SELECT 'Fixed classes RLS policies - dropped all and recreated' as status;
