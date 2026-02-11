-- Migration: Cascade archive subjects when class is archived
-- Run this in Supabase SQL Editor

-- Step 1: Add status column to classes table if not exists
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' NOT NULL;

-- Step 2: Add status column to subjects table if not exists
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' NOT NULL;

-- Step 3: Create trigger function to cascade archive subjects when class is archived
CREATE OR REPLACE FUNCTION public.cascade_class_archive()
RETURNS trigger AS $$
BEGIN
    -- When a class status changes to 'archived', archive all its subjects
    IF NEW.status = 'archived' AND OLD.status != 'archived' THEN
        UPDATE public.subjects 
        SET status = 'archived' 
        WHERE class_id = NEW.id AND status != 'archived';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger on classes table
DROP TRIGGER IF EXISTS trigger_cascade_class_archive ON public.classes;
CREATE TRIGGER trigger_cascade_class_archive
    AFTER UPDATE ON public.classes
    FOR EACH ROW
    EXECUTE FUNCTION public.cascade_class_archive();

-- Step 5: Update existing classes/subjects to 'active' if they have null status
UPDATE public.classes SET status = 'active' WHERE status IS NULL;
UPDATE public.subjects SET status = 'active' WHERE status IS NULL;

-- Verify the changes
SELECT 'Classes status column added' as status;
SELECT id, name, status FROM public.classes LIMIT 5;

SELECT 'Subjects status column added' as status;
SELECT id, title, class_id, status FROM public.subjects LIMIT 5;

SELECT 'Trigger created successfully' as status;
