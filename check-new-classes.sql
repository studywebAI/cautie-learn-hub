-- Check if new classes are being created and added to class_members
-- Run this after creating a new class to verify the data

-- 1. Check all classes for the current user
SELECT '=== ALL CLASSES FOR CURRENT USER ===' as section;
SELECT 
  c.id,
  c.name,
  c.description,
  c.user_id as creator_id,
  c.created_at,
  c.status
FROM classes c
WHERE c.user_id = auth.uid()
ORDER BY c.created_at DESC;

-- 2. Check class_members entries for current user
SELECT '=== CLASS_MEMBERS ENTRIES FOR CURRENT USER ===' as section;
SELECT 
  cm.class_id,
  cm.user_id,
  cm.created_at,
  c.name as class_name
FROM class_members cm
LEFT JOIN classes c ON cm.class_id = c.id
WHERE cm.user_id = auth.uid()
ORDER BY cm.created_at DESC;

-- 3. Check if there are any classes the user is a member of but not the creator
SELECT '=== CLASSES WHERE USER IS MEMBER BUT NOT CREATOR ===' as section;
SELECT 
  c.id,
  c.name,
  c.user_id as creator_id,
  cm.user_id as member_id,
  c.created_at
FROM classes c
JOIN class_members cm ON c.id = cm.class_id
WHERE cm.user_id = auth.uid() 
AND c.user_id != auth.uid()
ORDER BY c.created_at DESC;

-- 4. Check for any orphaned class_members entries (classes that don't exist)
SELECT '=== ORPHANED CLASS_MEMBERS ENTRIES ===' as section;
SELECT 
  cm.class_id,
  cm.user_id,
  cm.created_at
FROM class_members cm
LEFT JOIN classes c ON cm.class_id = c.id
WHERE cm.user_id = auth.uid()
AND c.id IS NULL;

-- 5. Check the latest class creation
SELECT '=== LATEST CLASS CREATION ===' as section;
SELECT 
  c.id,
  c.name,
  c.created_at,
  c.user_id,
  (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as member_count
FROM classes c
WHERE c.user_id = auth.uid()
ORDER BY c.created_at DESC
LIMIT 1;

-- 6. Test the dashboard query logic
SELECT '=== DASHBOARD QUERY SIMULATION ===' as section;
WITH user_classes AS (
  SELECT cm.class_id
  FROM class_members cm
  WHERE cm.user_id = auth.uid()
)
SELECT 
  c.id,
  c.name,
  c.description,
  c.created_at,
  c.status
FROM classes c
JOIN user_classes uc ON c.id = uc.class_id
ORDER BY c.created_at DESC;