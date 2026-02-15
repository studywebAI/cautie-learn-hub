-- Migration: Update assignment RLS policies to include direct class assignments
-- Run this in Supabase SQL Editor

-- Drop existing assignment policies
DROP POLICY IF EXISTS "Users can view assignments for their paragraphs" ON public.assignments;
DROP POLICY IF EXISTS "Users can create assignments for their paragraphs" ON public.assignments;
DROP POLICY IF EXISTS "Users can update assignments for their paragraphs" ON public.assignments;
DROP POLICY IF EXISTS "Users can delete assignments for their paragraphs" ON public.assignments;

-- Create new comprehensive SELECT policy that covers both hierarchical and direct class assignments
CREATE POLICY "Users can view assignments they have access to" ON public.assignments FOR SELECT
  USING (
    -- Hierarchical assignments (through paragraphs)
    EXISTS (
      SELECT 1 FROM public.paragraphs p
      JOIN public.chapters c ON p.chapter_id = c.id
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE p.id = assignments.paragraph_id AND (
        s.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.classes cl
          JOIN public.class_members cm ON cl.id = cm.class_id
          WHERE cl.id = s.class_id AND cm.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.classes cl
          WHERE cl.id = s.class_id AND cl.owner_id = auth.uid()
        )
      )
    )
    OR
    -- Direct class assignments (paragraph_id is null)
    (
      assignments.paragraph_id IS NULL AND
      assignments.class_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.classes cl
        WHERE cl.id = assignments.class_id AND (
          cl.owner_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.class_members cm
            WHERE cm.class_id = cl.id AND cm.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Create new INSERT policy
CREATE POLICY "Users can create assignments for their content" ON public.assignments FOR INSERT
  WITH CHECK (
    -- For hierarchical assignments (with paragraph_id)
    (
      paragraph_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.paragraphs p
        JOIN public.chapters c ON p.chapter_id = c.id
        JOIN public.subjects s ON c.subject_id = s.id
        WHERE p.id = paragraph_id AND (
          s.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.classes cl
            WHERE cl.id = s.class_id AND cl.owner_id = auth.uid()
          )
        )
      )
    )
    OR
    -- For direct class assignments (paragraph_id is null)
    (
      paragraph_id IS NULL AND
      class_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.classes cl
        WHERE cl.id = class_id AND cl.owner_id = auth.uid()
      )
    )
  );

-- Create new UPDATE policy
CREATE POLICY "Users can update assignments they have access to" ON public.assignments FOR UPDATE
  USING (
    -- Hierarchical assignments
    EXISTS (
      SELECT 1 FROM public.paragraphs p
      JOIN public.chapters c ON p.chapter_id = c.id
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE p.id = assignments.paragraph_id AND (
        s.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.classes cl
          WHERE cl.id = s.class_id AND cl.owner_id = auth.uid()
        )
      )
    )
    OR
    -- Direct class assignments
    (
      assignments.paragraph_id IS NULL AND
      assignments.class_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.classes cl
        WHERE cl.id = assignments.class_id AND cl.owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Same conditions for the new values
    EXISTS (
      SELECT 1 FROM public.paragraphs p
      JOIN public.chapters c ON p.chapter_id = c.id
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE p.id = paragraph_id AND (
        s.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.classes cl
          WHERE cl.id = s.class_id AND cl.owner_id = auth.uid()
        )
      )
    )
    OR
    (
      paragraph_id IS NULL AND
      class_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.classes cl
        WHERE cl.id = class_id AND cl.owner_id = auth.uid()
      )
    )
  );

-- Create new DELETE policy
CREATE POLICY "Users can delete assignments they have access to" ON public.assignments FOR DELETE
  USING (
    -- Hierarchical assignments
    EXISTS (
      SELECT 1 FROM public.paragraphs p
      JOIN public.chapters c ON p.chapter_id = c.id
      JOIN public.subjects s ON c.subject_id = s.id
      WHERE p.id = assignments.paragraph_id AND (
        s.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.classes cl
          WHERE cl.id = s.class_id AND cl.owner_id = auth.uid()
        )
      )
    )
    OR
    -- Direct class assignments
    (
      assignments.paragraph_id IS NULL AND
      assignments.class_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.classes cl
        WHERE cl.id = assignments.class_id AND cl.owner_id = auth.uid()
      )
    )
  );

-- Verify
SELECT 'Assignment RLS policies updated successfully' as status;