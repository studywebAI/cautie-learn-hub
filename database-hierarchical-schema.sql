-- Hierarchical Learning Platform Schema
-- Classes → Subjects → Chapters → Paragraphs → Assignments → Blocks

-- Users and classes foundation (existing tables assumed)
-- classes, class_members already exist

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title text NOT NULL,
    class_label text, -- e.g., "A2"
    cover_type text NOT NULL DEFAULT 'ai_icons' CHECK (cover_type IN ('image', 'ai_icons')),
    cover_image_url text,
    ai_icon_seed text, -- deterministic seed for AI-generated icons
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    chapter_number int NOT NULL, -- auto increment per subject
    title text NOT NULL,
    ai_summary text,
    summary_overridden boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(subject_id, chapter_number)
);

-- Paragraphs table
CREATE TABLE IF NOT EXISTS paragraphs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    paragraph_number int NOT NULL, -- auto increment per chapter
    title text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(chapter_id, paragraph_number)
);

-- Assignments table (A-Z, AA-ZZ, etc.)
CREATE TABLE IF NOT EXISTS assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    paragraph_id uuid NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
    assignment_index int NOT NULL, -- 0=a, 1=b, 26=aa, etc.
    title text NOT NULL,
    answers_enabled boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(paragraph_id, assignment_index)
);

-- Blocks table (core content system)
CREATE TABLE IF NOT EXISTS blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    type text NOT NULL, -- text, image, video, multiple_choice, open_question, etc.
    position float NOT NULL, -- for ordering between blocks
    data jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Student answers
CREATE TABLE IF NOT EXISTS student_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    block_id uuid NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    answer_data jsonb NOT NULL DEFAULT '{}',
    is_correct boolean,
    score int, -- for AI-graded questions
    feedback text,
    graded_by_ai boolean DEFAULT false,
    graded_at timestamptz,
    submitted_at timestamptz DEFAULT now(),
    UNIQUE(student_id, block_id)
);

-- Precomputed progress snapshots
CREATE TABLE IF NOT EXISTS progress_snapshots (
    student_id uuid NOT NULL,
    paragraph_id uuid NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
    completion_percent int NOT NULL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (student_id, paragraph_id)
);

-- Session logs for time tracking
CREATE TABLE IF NOT EXISTS session_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    paragraph_id uuid NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
    started_at timestamptz NOT NULL,
    finished_at timestamptz,
    UNIQUE(student_id, paragraph_id, started_at)
);

-- User preferences (themes, language, etc.)
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme text NOT NULL DEFAULT 'pastel' CHECK (theme IN ('light', 'dark', 'pastel')),
    color_palette text NOT NULL DEFAULT 'default' CHECK (color_palette IN ('default', 'pastel-soft')),
    language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'nl', 'de', 'fr', 'es', 'ru', 'zh')),
    updated_at timestamptz DEFAULT now()
);

-- Subscription tiers (for feature limits)
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    max_chapters int,
    max_storage_gb int,
    features jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_id ON paragraphs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assignments_paragraph_id ON assignments(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_blocks_assignment_id ON blocks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_student_id ON student_answers(student_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_block_id ON student_answers(block_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_id ON progress_snapshots(student_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_student_id ON session_logs(student_id);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_paragraphs_updated_at BEFORE UPDATE ON paragraphs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (Row Level Security)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Subjects: Users can access subjects in classes they belong to
CREATE POLICY "subjects_access_policy" ON subjects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM classes c
            JOIN class_members cm ON cm.class_id = c.id
            WHERE c.id = subjects.class_id
            AND cm.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = subjects.class_id
            AND c.owner_id = auth.uid()
        )
    );

-- Chapters: Same as subjects
CREATE POLICY "chapters_access_policy" ON chapters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM subjects s
            JOIN classes c ON c.id = s.class_id
            JOIN class_members cm ON cm.class_id = c.id
            WHERE s.id = chapters.subject_id
            AND cm.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM subjects s
            JOIN classes c ON c.id = s.class_id
            WHERE s.id = chapters.subject_id
            AND c.owner_id = auth.uid()
        )
    );

-- Similar policies for paragraphs, assignments, blocks...

-- Student answers: Students can only see their own answers, teachers can see all in their classes
CREATE POLICY "student_answers_policy" ON student_answers
    FOR ALL USING (
        student_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM blocks b
            JOIN assignments a ON a.id = b.assignment_id
            JOIN paragraphs p ON p.id = a.paragraph_id
            JOIN chapters ch ON ch.id = p.chapter_id
            JOIN subjects s ON s.id = ch.subject_id
            JOIN classes c ON c.id = s.class_id
            WHERE b.id = student_answers.block_id
            AND (c.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM class_members cm WHERE cm.class_id = c.id AND cm.user_id = auth.uid() AND cm.role = 'teacher'))
        )
    );

-- User preferences: Users can only access their own preferences
CREATE POLICY "user_preferences_policy" ON user_preferences
    FOR ALL USING (user_id = auth.uid());