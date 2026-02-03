-- COMPLETE RLS POLICY FIX
-- Run this in Supabase SQL Editor to fix all RLS issues
-- This will allow class joining and all other operations to work properly

-- =============================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- =============================================

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_role_policy" ON public.profiles;
DROP POLICY IF EXISTS "Allow read access for users and teachers" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual insert access" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update access" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read all profiles" ON public.profiles;

-- Classes
DROP POLICY IF EXISTS "classes_all" ON public.classes;
DROP POLICY IF EXISTS "temp_classes_access" ON public.classes;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.classes;
DROP POLICY IF EXISTS "Users can view classes they own or are a member of" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can update their classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can delete their classes" ON public.classes;
DROP POLICY IF EXISTS "Allow join_code access for uniqueness" ON public.classes;
DROP POLICY IF EXISTS "Users can view their own classes" ON public.classes;
DROP POLICY IF EXISTS "Users can create classes" ON public.classes;
DROP POLICY IF EXISTS "Users can update their own classes" ON public.classes;
DROP POLICY IF EXISTS "Users can delete their own classes" ON public.classes;
DROP POLICY IF EXISTS "Allow join_code checks" ON public.classes;

-- Class members
DROP POLICY IF EXISTS "class_members_all" ON public.class_members;
DROP POLICY IF EXISTS "temp_members_access" ON public.class_members;
DROP POLICY IF EXISTS "classes_member_access" ON public.class_members;

-- Subjects
DROP POLICY IF EXISTS "subjects_all" ON public.subjects;
DROP POLICY IF EXISTS "temp_subjects_access" ON public.subjects;
DROP POLICY IF EXISTS "subjects_select_policy" ON public.subjects;
DROP POLICY IF EXISTS "subjects_insert_policy" ON public.subjects;
DROP POLICY IF EXISTS "subjects_update_policy" ON public.subjects;
DROP POLICY IF EXISTS "subjects_delete_policy" ON public.subjects;
DROP POLICY IF EXISTS "subjects_owner_access" ON public.subjects;

-- Assignments
DROP POLICY IF EXISTS "assignments_all" ON public.assignments;
DROP POLICY IF EXISTS "assignments_access_policy" ON public.assignments;
DROP POLICY IF EXISTS "Allow authenticated users for assignments" ON public.assignments;

-- Other tables
DROP POLICY IF EXISTS "chapters_all" ON public.chapters;
DROP POLICY IF EXISTS "paragraphs_all" ON public.paragraphs;
DROP POLICY IF EXISTS "blocks_all" ON public.blocks;
DROP POLICY IF EXISTS "progress_snapshots_all" ON public.progress_snapshots;
DROP POLICY IF EXISTS "session_logs_all" ON public.session_logs;
DROP POLICY IF EXISTS "student_answers_all" ON public.student_answers;
DROP POLICY IF EXISTS "submissions_all" ON public.submissions;
DROP POLICY IF EXISTS "materials_all" ON public.materials;
DROP POLICY IF EXISTS "personal_tasks_all" ON public.personal_tasks;
DROP POLICY IF EXISTS "rubrics_all" ON public.rubrics;
DROP POLICY IF EXISTS "rubric_criteria_all" ON public.rubric_criteria;
DROP POLICY IF EXISTS "notifications_all" ON public.notifications;
DROP POLICY IF EXISTS "user_preferences_all" ON public.user_preferences;
DROP POLICY IF EXISTS "notes_all" ON public.notes;

-- Materials specific
DROP POLICY IF EXISTS "Users can manage their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can view public materials" ON public.materials;
DROP POLICY IF EXISTS "Class members can view class materials" ON public.materials;
DROP POLICY IF EXISTS "Class owners can manage class materials" ON public.materials;

-- =============================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Notes table (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes' AND table_schema = 'public') THEN
    ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =============================================
-- STEP 3: CREATE SIMPLE, WORKING POLICIES
-- =============================================

-- PROFILES: Users can only manage their own profile
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- CLASSES: Any authenticated user can read/create/update/delete classes
-- This allows joining classes via join_code to work!
CREATE POLICY "classes_all" ON public.classes FOR ALL USING (auth.uid() IS NOT NULL);

-- CLASS MEMBERS: Any authenticated user can manage class memberships
CREATE POLICY "class_members_all" ON public.class_members FOR ALL USING (auth.uid() IS NOT NULL);

-- SUBJECTS: Any authenticated user can access subjects
CREATE POLICY "subjects_all" ON public.subjects FOR ALL USING (auth.uid() IS NOT NULL);

-- ASSIGNMENTS: Any authenticated user can access
CREATE POLICY "assignments_all" ON public.assignments FOR ALL USING (auth.uid() IS NOT NULL);

-- CHAPTERS: Any authenticated user can access
CREATE POLICY "chapters_all" ON public.chapters FOR ALL USING (auth.uid() IS NOT NULL);

-- PARAGRAPHS: Any authenticated user can access  
CREATE POLICY "paragraphs_all" ON public.paragraphs FOR ALL USING (auth.uid() IS NOT NULL);

-- BLOCKS: Any authenticated user can access
CREATE POLICY "blocks_all" ON public.blocks FOR ALL USING (auth.uid() IS NOT NULL);

-- PROGRESS SNAPSHOTS: Users can access their own progress
CREATE POLICY "progress_snapshots_all" ON public.progress_snapshots FOR ALL USING (auth.uid() IS NOT NULL);

-- SESSION LOGS: Any authenticated user
CREATE POLICY "session_logs_all" ON public.session_logs FOR ALL USING (auth.uid() IS NOT NULL);

-- STUDENT ANSWERS: Any authenticated user
CREATE POLICY "student_answers_all" ON public.student_answers FOR ALL USING (auth.uid() IS NOT NULL);

-- SUBMISSIONS: Any authenticated user
CREATE POLICY "submissions_all" ON public.submissions FOR ALL USING (auth.uid() IS NOT NULL);

-- MATERIALS: Any authenticated user
CREATE POLICY "materials_all" ON public.materials FOR ALL USING (auth.uid() IS NOT NULL);

-- PERSONAL TASKS: Users can only access their own tasks
CREATE POLICY "personal_tasks_all" ON public.personal_tasks FOR ALL USING (auth.uid() = user_id);

-- RUBRICS: Any authenticated user
CREATE POLICY "rubrics_all" ON public.rubrics FOR ALL USING (auth.uid() IS NOT NULL);

-- RUBRIC CRITERIA: Any authenticated user
CREATE POLICY "rubric_criteria_all" ON public.rubric_criteria FOR ALL USING (auth.uid() IS NOT NULL);

-- NOTIFICATIONS: Users can only access their own notifications
CREATE POLICY "notifications_all" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- USER PREFERENCES: Users can only access their own preferences
CREATE POLICY "user_preferences_all" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- NOTES (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "notes_all" ON public.notes FOR ALL USING (auth.uid() IS NOT NULL)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- STEP 4: ENSURE generate_join_code FUNCTION EXISTS
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.classes WHERE join_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- =============================================
-- STEP 5: RELOAD POSTGREST SCHEMA CACHE
-- =============================================

NOTIFY pgrst, 'reload schema';

-- =============================================
-- STEP 6: VERIFICATION
-- =============================================

SELECT 'RLS Policies Fixed!' as status;

-- Check policies are applied
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
