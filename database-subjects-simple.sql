-- Function to update updated_at timestamp
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Simple subjects table for immediate functionality
CREATE TABLE IF NOT EXISTS subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title text NOT NULL,
    class_label text,
    cover_type text NOT NULL DEFAULT 'ai_icons' CHECK (cover_type IN ('image', 'ai_icons')),
    cover_image_url text,
    ai_icon_seed text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid NOT NULL
);

-- Add missing columns if they don't exist (for existing tables)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS class_label text;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS cover_type text DEFAULT 'ai_icons';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS ai_icon_seed text;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update existing records to have a default user_id (you may need to adjust this)
-- UPDATE subjects SET user_id = (SELECT user_id FROM classes WHERE classes.id = subjects.class_id LIMIT 1) WHERE user_id IS NULL;

-- Add constraints after data migration
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_cover_type_check;
ALTER TABLE subjects ADD CONSTRAINT subjects_cover_type_check CHECK (cover_type IN ('image', 'ai_icons'));

-- Enable RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "subjects_select_policy" ON subjects
    FOR SELECT USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM classes c
            JOIN class_members cm ON cm.class_id = c.id
            WHERE c.id = subjects.class_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "subjects_insert_policy" ON subjects
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_id
            AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
        )
    );

CREATE POLICY "subjects_update_policy" ON subjects
    FOR UPDATE USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_id
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "subjects_delete_policy" ON subjects
    FOR DELETE USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_id
            AND c.user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);

-- Updated at trigger
CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();