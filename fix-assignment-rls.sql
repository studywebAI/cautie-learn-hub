-- Disable RLS on assignments table since the API expects no auth checks
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;

-- Also disable on blocks table
ALTER TABLE blocks DISABLE ROW LEVEL SECURITY;

-- Verify current RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('assignments', 'blocks')
AND schemaname = 'public';