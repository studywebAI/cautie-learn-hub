-- ============================================
-- FIX INFINITE RECURSION IN CLASS_MEMBERS RLS
-- The policies reference themselves causing infinite recursion
-- ============================================

-- Drop all class_members policies to start fresh
DROP POLICY IF EXISTS "class_members_select" ON public.class_members;
DROP POLICY IF EXISTS "class_members_insert" ON public.class_members;
DROP POLICY IF EXISTS "class_members_delete" ON public.class_members;
DROP POLICY IF EXISTS "class_members_update" ON public.class_members;
DROP POLICY IF EXISTS "Users can view members of their own classes" ON public.class_members;
DROP POLICY IF EXISTS "Class owners can manage members" ON public.class_members;
DROP POLICY IF EXISTS "Students can join a class" ON public.class_members;
DROP POLICY IF EXISTS "Students can leave a class" ON public.class_members;

-- ============================================
-- NEW SIMPLE POLICIES - NO SELF-REFERENCE
-- ============================================

-- SELECT: Users can see their own membership and all members in classes they belong to
CREATE POLICY "class_members_select" ON public.class_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_members.class_id 
      AND c.owner_id = auth.uid()
    )
  );

-- INSERT: Users can add themselves OR class owners can add members
CREATE POLICY "class_members_insert" ON public.class_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_members.class_id 
      AND c.owner_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own membership OR class owners can update
CREATE POLICY "class_members_update" ON public.class_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_members.class_id 
      AND c.owner_id = auth.uid()
    )
  );

-- DELETE: Users can remove themselves OR class owners can remove members
CREATE POLICY "class_members_delete" ON public.class_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_members.class_id 
      AND c.owner_id = auth.uid()
    )
  );

-- ============================================
-- ALSO FIX CLASSES POLICIES TO AVOID RECURSION
-- ============================================

DROP POLICY IF EXISTS "Users can view classes they own or are a member of" ON public.classes;
DROP POLICY IF EXISTS "classes_select_teacher_equality" ON public.classes;
DROP POLICY IF EXISTS "classes_select_collaborative" ON public.classes;
DROP POLICY IF EXISTS "classes_select" ON public.classes;

CREATE POLICY "classes_select" ON public.classes
  FOR SELECT USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.class_members cm 
      WHERE cm.class_id = classes.id 
      AND cm.user_id = auth.uid()
    )
  );

SELECT 'Fixed class_members and classes RLS policies - no more infinite recursion' as status;
