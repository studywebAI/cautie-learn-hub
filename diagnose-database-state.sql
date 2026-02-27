-- Comprehensive Database State Diagnostic
-- This script checks the current state of RLS policies and identifies issues

-- 1. Check current RLS policies on classes table
SELECT '=== CLASSES RLS POLICIES ===' as section;
SELECT polname, polcmd, polqual::text, polwithcheck::text 
FROM pg_policy 
WHERE polrelid = 'classes'::regclass
ORDER BY polname;

-- 2. Check if RLS is enabled on classes table
SELECT '=== CLASSES RLS STATUS ===' as section;
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'classes';

-- 3. Check current user context
SELECT '=== CURRENT USER CONTEXT ===' as section;
SELECT auth.uid() as current_user_id, auth.role() as current_role;

-- 4. Check if class_members table exists and structure
SELECT '=== CLASS_MEMBERS TABLE ===' as section;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'class_members' 
ORDER BY ordinal_position;

-- 5. Check if user has any existing classes
SELECT '=== USER CLASSES ===' as section;
SELECT id, name, user_id, created_at 
FROM classes 
WHERE user_id = auth.uid();

-- 6. Check if user is in any class_members records
SELECT '=== USER CLASS MEMBERSHIPS ===' as section;
SELECT class_id, user_id, created_at 
FROM class_members 
WHERE user_id = auth.uid();

-- 7. Test RLS policy logic manually
SELECT '=== RLS LOGIC TEST ===' as section;
SELECT 
  'user_id = auth.uid()' as test_condition,
  CASE WHEN EXISTS (SELECT 1 FROM classes WHERE user_id = auth.uid()) THEN 'PASS' ELSE 'FAIL' END as result
UNION ALL
SELECT 
  'EXISTS class_members check' as test_condition,
  CASE WHEN EXISTS (SELECT 1 FROM class_members WHERE user_id = auth.uid()) THEN 'PASS' ELSE 'FAIL' END as result;

-- 8. Check for any conflicting policies from old migrations
SELECT '=== POTENTIAL CONFLICTS ===' as section;
SELECT polname, polcmd, polqual::text 
FROM pg_policy 
WHERE polrelid = 'classes'::regclass
AND polname ILIKE '%owner%'
OR polname ILIKE '%role%';

-- 9. Test class creation with current policies
SELECT '=== TEST CLASS CREATION ===' as section;
SELECT 'Attempting to test INSERT policy...' as test_note;

-- 10. Check profiles table for current user
SELECT '=== USER PROFILE ===' as section;
SELECT id, subscription_type, subscription_tier, classes_created 
FROM profiles 
WHERE id = auth.uid();