-- Complete Hierarchy Migration Script
-- Run this to set up the full subjects hierarchy system

-- 1. Disable RLS temporarily for setup
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;

-- 2. Run the hierarchy schema
\i database-subjects-hierarchy-complete.sql

-- 3. Re-enable RLS with proper policies
-- (RLS policies are already defined in the schema file)

-- 4. Optional: Insert some sample data for testing
-- Uncomment the following lines to add sample hierarchy data

/*
-- Sample subject
INSERT INTO public.subjects (id, class_id, title, user_id) VALUES
('sample-subject-1', (SELECT id FROM public.classes LIMIT 1), 'Mathematics', (SELECT user_id FROM public.classes LIMIT 1));

-- Sample chapters
INSERT INTO public.chapters (subject_id, chapter_number, title) VALUES
('sample-subject-1', 1, 'Introduction to Algebra'),
('sample-subject-1', 2, 'Linear Equations');

-- Sample paragraphs
INSERT INTO public.paragraphs (chapter_id, paragraph_number, title) VALUES
((SELECT id FROM public.chapters WHERE subject_id = 'sample-subject-1' AND chapter_number = 1), 1, 'What is Algebra?'),
((SELECT id FROM public.chapters WHERE subject_id = 'sample-subject-1' AND chapter_number = 1), 2, 'Basic Operations'),
((SELECT id FROM public.chapters WHERE subject_id = 'sample-subject-1' AND chapter_number = 2), 1, 'Solving Linear Equations');
*/

-- 5. Verify tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
    'chapters', 'paragraphs', 'assignments', 'blocks', 'progress_snapshots', 'session_logs', 'student_answers'
);