-- MINIMAL SAFE FIX - Only adds missing column without dropping anything
-- This will not affect any existing data or structure

-- 1. Add missing joined_at column to class_members table (if it doesn't exist)
-- This is the only change needed to fix the attendance API error
ALTER TABLE class_members 
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'class_members' AND column_name = 'joined_at';

-- 3. Test the attendance query that was failing (should now work)
-- Note: Use a real class ID when testing, not 'some-test-class-id'
SELECT user_id, joined_at 
FROM class_members 
WHERE class_id = 'some-test-class-id' 
LIMIT 5;

-- 4. The foreign key relationship should already exist, but verify it
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

-- 5. Check if there are any orphaned records that might cause issues
SELECT 'class_members with invalid user_id' as issue_type, COUNT(*) as count
FROM class_members cm
LEFT JOIN profiles p ON cm.user_id = p.id
WHERE p.id IS NULL;