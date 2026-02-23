-- Add back the role column to class_members table
-- This restores the column that was dropped, fixing the schema cache mismatch

ALTER TABLE class_members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';

-- Add comment to clarify the role column
COMMENT ON COLUMN class_members.role IS 'Role of the user in this class: teacher, student, or admin';

-- Update existing members to have 'teacher' role if they are the class owner
UPDATE class_members cm
SET role = 'teacher'
FROM classes c
WHERE cm.class_id = c.id 
  AND c.owner_id = cm.user_id
  AND cm.role != 'teacher';

-- Create index on role column for better query performance
CREATE INDEX IF NOT EXISTS idx_class_members_role ON class_members(role);
