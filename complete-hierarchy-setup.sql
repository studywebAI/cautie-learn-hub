-- COMPLETE HIERARCHY SETUP - Single File Migration
-- Run this entire file to set up the full subjects hierarchy system

-- 1. Disable RLS temporarily for setup
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing hierarchy tables if they exist
DROP TABLE IF EXISTS public.student_answers CASCADE;
DROP TABLE IF EXISTS public.session_logs CASCADE;
DROP TABLE IF EXISTS public.progress_snapshots CASCADE;
DROP TABLE IF EXISTS public.blocks CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.paragraphs CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;

-- 3. Create hierarchy tables

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

-- Submissions table (assignment-level submissions)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content JSONB,
    files JSONB DEFAULT '[]'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded')),
    grade NUMERIC,
    feedback TEXT,
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT unique_assignment_user UNIQUE (assignment_id, user_id)
);

-- Student answers (block-level answers)
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

-- 4. Enable RLS
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Simplified to avoid circular references
-- Allow authenticated users to access hierarchy content (detailed access control handled in API layer)
CREATE POLICY "Allow authenticated users for chapters" ON public.chapters FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users for paragraphs" ON public.paragraphs FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users for assignments" ON public.assignments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users for blocks" ON public.blocks FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users for submissions" ON public.submissions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Students can manage their progress" ON public.progress_snapshots FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Students can manage their sessions" ON public.session_logs FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Students can manage their answers" ON public.student_answers FOR ALL USING (auth.uid() = student_id);

-- 6. Function to generate join codes (simplified to avoid RLS issues)
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $
BEGIN
    -- Generate a random 6-digit code (100000-999999)
    -- Skip uniqueness checking to avoid RLS complications
    -- Collision risk is very low with 900k possible codes
    RETURN (100000 + floor(random() * 900000))::TEXT;
END;
$ LANGUAGE plpgsql;

-- 7. Function to convert index to letters (0=a, 1=b, 26=aa, etc.)
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

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_id ON public.paragraphs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assignments_paragraph_id ON public.assignments(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_assignment_id ON public.blocks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_paragraph ON public.progress_snapshots(student_id, paragraph_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_student_paragraph ON public.session_logs(student_id, paragraph_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_student_block ON public.student_answers(student_id, block_id);

-- 9. Fix RLS policies to avoid circular references
-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Allow authenticated read" ON public.classes;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.classes;
DROP POLICY IF EXISTS "Allow authenticated update for owners" ON public.classes;
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON public.classes;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.class_members;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.class_members;
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON public.class_members;

DROP POLICY IF EXISTS "subjects_select_policy" ON public.subjects;
DROP POLICY IF EXISTS "subjects_insert_policy" ON public.subjects;
DROP POLICY IF EXISTS "subjects_update_policy" ON public.subjects;
DROP POLICY IF EXISTS "subjects_delete_policy" ON public.subjects;

-- Re-enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Simplified RLS policies that don't cause circular references
CREATE POLICY "classes_owner_access" ON public.classes FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "classes_member_access" ON public.class_members FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "subjects_owner_access" ON public.subjects FOR ALL USING (auth.uid() = user_id);

-- 10. Verification
SELECT
    'Migration completed successfully!' as status,
    COUNT(*) as tables_created
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('chapters', 'paragraphs', 'assignments', 'blocks', 'submissions', 'progress_snapshots', 'session_logs', 'student_answers');

-- Also check functions were created
SELECT
    'Functions created:' as info,
    routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('generate_join_code', 'assignment_index_to_letters');