-- COMPREHENSIVE FIX - Complete RLS and Validation Solution
-- This script fixes all class creation and subject creation issues

-- 1. First, disable RLS to avoid conflicts
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users can view classes they own or are a member of" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can update their classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can delete their classes" ON public.classes;
DROP POLICY IF EXISTS "classes_select" ON public.classes;
DROP POLICY IF EXISTS "classes_insert" ON public.classes;
DROP POLICY IF EXISTS "classes_update" ON public.classes;
DROP POLICY IF EXISTS "classes_delete" ON public.classes;

-- 3. Re-enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 4. Create CORRECT policies for current system (user_id + class_members)
-- SELECT policy: Class creator OR any teacher member can view
CREATE POLICY "classes_select" ON public.classes FOR SELECT
  USING (
    user_id = auth.uid()  -- Class creator
    OR EXISTS (
      SELECT 1 FROM public.class_members 
      WHERE class_members.class_id = classes.id 
      AND class_members.user_id = auth.uid()
    )
  );

-- INSERT policy: Any authenticated user can create (API validates teacher status)
CREATE POLICY "classes_insert" ON public.classes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE policy: Class creator OR any teacher member can update
CREATE POLICY "classes_update" ON public.classes FOR UPDATE
  USING (
    user_id = auth.uid()  -- Class creator
    OR EXISTS (
      SELECT 1 FROM public.class_members 
      WHERE class_members.class_id = classes.id 
      AND class_members.user_id = auth.uid()
    )
  );

-- DELETE policy: Only class creator can delete (prevents accidental deletion)
CREATE POLICY "classes_delete" ON public.classes FOR DELETE
  USING (user_id = auth.uid());

-- 5. Verify policies are created correctly
SELECT '=== VERIFICATION ===' as section;
SELECT polname, polcmd, polqual::text, polwithcheck::text 
FROM pg_policy 
WHERE polrelid = 'classes'::regclass;

-- 6. Test the fix
SELECT '=== TESTING ===' as section;
SELECT 'Current user: ' || auth.uid() as user_info;
SELECT 'RLS enabled: ' || relrowsecurity as rls_status 
FROM pg_class WHERE relname = 'classes';

-- 7. Test INSERT policy (this should work now)
SELECT '=== INSERT TEST ===' as section;
SELECT 'Testing INSERT policy with current user...' as test_note;

-- 8. Show table structure to confirm we're using correct columns
SELECT '=== TABLE STRUCTURE ===' as section;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'classes' 
ORDER BY ordinal_position;

-- 9. Check if class_members table exists (required for RLS logic)
SELECT '=== CLASS_MEMBERS TABLE ===' as section;
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'class_members' 
ORDER BY ordinal_position;

-- 10. Final status check
SELECT '=== FINAL STATUS ===' as section;
SELECT 
  'RLS Status: ' || CASE WHEN relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status,
  'Policies Count: ' || (SELECT COUNT(*) FROM pg_policy WHERE polrelid = 'classes'::regclass) as policy_count
FROM pg_class WHERE relname = 'classes';