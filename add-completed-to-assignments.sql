-- Add completed column to assignments table
-- This tracks whether a deadline/assignment has been completed

ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;

-- Add index for filtering by completion status
CREATE INDEX IF NOT EXISTS idx_assignments_completed ON public.assignments(completed);

-- Show the updated table structure
SELECT 'Assignments table after adding completed column:' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'assignments' 
ORDER BY ordinal_position;