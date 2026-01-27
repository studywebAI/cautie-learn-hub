-- Fix missing foreign key relationships and policies (SAFE VERSION - no drops)

-- Ensure proper RLS policies exist for submissions
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can insert their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can update their own submissions" ON public.submissions;

CREATE POLICY "Users can view their own submissions" ON public.submissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own submissions" ON public.submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submissions" ON public.submissions
    FOR UPDATE USING (auth.uid() = user_id);

-- Ensure submissions table has proper RLS enabled
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);

-- Ensure class_chapters table has proper structure (don't recreate if exists)
-- Just add missing columns and constraints if needed
ALTER TABLE public.class_chapters ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;
ALTER TABLE public.class_chapters ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE public.class_chapters ADD COLUMN IF NOT EXISTS user_id uuid;

-- Ensure foreign keys exist (only add if missing)
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'class_chapters_user_id_fkey'
    ) THEN
        ALTER TABLE public.class_chapters
        ADD CONSTRAINT class_chapters_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $;

-- Add missing columns to blocks table if they don't exist
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS chapter_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'blocks_chapter_id_fkey'
    ) THEN
        ALTER TABLE public.blocks ADD CONSTRAINT blocks_chapter_id_fkey
        FOREIGN KEY (chapter_id) REFERENCES public.class_chapters(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add chapter and block references to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS chapter_id uuid;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS block_id uuid;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS content_position jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'assignments_chapter_id_fkey'
    ) THEN
        ALTER TABLE public.assignments ADD CONSTRAINT assignments_chapter_id_fkey
        FOREIGN KEY (chapter_id) REFERENCES public.class_chapters(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'assignments_block_id_fkey'
    ) THEN
        ALTER TABLE public.assignments ADD CONSTRAINT assignments_block_id_fkey
        FOREIGN KEY (block_id) REFERENCES public.blocks(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Ensure RLS is enabled on class_chapters
ALTER TABLE public.class_chapters ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for class_chapters (only create if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'class_chapters' AND policyname = 'Teachers can manage chapters in their classes'
    ) THEN
        CREATE POLICY "Teachers can manage chapters in their classes" ON public.class_chapters
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.classes
                    WHERE classes.id = class_chapters.class_id
                    AND classes.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'class_chapters' AND policyname = 'Students can view chapters in their classes'
    ) THEN
        CREATE POLICY "Students can view chapters in their classes" ON public.class_chapters
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.classes c
                    JOIN public.class_members cm ON cm.class_id = c.id
                    WHERE c.id = class_chapters.class_id
                    AND cm.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'class_chapters' AND policyname = 'Guest access for chapters'
    ) THEN
        CREATE POLICY "Guest access for chapters" ON public.class_chapters
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.classes
                    WHERE classes.id = class_chapters.class_id
                    AND classes.owner_type = 'guest'
                )
            );
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_chapters_class_id ON public.class_chapters(class_id);
CREATE INDEX IF NOT EXISTS idx_class_chapters_order_index ON public.class_chapters(class_id, order_index);
CREATE INDEX IF NOT EXISTS idx_blocks_chapter ON public.blocks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assignments_chapter ON public.assignments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assignments_block ON public.assignments(block_id);