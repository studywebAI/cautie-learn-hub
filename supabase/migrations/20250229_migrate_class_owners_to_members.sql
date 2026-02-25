-- Migrate existing class owners to class_members table
-- This ensures teachers can see their existing classes

-- Add all unique owners from classes to class_members
INSERT INTO class_members (class_id, user_id)
SELECT c.id, c.owner_id
FROM classes c
WHERE c.owner_id IS NOT NULL
ON CONFLICT (class_id, user_id) DO NOTHING;

-- Verify the migration
SELECT 
  'Classes with owners' as metric,
  COUNT(DISTINCT c.id) as count
FROM classes c
WHERE c.owner_id IS NOT NULL
UNION ALL
SELECT 
  'Members added' as metric,
  COUNT(*) as count
FROM class_members;
