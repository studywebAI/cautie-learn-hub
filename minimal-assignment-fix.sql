-- Minimal fix for assignment creation issue
-- Run this to fix the "null value in column class_id" error

-- Drop the existing assignments table (this will delete all existing assignments)
DROP TABLE IF EXISTS public.assignments CASCADE;

-- Create the assignments table without the NOT NULL constraint on class_id
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paragraph_id UUID REFERENCES public.paragraphs(id) ON DELETE CASCADE,
    assignment_index INTEGER NOT NULL, -- 0=a, 1=b, 26=aa, etc.
    title TEXT NOT NULL,
    answers_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index for assignments by paragraph
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_unique ON public.assignments(
    paragraph_id,
    assignment_index
);

-- Enable RLS on assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for assignments (simplified)
CREATE POLICY "Allow authenticated users for assignments" ON public.assignments FOR ALL USING (auth.uid() IS NOT NULL);