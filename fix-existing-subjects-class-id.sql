-- Fix existing subjects with NULL class_id
-- This migration updates subjects that are linked to classes via class_subjects
-- but have NULL class_id, setting class_id to one of their associated classes

-- First, let's see what we're working with
SELECT 'Subjects with NULL class_id:' as status;
SELECT COUNT(*) FROM public.subjects WHERE class_id IS NULL;

SELECT 'Subjects with class_subjects links but NULL class_id:' as status;
SELECT COUNT(DISTINCT s.id) 
FROM public.subjects s
JOIN public.class_subjects cs ON s.id = cs.subject_id
WHERE s.class_id IS NULL;

-- Update subjects with NULL class_id to use the first associated class from class_subjects
-- Note: If a subject is linked to multiple classes, we'll pick the first one alphabetically
UPDATE public.subjects s
SET class_id = (
  SELECT cs.class_id 
  FROM public.class_subjects cs 
  WHERE cs.subject_id = s.id 
  ORDER BY cs.class_id 
  LIMIT 1
)
WHERE s.class_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM public.class_subjects cs 
    WHERE cs.subject_id = s.id
  );

-- Report the results
SELECT 'Updated subjects:' as status, COUNT(*) as count
FROM public.subjects 
WHERE class_id IS NOT NULL;

SELECT 'Remaining subjects with NULL class_id (no class_subjects link):' as status, COUNT(*) as count
FROM public.subjects 
WHERE class_id IS NULL;

-- Show any subjects that still have NULL class_id (these are truly orphaned)
SELECT 'Orphaned subjects (no class association):' as status;
SELECT id, title, user_id, created_at 
FROM public.subjects 
WHERE class_id IS NULL;