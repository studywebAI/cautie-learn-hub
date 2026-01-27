-- Chapters and Sub-chapters Management for Subjects
-- This schema provides hierarchical content organization within subjects

-- Function to update updated_at timestamp (create if not exists)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing tables if they exist (clean slate approach)
DROP TABLE IF EXISTS subchapters CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;

-- Chapters table: Represents major sections within a subject
CREATE TABLE chapters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Sub-chapters table: Represents detailed sections within a chapter
CREATE TABLE subchapters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    content jsonb, -- Store rich content or references
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject_order ON chapters(subject_id, order_index);
CREATE INDEX IF NOT EXISTS idx_subchapters_chapter_id ON subchapters(chapter_id);
CREATE INDEX IF NOT EXISTS idx_subchapters_chapter_order ON subchapters(chapter_id, order_index);

-- Updated at triggers
CREATE TRIGGER update_chapters_updated_at
    BEFORE UPDATE ON chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subchapters_updated_at
    BEFORE UPDATE ON subchapters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE subchapters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapters
CREATE POLICY "chapters_select_policy" ON chapters
    FOR SELECT USING (
        -- Users can access chapters of subjects they own or are members of classes containing those subjects
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM subjects s
            JOIN classes c ON c.id = s.class_id
            LEFT JOIN class_members cm ON cm.class_id = c.id AND cm.user_id = auth.uid()
            WHERE s.id = chapters.subject_id
            AND (c.owner_id = auth.uid() OR c.user_id = auth.uid() OR cm.user_id IS NOT NULL)
        )
    );

CREATE POLICY "chapters_insert_policy" ON chapters
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND
        EXISTS (
            SELECT 1 FROM subjects s
            JOIN classes c ON c.id = s.class_id
            WHERE s.id = subject_id
            AND (c.owner_id = auth.uid() OR c.user_id = auth.uid())
        )
    );

CREATE POLICY "chapters_update_policy" ON chapters
    FOR UPDATE USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM subjects s
            JOIN classes c ON c.id = s.class_id
            WHERE s.id = chapters.subject_id
            AND (c.owner_id = auth.uid() OR c.user_id = auth.uid())
        )
    );

CREATE POLICY "chapters_delete_policy" ON chapters
    FOR DELETE USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM subjects s
            JOIN classes c ON c.id = s.class_id
            WHERE s.id = chapters.subject_id
            AND (c.owner_id = auth.uid() OR c.user_id = auth.uid())
        )
    );

-- RLS Policies for subchapters
CREATE POLICY "subchapters_select_policy" ON subchapters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chapters ch
            JOIN subjects s ON s.id = ch.subject_id
            JOIN classes c ON c.id = s.class_id
            LEFT JOIN class_members cm ON cm.class_id = c.id AND cm.user_id = auth.uid()
            WHERE ch.id = subchapters.chapter_id
            AND (c.owner_id = auth.uid() OR c.user_id = auth.uid() OR cm.user_id IS NOT NULL)
        )
    );

CREATE POLICY "subchapters_insert_policy" ON subchapters
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chapters ch
            JOIN subjects s ON s.id = ch.subject_id
            JOIN classes c ON c.id = s.class_id
            WHERE ch.id = chapter_id
            AND (c.owner_id = auth.uid() OR c.user_id = auth.uid())
        )
    );

CREATE POLICY "subchapters_update_policy" ON subchapters
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chapters ch
            JOIN subjects s ON s.id = ch.subject_id
            JOIN classes c ON c.id = s.class_id
            WHERE ch.id = subchapters.chapter_id
            AND (c.owner_id = auth.uid() OR c.user_id = auth.uid())
        )
    );

CREATE POLICY "subchapters_delete_policy" ON subchapters
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM chapters ch
            JOIN subjects s ON s.id = ch.subject_id
            JOIN classes c ON c.id = s.class_id
            WHERE ch.id = subchapters.chapter_id
            AND (c.owner_id = auth.uid() OR c.user_id = auth.uid())
        )
    );