-- FINAL CLEAN DATABASE FIX
-- Only adds the missing joined_at column (foreign key already exists)

-- 1. Add missing joined_at column to class_members table
-- (Foreign key constraint already exists, so we only need this column)
ALTER TABLE class_members 
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'class_members' AND column_name = 'joined_at';

-- 3. Verify foreign key constraint exists (should already be there)
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

-- 4. The attendance API should now work correctly
-- (No test queries with invalid UUIDs - just the schema fix)