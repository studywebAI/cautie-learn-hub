-- FINAL COMPREHENSIVE DATABASE FIX
-- Fixes both missing joined_at column AND missing foreign key relationship

-- 1. Add missing joined_at column to class_members table
ALTER TABLE class_members 
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Add missing foreign key constraint between class_members and profiles
-- This fixes the error: "Could not find a relationship between 'class_members' and 'profiles'"
ALTER TABLE class_members 
ADD CONSTRAINT class_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) 
ON DELETE CASCADE;

-- 3. Verify both fixes were applied successfully
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'class_members' 
AND column_name IN ('joined_at', 'user_id');

-- 4. Verify foreign key constraint was added
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'class_members';

-- 5. Test the problematic queries that were failing
-- Test 1: Attendance API query (should now work)
SELECT user_id, joined_at 
FROM class_members 
WHERE class_id = 'some-test-class-id' 
LIMIT 5;

-- Test 2: Students query with foreign key relationship (should now work)
SELECT cm.user_id, p.full_name, p.avatar_url
FROM class_members cm
JOIN profiles p ON cm.user_id = p.id
WHERE cm.class_id = 'some-test-class-id'
LIMIT 5;

-- 6. Check for any other missing foreign key constraints in the schema
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('class_members', 'classes', 'assignments', 'attendance_records')
ORDER BY tc.table_name;

-- 7. Verify RLS policies are still working correctly
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policy 
WHERE tablename IN ('class_members', 'profiles')
ORDER BY tablename, policyname;

-- 8. Final comprehensive test - simulate what the APIs do
-- This should work without any errors now:
WITH class_members_data AS (
  SELECT cm.user_id, cm.joined_at, p.full_name, p.avatar_url
  FROM class_members cm
  JOIN profiles p ON cm.user_id = p.id
  WHERE cm.class_id = 'some-test-class-id'
)
SELECT 
  COUNT(*) as total_members,
  ARRAY_AGG(json_build_object(
    'user_id', user_id,
    'joined_at', joined_at,
    'full_name', full_name,
    'avatar_url', avatar_url
  )) as members
FROM class_members_data;