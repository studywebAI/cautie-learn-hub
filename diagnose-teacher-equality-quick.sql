-- Quick diagnostic to identify teacher equality validation issues
-- Run this entire script in Supabase SQL Editor

-- 1. Check if teacher_join_code column exists on classes
SELECT 
    'teacher_join_code column exists?' as check,
    COUNT(*) as count
FROM information_schema.columns 
WHERE table_name = 'classes' 
AND column_name = 'teacher_join_code'
AND table_schema = 'public';

-- 2. Check if audit_logs table exists
SELECT 
    'audit_logs table exists?' as check,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_name = 'audit_logs'
AND table_schema = 'public';

-- 3. Check if generate_teacher_join_code function exists
SELECT 
    'generate_teacher_join_code function exists?' as check,
    COUNT(*) as count
FROM pg_proc 
WHERE proname = 'generate_teacher_join_code'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Check class_members RLS policies
SELECT 
    'class_members policies:' as check,
    COUNT(*) as count,
    string_agg(policyname, ', ') as policy_names
FROM pg_policies 
WHERE tablename = 'class_members';

-- 5. Check classes RLS policies
SELECT 
    'classes policies:' as check,
    COUNT(*) as count,
    string_agg(policyname, ', ') as policy_names
FROM pg_policies 
WHERE tablename = 'classes';

-- 6. Check if user has any classes via class_members
SELECT 
    'user class membership:' as check,
    COUNT(*) as total_classes,
    COUNT(CASE WHEN cm.role IN ('teacher', 'management') THEN 1 END) as teacher_classes,
    COUNT(CASE WHEN cm.role = 'student' THEN 1 END) as student_classes
FROM classes c
JOIN class_members cm ON c.id = cm.class_id
WHERE cm.user_id = auth.uid();

-- 7. Check RLS enabled status
SELECT 
    'RLS enabled:' as check,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('classes', 'class_members', 'audit_logs')
AND schemaname = 'public';

-- 8. Test query that might be failing
EXPLAIN (FORMAT JSON) 
SELECT c.* FROM classes c 
JOIN class_members cm ON c.id = cm.class_id 
WHERE cm.user_id = auth.uid() AND cm.role = 'teacher';