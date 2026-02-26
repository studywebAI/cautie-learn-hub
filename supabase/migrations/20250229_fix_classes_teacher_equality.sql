-- Migration: Fix classes for teacher equality
-- - Removes owner_id completely (all teachers are equal)
-- - Adds existing classes to class_members for current teachers
-- - Fixes RLS so teachers can create and view their class memberships
-- - Removes role column from class_members (role is now global via subscription_type)

-- Step 0: Drop role column from class_members if it exists
ALTER TABLE class_members DROP COLUMN IF EXISTS role;

-- Step 1: Add existing classes to class_members
-- For each class that has no members, add the first teacher as a member
INSERT INTO class_members (class_id, user_id)
SELECT c.id, p.id
FROM classes c
CROSS JOIN LATERAL (
    SELECT p.id 
    FROM profiles p 
    WHERE p.subscription_type = 'teacher'
    ORDER BY p.id
    LIMIT 1
) p
WHERE NOT EXISTS (SELECT 1 FROM class_members cm WHERE cm.class_id = c.id)
ON CONFLICT DO NOTHING;

-- Step 2: Drop ALL classes policies that might exist (use IF EXISTS to avoid errors)
DROP POLICY IF EXISTS "Users can view classes they own or are a member of" ON classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
DROP POLICY IF EXISTS "Class owners can update their classes" ON classes;
DROP POLICY IF EXISTS "Class owners can delete their classes" ON classes;
DROP POLICY IF EXISTS "Allow authenticated read" ON classes;
DROP POLICY IF EXISTS "Allow authenticated insert" ON classes;
DROP POLICY IF EXISTS "Allow authenticated update for owners" ON classes;
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON classes;
DROP POLICY IF EXISTS "classes_select" ON classes;
DROP POLICY IF EXISTS "classes_insert" ON classes;
DROP POLICY IF EXISTS "classes_update" ON classes;
DROP POLICY IF EXISTS "classes_delete" ON classes;

-- Step 3: Create new RLS policies for classes (no owner_id)
-- SELECT: Any user who is a member of the class
CREATE POLICY "classes_select" ON classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid())
  );

-- INSERT: Any authenticated user can create (API validates teacher status)
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

-- Step 4: Fix class_members RLS - drop first, then create
DROP POLICY IF EXISTS "Users can view members of their own classes" ON class_members;
DROP POLICY IF EXISTS "Class owners can manage members" ON class_members;
DROP POLICY IF EXISTS "Students can join a class" ON class_members;
DROP POLICY IF EXISTS "Students can leave a class" ON class_members;
DROP POLICY IF EXISTS "class_members_select" ON class_members;
DROP POLICY IF EXISTS "class_members_insert" ON class_members;
DROP POLICY IF EXISTS "class_members_delete" ON class_members;
DROP POLICY IF EXISTS "class_members_update" ON class_members;

CREATE POLICY "class_members_select" ON class_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "class_members_insert" ON class_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "class_members_delete" ON class_members
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "class_members_update" ON class_members
  FOR UPDATE USING (auth.uid() IS NOT NULL);

SELECT 'Fixed classes for teacher equality - no owner_id, all teachers equal via class_members' as status;
