-- Diagnostic script to identify validation issues in your teacher equality implementation
-- Run this in Supabase SQL Editor to see what's blocking classes/subjects

-- 1. Check current RLS policies on critical tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('classes', 'class_members', 'audit_logs')
ORDER BY tablename, policyname;

-- 2. Check if RLS is enabled on critical tables
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('classes', 'class_members', 'audit_logs', 'profiles')
AND schemaname = 'public';

-- 3. Check current user's role
SELECT 
    auth.uid() as current_user_id,
    (SELECT role FROM profiles WHERE id = auth.uid()) as user_role;

-- 4. Check if user has any classes (via class_members)
SELECT 
    COUNT(*) as total_classes,
    COUNT(CASE WHEN cm.role IN ('teacher', 'management') THEN 1 END) as teacher_classes,
    COUNT(CASE WHEN cm.role = 'student' THEN 1 END) as student_classes
FROM classes c
JOIN class_members cm ON c.id = cm.class_id
WHERE cm.user_id = auth.uid();

-- 5. Check if teacher_join_code column exists
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'classes' 
AND column_name = 'teacher_join_code'
AND table_schema = 'public';

-- 6. Check if audit_logs table exists
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_name = 'audit_logs'
AND table_schema = 'public';

-- 7. Check class_members RLS policies
SELECT 
    tablename,
    policyname,
    qual
FROM pg_policies 
WHERE tablename = 'class_members'
ORDER BY policyname;

-- 8. Test a simple query to see what's blocking
EXPLAIN (FORMAT JSON) 
SELECT * FROM classes c 
JOIN class_members cm ON c.id = cm.class_id 
WHERE cm.user_id = auth.uid() AND cm.role = 'teacher';

-- 9. Check if generate_teacher_join_code function exists
SELECT 
    proname as function_name,
    prosrc as function_definition
FROM pg_proc 
WHERE proname = 'generate_teacher_join_code'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 10. Show current profile info for debugging
SELECT 
    id,
    role,
    full_name,
    updated_at
FROM profiles 
WHERE id = auth.uid();