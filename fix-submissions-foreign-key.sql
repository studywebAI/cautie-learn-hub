-- Fix submissions table foreign key relationship
-- Run this in Supabase SQL editor to ensure proper relationships

-- First, check if submissions table exists and drop it if it's malformed
DROP TABLE IF EXISTS submissions CASCADE;

-- Recreate submissions table with proper foreign key to assignments
CREATE TABLE IF NOT EXISTS submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content jsonb,
    files jsonb DEFAULT '[]'::jsonb,
    submitted_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    status text DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded')),
    grade numeric,
    feedback text,
    graded_at timestamptz,
    graded_by uuid,
    CONSTRAINT submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    CONSTRAINT submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT unique_assignment_user UNIQUE (assignment_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS submissions_assignment_id_idx ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS submissions_user_id_idx ON submissions(user_id);

-- Enable RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view their own submissions" ON submissions;
DROP POLICY IF EXISTS "Students can insert their own submissions" ON submissions;
DROP POLICY IF EXISTS "Students can update their own submissions" ON submissions;
DROP POLICY IF EXISTS "Teachers can view submissions for their assignments" ON submissions;
DROP POLICY IF EXISTS "Teachers can grade submissions for their assignments" ON submissions;

-- Recreate RLS policies
CREATE POLICY "Students can view their own submissions" ON submissions FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN classes c ON a.class_id = c.id
    WHERE a.id = submissions.assignment_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their own submissions" ON submissions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN class_members cm ON a.class_id = cm.class_id
    WHERE a.id = assignment_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Students can update their own submissions" ON submissions FOR UPDATE USING (
  auth.uid() = user_id AND status IN ('draft', 'submitted')
);

CREATE POLICY "Teachers can view submissions for their assignments" ON submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN classes c ON a.class_id = c.id
    WHERE a.id = submissions.assignment_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Teachers can grade submissions for their assignments" ON submissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN classes c ON a.class_id = c.id
    WHERE a.id = submissions.assignment_id AND c.owner_id = auth.uid()
  )
);