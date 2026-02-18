-- Diagnostic script to identify validation issues
-- Run this in Supabase SQL Editor to see what's blocking classes/subjects

-- 1. Check current RLS policies on classes
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
WHERE tablename IN ('classes', 'subjects', 'assignments')
ORDER BY tablename, policyname;

-- 2. Check if RLS is enabled on critical tables
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('classes', 'subjects', 'assignments', 'profiles')
AND schemaname = 'public';

-- 3. Check current user's role
SELECT 
    auth.uid() as current_user_id,
    (SELECT role FROM profiles WHERE id = auth.uid()) as user_role;

-- 4. Check if user has any classes
SELECT 
    COUNT(*) as total_classes,
    COUNT(CASE WHEN owner_id = auth.uid() THEN 1 END) as owned_classes,
    COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM class_members cm 
        WHERE cm.class_id = classes.id AND cm.user_id = auth.uid()
    ) THEN 1 END) as member_classes
FROM classes;

-- 5. Check subjects accessible to current user
SELECT 
    COUNT(*) as total_subjects,
    COUNT(CASE WHEN s.user_id = auth.uid() THEN 1 END) as owned_subjects,
    COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM subject_teachers st 
        WHERE st.subject_id = s.id AND st.teacher_id = auth.uid()
    ) THEN 1 END) as collaborative_subjects
FROM subjects s;

-- 6. Check for any missing columns in critical tables
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('classes', 'subjects', 'assignments')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 7. Check foreign key constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('classes', 'subjects', 'assignments')
ORDER BY tc.table_name;

-- 8. Test a simple query to see what's blocking
EXPLAIN (FORMAT JSON) 
SELECT * FROM classes WHERE owner_id = auth.uid();

-- 9. Check if there are any errors in recent policy creation
SELECT 
    query, 
    calls, 
    total_time, 
    rows, 
    mean_time 
FROM pg_stat_statements 
WHERE query LIKE '%classes%' 
AND query LIKE '%policy%'
ORDER BY total_time DESC 
LIMIT 5;

-- 10. Show current profile info for debugging
SELECT 
    id,
    role,
    full_name,
    updated_at
FROM profiles 
WHERE id = auth.uid();