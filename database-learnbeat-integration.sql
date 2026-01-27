-- Learnbeat-Style Structured Learning Content System
-- Integration with Cautie platform

-- Create class_chapters table for hierarchical chapter organization
CREATE TABLE IF NOT EXISTS public.class_chapters (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NOT NULL,
    CONSTRAINT class_chapters_pkey PRIMARY KEY (id),
    CONSTRAINT class_chapters_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
    CONSTRAINT class_chapters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add chapter_id to blocks table for chapter-based content
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS chapter_id uuid;

-- Add chapter and block references to assignments for embedded assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS chapter_id uuid;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS block_id uuid;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS content_position jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_chapters_class_id ON public.class_chapters(class_id);
CREATE INDEX IF NOT EXISTS idx_class_chapters_order_index ON public.class_chapters(class_id, order_index);
CREATE INDEX IF NOT EXISTS idx_blocks_chapter ON public.blocks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assignments_chapter ON public.assignments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assignments_block ON public.assignments(block_id);

-- Add check constraint for assignment types (only if it doesn't exist)
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'assignments_type_check'
        AND table_name = 'assignments'
    ) THEN
        ALTER TABLE public.assignments ADD CONSTRAINT assignments_type_check
          CHECK (type IN ('homework', 'test', 'repetition', 'project', 'other'));
    END IF;
END $;

-- Enable RLS on new table
ALTER TABLE public.class_chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_chapters
-- Teachers can manage chapters in their classes
CREATE POLICY "Teachers can manage chapters in their classes" ON public.class_chapters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = class_chapters.class_id
            AND classes.user_id = auth.uid()
        )
    );

-- Students can view chapters in their classes
CREATE POLICY "Students can view chapters in their classes" ON public.class_chapters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.classes c
            JOIN public.class_members cm ON cm.class_id = c.id
            WHERE c.id = class_chapters.class_id
            AND cm.user_id = auth.uid()
        )
    );

-- Guest access for guest classes (if needed)
CREATE POLICY "Guest access for chapters" ON public.class_chapters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.classes
            WHERE classes.id = class_chapters.class_id
            AND classes.owner_type = 'guest'
        )
    );

-- Update existing RLS policies to handle chapter-based content
-- Allow chapter-based block access
DROP POLICY IF EXISTS "Users can manage blocks for their materials" ON public.blocks;
CREATE POLICY "Users can manage blocks for their materials and chapters" ON public.blocks
    FOR ALL USING (
        -- Original: blocks for materials
        EXISTS (
            SELECT 1 FROM public.materials m
            WHERE m.id = blocks.material_id AND m.user_id = auth.uid()
        )
        OR
        -- New: blocks for chapters in teacher's classes
        EXISTS (
            SELECT 1 FROM public.class_chapters cc
            JOIN public.classes c ON c.id = cc.class_id
            WHERE cc.id = blocks.chapter_id AND c.user_id = auth.uid()
        )
    );

-- Update assignment policies for chapter-based assignments
DROP POLICY IF EXISTS "Class owners can create assignments." ON public.assignments;
CREATE POLICY "Class owners and teachers can create assignments" ON public.assignments
    FOR INSERT WITH CHECK (
        -- Original: class-based assignments
        EXISTS (
            SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND (
                classes.owner_id = auth.uid() OR (auth.uid() IS NULL AND classes.owner_type = 'guest')
            )
        )
        OR
        -- New: chapter-based assignments
        EXISTS (
            SELECT 1 FROM class_chapters cc
            JOIN classes c ON c.id = cc.class_id
            WHERE cc.id = assignments.chapter_id AND (
                c.owner_id = auth.uid() OR (auth.uid() IS NULL AND c.owner_type = 'guest')
            )
        )
    );

-- Update assignment update/delete policies
DROP POLICY IF EXISTS "Class owners can update assignments." ON public.assignments;
CREATE POLICY "Class owners and teachers can update assignments" ON public.assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND (
                classes.owner_id = auth.uid() OR (auth.uid() IS NULL AND classes.owner_type = 'guest')
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM class_chapters cc
            JOIN classes c ON c.id = cc.class_id
            WHERE cc.id = assignments.chapter_id AND (
                c.owner_id = auth.uid() OR (auth.uid() IS NULL AND c.owner_type = 'guest')
            )
        )
    );

DROP POLICY IF EXISTS "Class owners can delete assignments." ON public.assignments;
CREATE POLICY "Class owners and teachers can delete assignments" ON public.assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND (
                classes.owner_id = auth.uid() OR (auth.uid() IS NULL AND classes.owner_type = 'guest')
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM class_chapters cc
            JOIN classes c ON c.id = cc.class_id
            WHERE cc.id = assignments.chapter_id AND (
                c.owner_id = auth.uid() OR (auth.uid() IS NULL AND c.owner_type = 'guest')
            )
        )
    );

-- Update assignment select policy for chapter-based assignments
DROP POLICY IF EXISTS "Assignments are viewable by class owners and members." ON public.assignments;
CREATE POLICY "Assignments are viewable by class owners and members" ON public.assignments
    FOR SELECT USING (
        -- Original class-based access
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = assignments.class_id AND (
                classes.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM class_members
                    WHERE class_members.class_id = assignments.class_id AND class_members.user_id = auth.uid()
                )
                OR (auth.uid() IS NULL AND classes.owner_type = 'guest')
            )
        )
        OR
        -- New chapter-based access
        EXISTS (
            SELECT 1 FROM class_chapters cc
            JOIN classes c ON c.id = cc.class_id
            WHERE cc.id = assignments.chapter_id AND (
                c.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM class_members cm
                    WHERE cm.class_id = c.id AND cm.user_id = auth.uid()
                )
                OR (auth.uid() IS NULL AND c.owner_type = 'guest')
            )
        )
    );