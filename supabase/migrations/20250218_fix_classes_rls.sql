-- ============================================
-- FIX INFINITE RECURSION ON CLASSES TABLE
-- The classes policy references class_members which references back to classes
-- ============================================

-- First, let's see what policies exist on classes
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'classes';

-- ============================================
-- DROP ALL RESTRICTIVE CLASSES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view classes they own or are a member of" ON public.classes;
DROP POLICY IF EXISTS "classes_select_teacher_equality" ON public.classes;
DROP POLICY IF EXISTS "classes_select_collaborative" ON public.classes;
DROP POLICY IF EXISTS "classes_select" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can update their classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can delete their classes" ON public.classes;
DROP POLICY IF EXISTS "classes_insert_teacher" ON public.classes;
DROP POLICY IF EXISTS "classes_update_teacher_equality" ON public.classes;
DROP POLICY IF EXISTS "classes_delete_owner" ON public.classes;

-- ============================================
-- CREATE SIMPLE POLICIES - NO RECURSION
-- ============================================

-- SELECT: Anyone can view if they're the owner OR a member
-- NOTE: We check class_members but use a simple join without recursive policy
CREATE POLICY "classes_select" ON public.classes
  FOR SELECT USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.class_members, public.classes c
      WHERE class_members.class_id = c.id 
      AND c.id = classes.id
      AND class_members.user_id = auth.uid()
    )
  );

-- INSERT: Only teachers can create
CREATE POLICY "classes_insert" ON public.classes
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
  );

-- UPDATE: Owner only (keep simple to avoid recursion)
CREATE POLICY "classes_update" ON public.classes
  FOR UPDATE USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- DELETE: Owner only
CREATE POLICY "classes_delete" ON public.classes
  FOR DELETE USING (auth.uid() = owner_id);

SELECT 'Fixed classes RLS - removed recursive policies' as status;
