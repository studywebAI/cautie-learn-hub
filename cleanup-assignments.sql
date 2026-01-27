-- Clean up assignments after schema changes
-- This fixes assignments that became invalid after removing class_id and making paragraph_id NOT NULL

-- 1. Delete assignments with null paragraph_id (they were class-level, now invalid)
DELETE FROM public.assignments WHERE paragraph_id IS NULL;

-- 2. Ensure all remaining assignments have valid paragraph_id references
DELETE FROM public.assignments
WHERE paragraph_id IS NOT NULL
AND paragraph_id NOT IN (SELECT id FROM public.paragraphs);

-- 3. Reset assignment_index for each paragraph to be consecutive starting from 0
-- This ensures proper A-Z indexing
WITH ranked_assignments AS (
  SELECT
    id,
    paragraph_id,
    ROW_NUMBER() OVER (PARTITION BY paragraph_id ORDER BY assignment_index, created_at) - 1 as new_index
  FROM public.assignments
  ORDER BY paragraph_id, assignment_index, created_at
)
UPDATE public.assignments
SET assignment_index = ranked_assignments.new_index
FROM ranked_assignments
WHERE public.assignments.id = ranked_assignments.id;

-- 4. Verify data integrity
SELECT
  'Cleanup completed' as status,
  COUNT(*) as assignments_cleaned
FROM public.assignments
WHERE paragraph_id IS NOT NULL;

-- Check for any remaining issues
SELECT
  'Assignments with invalid paragraph_id:' as issue,
  COUNT(*) as count
FROM public.assignments
WHERE paragraph_id NOT IN (SELECT id FROM public.paragraphs);