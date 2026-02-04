-- Create a join table for class-subject relationships
-- This allows a subject to be linked to multiple classes
CREATE TABLE IF NOT EXISTS public.class_subjects (
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, subject_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON public.class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject_id ON public.class_subjects(subject_id);

-- Enable RLS for the join table
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for class_subjects
DROP POLICY IF EXISTS "Users can view linked subjects for their classes" ON public.class_subjects;
CREATE POLICY "Users can view linked subjects for their classes" ON public.class_subjects FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_subjects.class_id AND (
      c.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.class_members cm
        WHERE cm.class_id = c.id AND cm.user_id = auth.uid()
      )
    )
  ));

DROP POLICY IF EXISTS "Class owners can manage linked subjects" ON public.class_subjects;
CREATE POLICY "Class owners can manage linked subjects" ON public.class_subjects FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_subjects.class_id AND c.owner_id = auth.uid()
  ));

-- Migrate existing subjects to the new join table
INSERT INTO public.class_subjects (class_id, subject_id, created_at)
SELECT class_id, id, created_at
FROM public.subjects
WHERE class_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Remove the class_id column from the subjects table
ALTER TABLE public.subjects DROP COLUMN IF EXISTS class_id;