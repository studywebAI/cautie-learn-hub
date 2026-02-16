-- Add paragraph_id column to assignments table
-- This migration should be run after the paragraphs table exists

-- Step 1: Add the column if it doesn't exist
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS paragraph_id uuid REFERENCES public.paragraphs(id) ON DELETE SET NULL;

-- Step 2: Create index on paragraph_id for faster queries
CREATE INDEX IF NOT EXISTS idx_assignments_paragraph_id ON public.assignments(paragraph_id);

-- Step 3: Backfill paragraph_id for existing assignments that have a paragraph reference
-- (This would need to be done based on your existing data structure)

-- Verification
SELECT 'Successfully added paragraph_id column to assignments' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assignments' 
AND column_name = 'paragraph_id';
