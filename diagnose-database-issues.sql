-- Comprehensive diagnostic for database/backend issues

-- 1. Check RLS status on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('classes', 'subjects', 'assignments', 'blocks', 'profiles', 'class_members')
AND schemaname = 'public'
ORDER BY tablename;

-- 2. Check user profiles and roles
SELECT id, role, created_at, updated_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check classes in database
SELECT id, name, owner_id, join_code, created_at
FROM classes
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check subjects in database
SELECT id, title, user_id, class_id, created_at
FROM subjects
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check class memberships
SELECT cm.id, cm.user_id, cm.class_id, cm.created_at, c.name as class_name
FROM class_members cm
JOIN classes c ON cm.class_id = c.id
ORDER BY cm.created_at DESC
LIMIT 10;

-- 6. Check current user's data (replace with actual user ID)
-- Replace 'USER_ID_HERE' with the actual user ID from your logs
SELECT
  'User Profile' as data_type,
  p.id, p.role, p.created_at
FROM profiles p
WHERE p.id = '3d2e2b14-cdb9-4081-852f-2885e4043d58'

UNION ALL

SELECT
  'Owned Classes' as data_type,
  c.id, c.name, c.created_at
FROM classes c
WHERE c.owner_id = '3d2e2b14-cdb9-4081-852f-2885e4043d58'

UNION ALL

SELECT
  'Member Classes' as data_type,
  c.id, c.name, cm.created_at
FROM class_members cm
JOIN classes c ON cm.class_id = c.id
WHERE cm.user_id = '3d2e2b14-cdb9-4081-852f-2885e4043d58'

UNION ALL

SELECT
  'Owned Subjects' as data_type,
  s.id, s.title, s.created_at
FROM subjects s
WHERE s.user_id = '3d2e2b14-cdb9-4081-852f-2885e4043d58';

-- 7. Check if classes have subjects
SELECT
  c.id as class_id,
  c.name as class_name,
  COUNT(s.id) as subject_count
FROM classes c
LEFT JOIN subjects s ON c.id = s.class_id
GROUP BY c.id, c.name
ORDER BY subject_count DESC;

-- 8. Check join code generation function
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'generate_join_code'
AND routine_schema = 'public';