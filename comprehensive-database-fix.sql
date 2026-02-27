-- Comprehensive Database Fix Script
-- Fixes missing joined_at column and other schema issues

-- 1. Add missing joined_at column to class_members table
ALTER TABLE class_members 
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'class_members' AND column_name = 'joined_at';

-- 3. Check for any other missing columns in class_members
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'class_members' 
ORDER BY column_name;

-- 4. Verify class_members table structure is correct
-- Expected columns: id, class_id, user_id, joined_at, created_at
-- (role column should have been removed in previous migrations)

-- 5. Test the attendance query that was failing
-- This should now work without errors
SELECT user_id, joined_at 
FROM class_members 
WHERE class_id = 'some-test-class-id' 
LIMIT 5;

-- 6. Check if there are any other references to joined_at in the codebase
-- that might need attention (this is informational)

-- 7. Verify RLS policies are working correctly after schema changes
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policy 
WHERE tablename = 'class_members';

-- 8. Test class_members insertion (should work with new schema)
-- INSERT INTO class_members (class_id, user_id) VALUES ('test-class', 'test-user');
-- (Commented out - just for reference)

-- 9. Clean up any potential duplicate columns (shouldn't happen with IF NOT EXISTS)
-- ALTER TABLE class_members DROP COLUMN IF EXISTS joined_at_duplicate;

-- 10. Final verification - check that the attendance API query pattern works
-- This simulates what the API does:
WITH class_members_data AS (
  SELECT user_id, joined_at
  FROM class_members 
  WHERE class_id = 'some-test-class-id'
)
SELECT COUNT(*) as member_count FROM class_members_data;