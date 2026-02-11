-- Migration: Add class_id column to assignments for easier agenda/deadline linking
-- Run this in Supabase SQL Editor

-- Step 1: Add class_id column to assignments table
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

-- Step 2: Create index on class_id for faster queries
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON public.assignments(class_id);

-- Step 3: Backfill class_id for existing assignments
UPDATE public.assignments a
SET class_id = s.class_id
FROM public.paragraphs p
JOIN public.chapters c ON p.chapter_id = c.id
JOIN public.subjects s ON c.subject_id = s.id
WHERE a.paragraph_id = p.id AND a.class_id IS NULL;

-- Step 4: Create a trigger to automatically set class_id when paragraph_id is set
CREATE OR REPLACE FUNCTION public.set_assignment_class_id()
RETURNS trigger AS $$
BEGIN
    IF NEW.paragraph_id IS NOT NULL AND (NEW.class_id IS NULL OR OLD.paragraph_id IS DISTINCT FROM NEW.paragraph_id) THEN
        UPDATE public.assignments a
        SET class_id = s.class_id
        FROM public.paragraphs p
        JOIN public.chapters c ON p.chapter_id = c.id
        JOIN public.subjects s ON c.subject_id = s.id
        WHERE p.id = NEW.paragraph_id AND a.id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger to auto-update class_id when assignment's paragraph_id changes
DROP TRIGGER IF EXISTS trigger_set_assignment_class_id ON public.assignments;
CREATE TRIGGER trigger_set_assignment_class_id
    BEFORE INSERT OR UPDATE OF paragraph_id ON public.assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_assignment_class_id();

-- Step 6: Also backfill any NULL class_ids from the subjects table directly (for assignments that might have orphan paragraph_ids)
UPDATE public.assignments a
SET class_id = s.class_id
FROM public.subjects s
WHERE a.class_id IS NULL
AND a.paragraph_id IN (
    SELECT p.id FROM public.paragraphs p
    JOIN public.chapters c ON p.chapter_id = c.id
    WHERE c.subject_id IN (
        SELECT id FROM public.subjects WHERE class_id IS NOT NULL
    )
);

-- Verify the changes
SELECT 'Assignments with class_id backfilled' as status;
SELECT COUNT(*) FILTER (WHERE class_id IS NOT NULL) as assignments_with_class_id,
       COUNT(*) FILTER (WHERE class_id IS NULL) as assignments_without_class_id
FROM public.assignments;

SELECT 'Migration complete' as status;