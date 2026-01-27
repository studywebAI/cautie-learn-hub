-- SUBJECTS HIERARCHY SCHEMA - COMPLETE VERSION
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
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
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
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    paragraph_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chapter_id, paragraph_number)
);

-- Assignments table (using numeric index, convert to letters in app)
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    paragraph_id UUID REFERENCES public.paragraphs(id) ON DELETE CASCADE,
    assignment_index INTEGER NOT NULL, -- 0=a, 1=b, 26=aa, etc.
    title TEXT NOT NULL,
    answers_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint for assignments (either by paragraph or class)
CREATE UNIQUE INDEX idx_assignments_unique ON public.assignments(
    COALESCE(paragraph_id::text, 'class-' || class_id::text),
    assignment_index
);

-- Blocks table (flexible content system)
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'text', 'image', 'mcq', 'open_question', etc.
    position FLOAT NOT NULL,
    data JSONB NOT NULL, -- Flexible content storage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress snapshots (precomputed)
CREATE TABLE IF NOT EXISTS public.progress_snapshots (
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    paragraph_id UUID NOT NULL REFERENCES public.paragraphs(id) ON DELETE CASCADE,
    completion_percent INTEGER NOT NULL CHECK (completion_percent >= 0 AND completion_percent <= 100),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (student_id, paragraph_id)
);

-- Session logs for time tracking
CREATE TABLE IF NOT EXISTS public.session_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    paragraph_id UUID NOT NULL REFERENCES public.paragraphs(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student answers
CREATE TABLE IF NOT EXISTS public.student_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- RLS Policies - Teachers can manage their class content, students can access their enrolled classes
CREATE POLICY "Teachers can manage chapters" ON public.chapters FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.subjects s
        JOIN public.classes c ON c.id = s.class_id
        WHERE s.id = chapters.subject_id
        AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
    )
);

CREATE POLICY "Students can view chapters" ON public.chapters FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.subjects s
        JOIN public.classes c ON c.id = s.class_id
        JOIN public.class_members cm ON cm.class_id = c.id
        WHERE s.id = chapters.subject_id
        AND cm.user_id = auth.uid()
    )
);

CREATE POLICY "Teachers can manage paragraphs" ON public.paragraphs FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.chapters ch
        JOIN public.subjects s ON s.id = ch.subject_id
        JOIN public.classes c ON c.id = s.class_id
        WHERE ch.id = paragraphs.chapter_id
        AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
    )
);

CREATE POLICY "Students can view paragraphs" ON public.paragraphs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.chapters ch
        JOIN public.subjects s ON s.id = ch.subject_id
        JOIN public.classes c ON c.id = s.class_id
        JOIN public.class_members cm ON cm.class_id = c.id
        WHERE ch.id = paragraphs.chapter_id
        AND cm.user_id = auth.uid()
    )
);

CREATE POLICY "Teachers can manage assignments" ON public.assignments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = assignments.class_id
        AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
    )
);

CREATE POLICY "Students can view assignments" ON public.assignments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.classes c
        JOIN public.class_members cm ON cm.class_id = c.id
        WHERE c.id = assignments.class_id
        AND cm.user_id = auth.uid()
    )
);

CREATE POLICY "Teachers can manage blocks" ON public.blocks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.assignments a
        JOIN public.classes c ON c.id = a.class_id
        WHERE a.id = blocks.assignment_id
        AND (c.user_id = auth.uid() OR c.owner_id = auth.uid())
    )
);

CREATE POLICY "Students can view blocks" ON public.blocks FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.assignments a
        JOIN public.classes c ON c.id = a.class_id
        JOIN public.class_members cm ON cm.class_id = c.id
        WHERE a.id = blocks.assignment_id
        AND cm.user_id = auth.uid()
    )
);

CREATE POLICY "Students can manage their progress" ON public.progress_snapshots FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Students can manage their sessions" ON public.session_logs FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Students can manage their answers" ON public.student_answers FOR ALL USING (auth.uid() = student_id);

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

-- Function to get student progress for a subject
CREATE OR REPLACE FUNCTION get_subject_progress(student_uuid UUID, subject_uuid UUID)
RETURNS TABLE (
    chapter_id UUID,
    chapter_title TEXT,
    chapter_number INTEGER,
    paragraph_count INTEGER,
    completed_paragraphs INTEGER,
    progress_percent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ch.id,
        ch.title,
        ch.chapter_number,
        COUNT(p.id)::INTEGER as paragraph_count,
        COUNT(ps.paragraph_id)::INTEGER as completed_paragraphs,
        CASE
            WHEN COUNT(p.id) = 0 THEN 0
            ELSE ROUND((COUNT(ps.paragraph_id)::FLOAT / COUNT(p.id)::FLOAT) * 100)::INTEGER
        END as progress_percent
    FROM public.chapters ch
    LEFT JOIN public.paragraphs p ON p.chapter_id = ch.id
    LEFT JOIN public.progress_snapshots ps ON ps.paragraph_id = p.id AND ps.student_id = student_uuid
    WHERE ch.subject_id = subject_uuid
    GROUP BY ch.id, ch.title, ch.chapter_number
    ORDER BY ch.chapter_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_id ON public.paragraphs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assignments_paragraph_id ON public.assignments(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_blocks_assignment_id ON public.blocks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_paragraph ON public.progress_snapshots(student_id, paragraph_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_student_paragraph ON public.session_logs(student_id, paragraph_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_student_block ON public.student_answers(student_id, block_id);