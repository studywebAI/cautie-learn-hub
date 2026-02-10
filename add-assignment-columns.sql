-- SQL migration script to add grading and scheduling columns to assignments table

-- Add columns for assignment visibility and locking
ALTER TABLE assignments 
ADD COLUMN is_visible BOOLEAN DEFAULT TRUE,
ADD COLUMN is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN answer_mode VARCHAR(50) DEFAULT 'teacher_grade',
ADD COLUMN ai_grading_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN ai_grading_strictness INTEGER DEFAULT 5,
ADD COLUMN ai_grading_check_spelling BOOLEAN DEFAULT TRUE,
ADD COLUMN ai_grading_check_grammar BOOLEAN DEFAULT TRUE,
ADD COLUMN ai_grading_keywords TEXT,
ADD COLUMN scheduled_start_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN scheduled_end_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN scheduled_answer_release_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better query performance
CREATE INDEX idx_assignments_is_visible ON assignments(is_visible);
CREATE INDEX idx_assignments_is_locked ON assignments(is_locked);
CREATE INDEX idx_assignments_answer_mode ON assignments(answer_mode);
CREATE INDEX idx_assignments_ai_grading_enabled ON assignments(ai_grading_enabled);
CREATE INDEX idx_assignments_scheduled_start ON assignments(scheduled_start_at);
CREATE INDEX idx_assignments_scheduled_end ON assignments(scheduled_end_at);
CREATE INDEX idx_assignments_scheduled_answer_release ON assignments(scheduled_answer_release_at);

-- Update existing assignments to have proper default values
UPDATE assignments 
SET answer_mode = 'teacher_grade' 
WHERE answer_mode IS NULL;

UPDATE assignments 
SET ai_grading_enabled = FALSE 
WHERE ai_grading_enabled IS NULL;

UPDATE assignments 
SET is_visible = TRUE 
WHERE is_visible IS NULL;

UPDATE assignments 
SET is_locked = FALSE 
WHERE is_locked IS NULL;

-- Grant necessary permissions (adjust based on your RLS policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON assignments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE assignments_id_seq TO authenticated;

-- Create RLS policies if they don't exist
-- Policy for teachers to view all assignments
CREATE POLICY "Teachers can view all assignments" 
ON assignments FOR SELECT 
USING (auth.jwt() ->> 'user_role' = 'teacher');

-- Policy for students to view only visible assignments
CREATE POLICY "Students can view only visible assignments" 
ON assignments FOR SELECT 
USING (auth.jwt() ->> 'user_role' = 'student' AND is_visible = TRUE);

-- Policy for teachers to manage assignments
CREATE POLICY "Teachers can manage assignments" 
ON assignments FOR ALL 
USING (auth.jwt() ->> 'user_role' = 'teacher');

-- Policy for students to submit to unlocked assignments
CREATE POLICY "Students can submit to unlocked assignments" 
ON submissions FOR INSERT 
WITH CHECK (auth.jwt() ->> 'user_role' = 'student' AND 
           (SELECT is_locked FROM assignments WHERE id = assignment_id) = FALSE);