-- Test if blocks table exists and can be queried
SELECT COUNT(*) as total_blocks FROM blocks;

-- Check blocks for the specific assignment
SELECT id, assignment_id, type, position, created_at
FROM blocks
WHERE assignment_id = '61ecd62a-519b-43ca-acb3-efd339063bdb'
ORDER BY position;

-- Check if there are any RLS policies on blocks
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'blocks';

-- Check the blocks table structure
\d blocks