-- Fix dual assignments system - ensure both original and hierarchical assignments coexist

-- First, check if we need to recreate the original assignments table
-- The hierarchical schema creates assignments with paragraph_id
-- But the submissions system expects assignments with class_id

-- Rename hierarchical assignments to avoid conflict
ALTER TABLE assignments RENAME TO hierarchical_assignments;

-- Recreate the original assignments table for class-based assignments
CREATE TABLE IF NOT EXISTS assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title text NOT NULL,
    content jsonb,
    due_date timestamptz,
    created_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id),
    owner_type text DEFAULT 'user' CHECK (owner_type IN ('user', 'guest')),
    guest_id text
);

-- Rename hierarchical assignments back
ALTER TABLE hierarchical_assignments RENAME TO assignments;

-- Now recreate submissions table that references the correct assignments
DROP TABLE IF EXISTS submissions CASCADE;

CREATE TABLE submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content jsonb,
    files jsonb DEFAULT '[]'::jsonb,
    submitted_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    status text DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded')),
    grade numeric,
    feedback text,
    graded_at timestamptz,
    graded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT unique_assignment_user UNIQUE (assignment_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS submissions_assignment_id_idx ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS submissions_user_id_idx ON submissions(user_id);

-- Enable RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (updated for hierarchical assignments that have paragraph_id)
DROP POLICY IF EXISTS "Students can view their own submissions" ON submissions;
DROP POLICY IF EXISTS "Students can insert their own submissions" ON submissions;
DROP POLICY IF EXISTS "Students can update their own submissions" ON submissions;
DROP POLICY IF EXISTS "Teachers can view submissions for their assignments" ON submissions;
DROP POLICY IF EXISTS "Teachers can grade submissions for their assignments" ON submissions;

-- For hierarchical assignments (paragraph-based), we need to traverse up to find the class
CREATE POLICY "Students can view their own submissions" ON submissions FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN paragraphs p ON a.paragraph_id = p.id
    JOIN chapters ch ON p.chapter_id = ch.id
    JOIN subjects s ON ch.subject_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE a.id = submissions.assignment_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their own submissions" ON submissions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN paragraphs p ON a.paragraph_id = p.id
    JOIN chapters ch ON p.chapter_id = ch.id
    JOIN subjects s ON ch.subject_id = s.id
    JOIN class_members cm ON s.class_id = cm.class_id
    WHERE a.id = assignment_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Students can update their own submissions" ON submissions FOR UPDATE USING (
  auth.uid() = user_id AND status IN ('draft', 'submitted')
);

CREATE POLICY "Teachers can view submissions for their assignments" ON submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN paragraphs p ON a.paragraph_id = p.id
    JOIN chapters ch ON p.chapter_id = ch.id
    JOIN subjects s ON ch.subject_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE a.id = submissions.assignment_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Teachers can grade submissions for their assignments" ON submissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN paragraphs p ON a.paragraph_id = p.id
    JOIN chapters ch ON p.chapter_id = ch.id
    JOIN subjects s ON ch.subject_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE a.id = submissions.assignment_id AND c.owner_id = auth.uid()
  )
);