-- Add type column to assignments table
-- This column stores the deadline type: 'homework', 'small_test', or 'big_test'

ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS type text 
CHECK (type IN ('homework', 'small_test', 'big_test'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_assignments_type ON public.assignments(type);

-- Update existing assignments to default to 'homework'
UPDATE public.assignments 
SET type = 'homework' 
WHERE type IS NULL;

-- Show the updated table structure
SELECT 'Assignments table after adding type column:' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'assignments' 
ORDER BY ordinal_position;