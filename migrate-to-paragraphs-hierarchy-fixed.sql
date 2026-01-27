-- MIGRATION: Rename subchapters to paragraphs and update hierarchy
-- This migration converts the current "subchapters" system to "paragraphs" as per spec

-- Step 1: Handle paragraphs table (skip if already exists from base setup)
DO $
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'paragraphs') THEN
        RAISE NOTICE 'Paragraphs table already exists from base setup - skipping creation';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subchapters') THEN
        -- Rename table if subchapters exists
        ALTER TABLE public.subchapters RENAME TO paragraphs;

        -- Rename indexes
        ALTER INDEX IF EXISTS idx_subchapters_chapter_id RENAME TO idx_paragraphs_chapter_id;
        ALTER INDEX IF EXISTS idx_subchapters_paragraph_number RENAME TO idx_paragraphs_paragraph_number;

        -- Rename constraints
        ALTER TABLE public.paragraphs RENAME CONSTRAINT subchapters_pkey TO paragraphs_pkey;
        ALTER TABLE public.paragraphs RENAME CONSTRAINT subchapters_chapter_id_fkey TO paragraphs_chapter_id_fkey;

        -- Update column name if needed (some schemas call it subchapter_number)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'paragraphs' AND column_name = 'subchapter_number') THEN
            ALTER TABLE public.paragraphs RENAME COLUMN subchapter_number TO paragraph_number;
        END IF;

        RAISE NOTICE 'Renamed subchapters table to paragraphs';
    ELSE
        -- Create paragraphs table if neither exists
        CREATE TABLE IF NOT EXISTS public.paragraphs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
            paragraph_number INTEGER NOT NULL,
            title TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(chapter_id, paragraph_number)
        );

        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_id ON public.paragraphs(chapter_id);
        CREATE INDEX IF NOT EXISTS idx_paragraphs_paragraph_number ON public.paragraphs(chapter_id, paragraph_number);

        RAISE NOTICE 'Created paragraphs table';
    END IF;
END $;

-- Step 2: Update assignments table structure
-- Make class_id optional and ensure paragraph_id is required
DO $$
BEGIN
    -- Make class_id optional (nullable) since assignments can be paragraph-specific
    ALTER TABLE public.assignments ALTER COLUMN class_id DROP NOT NULL;

    -- Ensure paragraph_id is required
    ALTER TABLE public.assignments ALTER COLUMN paragraph_id SET NOT NULL;

    RAISE NOTICE 'Updated assignments table: class_id is now optional, paragraph_id is required';
END $$;

-- Step 3: Update progress_snapshots to reference paragraphs instead of direct subject relationship
-- (This should already be correct if using the complete-hierarchy-setup-fixed-final.sql schema)

-- Step 4: Update session_logs to reference paragraphs
-- (This should already be correct if using the complete-hierarchy-setup-fixed-final.sql schema)

-- Step 5: Enable RLS on paragraphs table
ALTER TABLE public.paragraphs ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users for subchapters" ON public.paragraphs;
DROP POLICY IF EXISTS "Allow authenticated users for paragraphs" ON public.paragraphs;

-- Create new policy
CREATE POLICY "Allow authenticated users for paragraphs" ON public.paragraphs FOR ALL USING (auth.uid() IS NOT NULL);

-- Step 6: Update user_preferences to include theme and language fields
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS color_palette TEXT DEFAULT 'default';

-- Step 7: Create function to get next paragraph number
CREATE OR REPLACE FUNCTION get_next_paragraph_number(chapter_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(paragraph_number), 0) + 1
    INTO next_number
    FROM public.paragraphs
    WHERE chapter_id = chapter_uuid;

    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Assignment A-Z indexing functions
CREATE OR REPLACE FUNCTION assignment_index_to_letters(index INTEGER)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    num INTEGER := index;
BEGIN
    IF num = 0 THEN RETURN 'a'; END IF;

    WHILE num >= 0 LOOP
        result := CHR(97 + (num % 26)) || result;
        num := num / 26 - 1;
        IF num < 0 THEN EXIT; END IF;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_next_assignment_index(paragraph_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_index INTEGER;
BEGIN
    SELECT COALESCE(MAX(assignment_index), -1) + 1
    INTO next_index
    FROM public.assignments
    WHERE paragraph_id = paragraph_uuid;

    RETURN next_index;
END;
$$ LANGUAGE plpgsql;

-- Verification
SELECT
    'Migration completed!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'paragraphs') as paragraphs_table_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'theme') as theme_field_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'language') as language_field_exists;