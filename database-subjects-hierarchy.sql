-- SUBJECTS HIERARCHY SCHEMA
-- Real data implementation for subjects with chapters, paragraphs, assignments, blocks

-- Drop existing tables if they exist (to avoid constraint conflicts)
DROP TABLE IF EXISTS public.student_answers CASCADE;
DROP TABLE IF EXISTS public.session_logs CASCADE;
DROP TABLE IF EXISTS public.progress_snapshots CASCADE;
DROP TABLE IF EXISTS public.blocks CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.paragraphs CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;

-- Chapters table
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID NOT NULL,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    ai_summary TEXT,
    summary_overridden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, chapter_number)
);

-- Paragraphs table
CREATE TABLE IF NOT EXISTS public.paragraphs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chapter_id UUID NOT NULL,
    paragraph_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chapter_id, paragraph_number)
);

-- Assignments table (using numeric index, convert to letters in app)
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL, -- Keep for compatibility
    paragraph_id UUID,
    assignment_index INTEGER NOT NULL, -- 0=a, 1=b, 26=aa, etc.
    title TEXT NOT NULL,
    answers_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(COALESCE(paragraph_id, class_id), assignment_index)
);

-- Blocks table (flexible content system)
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL,
    type TEXT NOT NULL, -- 'text', 'image', 'mcq', 'open_question', etc.
    position FLOAT NOT NULL,
    data JSONB NOT NULL, -- Flexible content storage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress snapshots (precomputed)
CREATE TABLE IF NOT EXISTS public.progress_snapshots (
    student_id UUID NOT NULL,
    paragraph_id UUID NOT NULL REFERENCES public.paragraphs(id) ON DELETE CASCADE,
    completion_percent INTEGER NOT NULL CHECK (completion_percent >= 0 AND completion_percent <= 100),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (student_id, paragraph_id)
);

-- Session logs for time tracking
CREATE TABLE IF NOT EXISTS public.session_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,
    paragraph_id UUID NOT NULL REFERENCES public.paragraphs(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student answers
CREATE TABLE IF NOT EXISTS public.student_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,
    block_id UUID NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
    answer_data JSONB NOT NULL,
    is_correct BOOLEAN,
    score INTEGER,
    feedback TEXT,
    graded_by_ai BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    graded_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (simplified for now - allow authenticated users)
CREATE POLICY "Allow authenticated users for chapters" ON public.chapters FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users for paragraphs" ON public.paragraphs FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users for assignments" ON public.assignments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users for blocks" ON public.blocks FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Students can manage their progress" ON public.progress_snapshots FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Students can manage their sessions" ON public.session_logs FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Students can manage their answers" ON public.student_answers FOR ALL USING (auth.uid() IS NOT NULL);

-- Function to convert index to letters (0=a, 1=b, 26=aa, etc.)
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

-- Add foreign key constraints (commented out to avoid execution errors)
-- Run these separately after all tables are created successfully

-- ALTER TABLE public.chapters ADD CONSTRAINT fk_chapters_subject_id
--     FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

-- ALTER TABLE public.paragraphs ADD CONSTRAINT fk_paragraphs_chapter_id
--     FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;

-- ALTER TABLE public.assignments ADD CONSTRAINT fk_assignments_paragraph_id
--     FOREIGN KEY (paragraph_id) REFERENCES public.paragraphs(id) ON DELETE CASCADE;

-- ALTER TABLE public.blocks ADD CONSTRAINT fk_blocks_assignment_id
--     FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;

-- ALTER TABLE public.progress_snapshots ADD CONSTRAINT fk_progress_paragraph_id
--     FOREIGN KEY (paragraph_id) REFERENCES public.paragraphs(id) ON DELETE CASCADE;

-- ALTER TABLE public.session_logs ADD CONSTRAINT fk_session_logs_paragraph_id
--     FOREIGN KEY (paragraph_id) REFERENCES public.paragraphs(id) ON DELETE CASCADE;

-- ALTER TABLE public.student_answers ADD CONSTRAINT fk_student_answers_block_id
--     FOREIGN KEY (block_id) REFERENCES public.blocks(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_id ON public.paragraphs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assignments_paragraph_id ON public.assignments(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_blocks_assignment_id ON public.blocks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_paragraph ON public.progress_snapshots(student_id, paragraph_id);