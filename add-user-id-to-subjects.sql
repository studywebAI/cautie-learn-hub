-- Add user_id column to subjects table if it doesn't exist
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing subjects to have user_id from their class owner
UPDATE subjects
SET user_id = classes.owner_id
FROM classes
WHERE subjects.class_id = classes.id AND subjects.user_id IS NULL;

-- Make user_id NOT NULL after data migration
ALTER TABLE subjects ALTER COLUMN user_id SET NOT NULL;