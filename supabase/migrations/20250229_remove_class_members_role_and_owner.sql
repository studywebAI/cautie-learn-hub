-- Remove class_members.role column - role is now global via profiles.subscription_type
-- Remove owner_id from classes - all teachers are equal

-- 1. Drop the role column from class_members
ALTER TABLE class_members DROP COLUMN IF EXISTS role;

-- 2. Drop owner_id from classes using CASCADE to drop dependent policies
ALTER TABLE classes DROP COLUMN IF EXISTS owner_id CASCADE;

-- 3. Update comment on class_members
COMMENT ON TABLE class_members IS 'Links users to classes. Role is determined globally by profiles.subscription_type';

-- 4. Create RLS policies for class_members - any logged in user can access their own membership
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_members_select" ON class_members;
CREATE POLICY "class_members_select" ON class_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "class_members_insert" ON class_members;
CREATE POLICY "class_members_insert" ON class_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "class_members_delete" ON class_members;
CREATE POLICY "class_members_delete" ON class_members
  FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "class_members_update" ON class_members;
CREATE POLICY "class_members_update" ON class_members
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 5. Create RLS policies for classes - any logged in user can see classes they're members of
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classes_select" ON classes;
CREATE POLICY "classes_select" ON classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "classes_insert" ON classes;
CREATE POLICY "classes_insert" ON classes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "classes_update" ON classes;
CREATE POLICY "classes_update" ON classes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "classes_delete" ON classes;
CREATE POLICY "classes_delete" ON classes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid())
  );

SELECT 'Removed class_members.role and classes.owner_id - using global subscription_type instead' as status;
