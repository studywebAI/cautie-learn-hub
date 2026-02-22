-- Drop the role column from class_members since role is now global (subscription_type in profiles)
-- Role is no longer class-specific - it's a global user type across the entire website

-- First, drop the RLS policies that depend on the role column
DROP POLICY IF EXISTS class_members_insert_teachers ON class_members;
DROP POLICY IF EXISTS attendance_all_teachers ON student_attendance;

-- Now drop the role column
ALTER TABLE class_members DROP COLUMN IF EXISTS role;

-- Add a comment to clarify the table structure
COMMENT ON TABLE class_members IS 'Links users to classes. User role is determined globally by profiles.subscription_type';
