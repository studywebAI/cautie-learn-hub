-- This migration attempts to restore class ownership data
-- It tries to find users who should be members of classes based on:
-- 1. Any classes that have NO members - add the first teacher profile as owner
-- 2. Ensure every class has at least one member

-- First, let's check what we have
SELECT 'Checking class_members table...' as status;

-- Check how many classes exist
SELECT COUNT(*) as total_classes FROM classes;

-- Check how many class_members entries exist
SELECT COUNT(*) as total_members FROM class_members;

-- Let's see if there are classes with no members
SELECT c.id, c.name, c.created_at
FROM classes c
WHERE NOT EXISTS (SELECT 1 FROM class_members cm WHERE cm.class_id = c.id);

-- If there are classes without members, we need to add at least one member
-- For now, let's add the first teacher we find as a member to each orphaned class
-- This is a temporary fix - ideally we'd have the original owner data

-- First, get all classes that have no members
-- Then add the first available teacher as a member (temporary solution)

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
WHERE NOT EXISTS (SELECT 1 FROM class_members cm WHERE cm.class_id = c.id);

SELECT 'Added class members for orphaned classes' as status;

-- Also verify class_members has proper RLS
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;

-- Make sure the policies allow teachers to see their classes
DROP POLICY IF EXISTS "class_members_select" ON class_members;
CREATE POLICY "class_members_select" ON class_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "class_members_insert" ON class_members;
CREATE POLICY "class_members_insert" ON class_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

SELECT 'Restored class_members RLS policies' as status;
