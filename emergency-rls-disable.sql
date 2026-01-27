-- EMERGENCY: Complete RLS disable for remaining tables
-- Drop existing temp policies and create new ones

-- Drop any existing temp policies first
DROP POLICY IF EXISTS "temp_allow_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "temp_allow_all_classes" ON public.classes;
DROP POLICY IF EXISTS "temp_allow_all_class_members" ON public.class_members;
DROP POLICY IF EXISTS "temp_allow_all_subjects" ON public.subjects;
DROP POLICY IF EXISTS "temp_allow_all_chapters" ON public.chapters;
DROP POLICY IF EXISTS "temp_allow_all_paragraphs" ON public.paragraphs;
DROP POLICY IF EXISTS "temp_allow_all_assignments" ON public.assignments;
DROP POLICY IF EXISTS "temp_allow_all_blocks" ON public.blocks;
DROP POLICY IF EXISTS "temp_allow_all_materials" ON public.materials;
DROP POLICY IF EXISTS "temp_allow_all_submissions" ON public.submissions;
DROP POLICY IF EXISTS "temp_allow_all_progress" ON public.progress_snapshots;
DROP POLICY IF EXISTS "temp_allow_all_sessions" ON public.session_logs;
DROP POLICY IF EXISTS "temp_allow_all_answers" ON public.student_answers;

-- Disable RLS on remaining tables
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.paragraphs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers DISABLE ROW LEVEL SECURITY;

-- Create temporary permissive policies for remaining tables
CREATE POLICY "temp_allow_all_subjects" ON public.subjects FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "temp_allow_all_chapters" ON public.chapters FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "temp_allow_all_paragraphs" ON public.paragraphs FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "temp_allow_all_assignments" ON public.assignments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "temp_allow_all_blocks" ON public.blocks FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "temp_allow_all_materials" ON public.materials FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "temp_allow_all_submissions" ON public.submissions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "temp_allow_all_progress" ON public.progress_snapshots FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "temp_allow_all_sessions" ON public.session_logs FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "temp_allow_all_answers" ON public.student_answers FOR ALL USING (auth.uid() IS NOT NULL);

SELECT 'Emergency RLS disabled on remaining tables - subjects API should work now' as status;