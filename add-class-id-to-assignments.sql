-- Add class_id to assignments table for compatibility with existing API
-- Run this in Supabase SQL editor

ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON public.assignments(class_id);

-- Update RLS policy to allow access based on class ownership
DROP POLICY IF EXISTS "assignments_access_policy" ON public.assignments;
CREATE POLICY "assignments_access_policy" ON public.assignments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = assignments.class_id AND (
      c.owner_id = auth.uid() OR
      c.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.class_members cm WHERE cm.class_id = c.id AND cm.user_id = auth.uid())
    )
  )
);