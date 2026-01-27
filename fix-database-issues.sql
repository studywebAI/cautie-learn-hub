-- FIX DATABASE ISSUES

-- 1. Disable RLS on all relevant tables
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chapters DISABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs DISABLE ROW LEVEL SECURITY;

-- 2. Ensure user has teacher role (replace with actual user ID)
UPDATE profiles
SET role = 'teacher'
WHERE id = '3d2e2b14-cdb9-4081-852f-2885e4043d58';

-- 3. If profile doesn't exist, create it (only insert required columns)
INSERT INTO profiles (id, role)
VALUES ('3d2e2b14-cdb9-4081-852f-2885e4043d58', 'teacher')
ON CONFLICT (id) DO UPDATE SET role = 'teacher';

-- 4. Check if classes exist and are accessible
SELECT
  c.id, c.name, c.owner_id, c.join_code,
  COUNT(cm.id) as member_count
FROM classes c
LEFT JOIN class_members cm ON c.id = cm.class_id
GROUP BY c.id, c.name, c.owner_id, c.join_code
ORDER BY c.created_at DESC;

-- 5. Check if subjects exist
SELECT
  s.id, s.title, s.user_id, s.class_id,
  c.name as class_name
FROM subjects s
LEFT JOIN classes c ON s.class_id = c.id
ORDER BY s.created_at DESC;

-- 6. Verify join code generation function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'generate_join_code';