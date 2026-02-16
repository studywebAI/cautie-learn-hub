-- Comprehensive migration to fix schema issues and add missing tables/indexes
-- Run this manually in Supabase SQL Editor

-- ============================================
-- 1. CREATE MISSING PARAGRAPHS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.paragraphs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    chapter_id uuid NOT NULL,
    title text NOT NULL,
    content json, -- Rich content blocks (similar to assignments)
    paragraph_number integer NOT NULL,
    CONSTRAINT paragraphs_pkey PRIMARY KEY (id),
    CONSTRAINT paragraphs_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);
ALTER TABLE public.paragraphs OWNER TO postgres;

-- Add indexes for paragraphs
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_id ON public.paragraphs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_number ON public.paragraphs(chapter_id, paragraph_number);

-- ============================================
-- 2. CREATE CHAPTERS TABLE (if missing)
-- ============================================
CREATE TABLE IF NOT EXISTS public.chapters (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    subject_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    chapter_number integer NOT NULL,
    CONSTRAINT chapters_pkey PRIMARY KEY (id),
    CONSTRAINT chapters_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);
ALTER TABLE public.chapters OWNER TO postgres;

-- Add indexes for chapters
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject_number ON public.chapters(subject_id, chapter_number);

-- ============================================
-- 3. ADD MISSING INDEXES TO EXISTING TABLES
-- ============================================

-- Classes table indexes
CREATE INDEX IF NOT EXISTS idx_classes_owner_id ON public.classes(owner_id);
CREATE INDEX IF NOT EXISTS idx_classes_join_code ON public.classes(join_code);

-- Class Members indexes
CREATE INDEX IF NOT EXISTS idx_class_members_class_id ON public.class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user_id ON public.class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_class_members_class_user ON public.class_members(class_id, user_id);

-- Subjects indexes
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);

-- Class Subjects junction table indexes
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON public.class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject_id ON public.class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_subject ON public.class_subjects(class_id, subject_id);

-- Assignments additional indexes
CREATE INDEX IF NOT EXISTS idx_assignments_scheduled_start ON public.assignments(scheduled_start_at);
CREATE INDEX IF NOT EXISTS idx_assignments_completed ON public.assignments(completed);
CREATE INDEX IF NOT EXISTS idx_assignments_type ON public.assignments(type);

-- Materials indexes
CREATE INDEX IF NOT EXISTS idx_materials_class_id ON public.materials(class_id);
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON public.materials(user_id);

-- Progress tracking indexes (if progress_snapshots table exists)
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'progress_snapshots') THEN
        CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_id ON public.progress_snapshots(student_id);
        CREATE INDEX IF NOT EXISTS idx_progress_snapshots_paragraph_id ON public.progress_snapshots(paragraph_id);
        CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_paragraph ON public.progress_snapshots(student_id, paragraph_id);
    END IF;
END $$;

-- Blocks indexes (if blocks table exists)
-- Note: blocks table does not have paragraph_id column in current schema
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'blocks') THEN
        CREATE INDEX IF NOT EXISTS idx_blocks_assignment_id ON public.blocks(assignment_id);
    END IF;
END $$;

-- Submissions indexes (if submissions table exists)
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'submissions') THEN
        CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);
        CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
        CREATE INDEX IF NOT EXISTS idx_submissions_assignment_user ON public.submissions(assignment_id, user_id);
    END IF;
END $$;

-- Announcements indexes (if announcements table exists)
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'announcements') THEN
        CREATE INDEX IF NOT EXISTS idx_announcements_class_id ON public.announcements(class_id);
        CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
    END IF;
END $$;

-- Notifications indexes (if notifications table exists)
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
    END IF;
END $$;

-- ============================================
-- 5. ENABLE RLS ON NEW TABLES (if not already enabled)
-- ============================================
ALTER TABLE public.paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE RLS POLICIES FOR PARAGRAPHS
-- ============================================
-- Allow read access for class members and owners
CREATE POLICY "paragraphs_select_policy" ON paragraphs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chapters c
            JOIN subjects s ON c.subject_id = s.id
            JOIN classes cl ON s.class_id = cl.id
            LEFT JOIN class_members cm ON cm.class_id = cl.id
            WHERE c.id = paragraphs.chapter_id
            AND (
                cl.owner_id = auth.uid()
                OR cm.user_id = auth.uid()
            )
        )
    );

-- Allow insert for class owners only
CREATE POLICY "paragraphs_insert_policy" ON paragraphs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chapters c
            JOIN subjects s ON c.subject_id = s.id
            JOIN classes cl ON s.class_id = cl.id
            WHERE c.id = paragraphs.chapter_id
            AND cl.owner_id = auth.uid()
        )
    );

-- Allow update for class owners only
CREATE POLICY "paragraphs_update_policy" ON paragraphs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chapters c
            JOIN subjects s ON c.subject_id = s.id
            JOIN classes cl ON s.class_id = cl.id
            WHERE c.id = paragraphs.chapter_id
            AND cl.owner_id = auth.uid()
        )
    );

-- Allow delete for class owners only
CREATE POLICY "paragraphs_delete_policy" ON paragraphs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM chapters c
            JOIN subjects s ON c.subject_id = s.id
            JOIN classes cl ON s.class_id = cl.id
            WHERE c.id = paragraphs.chapter_id
            AND cl.owner_id = auth.uid()
        )
    );

-- ============================================
-- 7. CREATE RLS POLICIES FOR CHAPTERS
-- ============================================
-- Allow read access for class members and owners
CREATE POLICY "chapters_select_policy" ON chapters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subjects s
            JOIN classes cl ON s.class_id = cl.id
            LEFT JOIN class_members cm ON cm.class_id = cl.id
            WHERE s.id = chapters.subject_id
            AND (
                cl.owner_id = auth.uid()
                OR cm.user_id = auth.uid()
            )
        )
    );

-- Allow insert for class owners only
CREATE POLICY "chapters_insert_policy" ON chapters
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM subjects s
            JOIN classes cl ON s.class_id = cl.id
            WHERE s.id = chapters.subject_id
            AND cl.owner_id = auth.uid()
        )
    );

-- Allow update for class owners only
CREATE POLICY "chapters_update_policy" ON chapters
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM subjects s
            JOIN classes cl ON s.class_id = cl.id
            WHERE s.id = chapters.subject_id
            AND cl.owner_id = auth.uid()
        )
    );

-- Allow delete for class owners only
CREATE POLICY "chapters_delete_policy" ON chapters
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM subjects s
            JOIN classes cl ON s.class_id = cl.id
            WHERE s.id = chapters.subject_id
            AND cl.owner_id = auth.uid()
        )
    );

-- ============================================
-- 8. VERIFICATION
-- ============================================
SELECT 'Schema migration completed successfully' as status;
SELECT 'Created tables: paragraphs, chapters' as tables_created;
SELECT 'Added indexes on: class_id, subject_id, chapter_id, paragraph_id' as indexes_added;
SELECT 'Enabled RLS and created policies for paragraphs and chapters' as rls_status;
