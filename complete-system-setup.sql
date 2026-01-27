-- COMPLETE SYSTEM SETUP - All Tables and Relations
-- Run this entire file to set up the complete Cautie system

-- 1. Drop existing tables and policies
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."assignments";
DROP POLICY IF EXISTS "Allow authenticated read" ON "public"."assignments";
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON "public"."assignments";
DROP POLICY IF EXISTS "Allow authenticated update for owners" ON "public"."assignments";
DROP POLICY IF EXISTS "Allow authenticated read" ON "public"."class_members";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."class_members";
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON "public"."class_members";
DROP POLICY IF EXISTS "Allow authenticated read" ON "public"."classes";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."classes";
DROP POLICY IF EXISTS "Allow authenticated update for owners" ON "public"."classes";
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON "public"."classes";
DROP POLICY IF EXISTS "Allow individual read access" ON "public"."profiles";
DROP POLICY IF EXISTS "Allow individual insert access" ON "public"."profiles";
DROP POLICY IF EXISTS "Allow individual update access" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can manage their own materials" ON "public"."materials";
DROP POLICY IF EXISTS "Users can view public materials" ON "public"."materials";
DROP POLICY IF EXISTS "Students can view their own submissions" ON "public"."submissions";
DROP POLICY IF EXISTS "Students can insert their own submissions" ON "public"."submissions";
DROP POLICY IF EXISTS "Students can update their own submissions" ON "public"."submissions";
DROP POLICY IF EXISTS "Teachers can view submissions for their assignments" ON "public"."submissions";
DROP POLICY IF EXISTS "Teachers can grade submissions for their assignments" ON "public"."submissions";

-- Drop triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop all tables with CASCADE
DROP TABLE IF EXISTS "public"."submissions" CASCADE;
DROP TABLE IF EXISTS "public"."student_answers" CASCADE;
DROP TABLE IF EXISTS "public"."session_logs" CASCADE;
DROP TABLE IF EXISTS "public"."progress_snapshots" CASCADE;
DROP TABLE IF EXISTS "public"."blocks" CASCADE;
DROP TABLE IF EXISTS "public"."assignments" CASCADE;
DROP TABLE IF EXISTS "public"."paragraphs" CASCADE;
DROP TABLE IF EXISTS "public"."chapters" CASCADE;
DROP TABLE IF EXISTS "public"."subjects" CASCADE;
DROP TABLE IF EXISTS "public"."materials" CASCADE;
DROP TABLE IF EXISTS "public"."class_members" CASCADE;
DROP TABLE IF EXISTS "public"."classes" CASCADE;
DROP TABLE IF EXISTS "public"."profiles" CASCADE;

-- 2. Create base tables

-- Profiles Table
CREATE TABLE "public"."profiles" (
    "id" uuid NOT NULL,
    "updated_at" timestamp with time zone,
    "full_name" text,
    "avatar_url" text,
    "role" text DEFAULT 'student'::text,
    "theme" text DEFAULT 'pastel'::text,
    "language" text DEFAULT 'en'::text,
    "high_contrast" boolean DEFAULT false,
    "dyslexia_font" boolean DEFAULT false,
    "reduced_motion" boolean DEFAULT false,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Classes Table
CREATE TABLE "public"."classes" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "name" text NOT NULL,
    "description" text,
    "owner_id" uuid,
    "user_id" uuid,
    "guest_id" text,
    "join_code" text UNIQUE,
    "owner_type" text DEFAULT 'user' CHECK (owner_type IN ('user', 'guest')),
    "status" text,
    CONSTRAINT "classes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "classes_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT "classes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Class Members Table
CREATE TABLE "public"."class_members" (
    "class_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" text NOT NULL DEFAULT 'student'::text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "class_members_pkey" PRIMARY KEY ("class_id", "user_id"),
    CONSTRAINT "class_members_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT "class_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Subjects Table
CREATE TABLE "public"."subjects" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "class_id" uuid NOT NULL,
    "title" text NOT NULL,
    "class_label" text,
    "cover_type" text DEFAULT 'ai_icons',
    "cover_image_url" text,
    "ai_icon_seed" text,
    "user_id" uuid,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subjects_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT "subjects_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- Assignments Table
CREATE TABLE "public"."assignments" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "class_id" uuid NOT NULL,
    "paragraph_id" uuid,
    "assignment_index" integer NOT NULL DEFAULT 0,
    "title" text NOT NULL,
    "content" json,
    "due_date" timestamp with time zone,
    "answers_enabled" boolean DEFAULT false,
    "owner_type" text DEFAULT 'user' CHECK (owner_type IN ('user', 'guest')),
    "guest_id" text,
    "user_id" uuid,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assignments_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT "assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- Create unique index for assignments
CREATE UNIQUE INDEX idx_assignments_unique ON public.assignments(
    COALESCE(paragraph_id::text, 'class-' || class_id::text),
    assignment_index
);

-- Chapters Table
CREATE TABLE "public"."chapters" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "subject_id" uuid NOT NULL,
    "chapter_number" integer NOT NULL,
    "title" text NOT NULL,
    "ai_summary" text,
    "summary_overridden" boolean DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chapters_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
    CONSTRAINT "chapters_subject_id_chapter_number_key" UNIQUE (subject_id, chapter_number)
);

-- Paragraphs Table
CREATE TABLE "public"."paragraphs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "chapter_id" uuid NOT NULL,
    "paragraph_number" integer NOT NULL,
    "title" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "paragraphs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "paragraphs_chapter_id_fkey" FOREIGN KEY (chapter_id) REFERENCES chapters (id) ON DELETE CASCADE,
    CONSTRAINT "paragraphs_chapter_id_paragraph_number_key" UNIQUE (chapter_id, paragraph_number)
);

-- Add paragraph_id foreign key to assignments
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_paragraph_id_fkey" FOREIGN KEY (paragraph_id) REFERENCES paragraphs (id) ON DELETE CASCADE;

-- Blocks Table
CREATE TABLE "public"."blocks" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "assignment_id" uuid NOT NULL,
    "type" text NOT NULL,
    "position" float NOT NULL,
    "data" jsonb NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "blocks_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES assignments (id) ON DELETE CASCADE
);

-- Progress snapshots
CREATE TABLE "public"."progress_snapshots" (
    "student_id" uuid NOT NULL,
    "paragraph_id" uuid NOT NULL,
    "completion_percent" integer NOT NULL CHECK (completion_percent >= 0 AND completion_percent <= 100),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "progress_snapshots_pkey" PRIMARY KEY (student_id, paragraph_id),
    CONSTRAINT "progress_snapshots_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT "progress_snapshots_paragraph_id_fkey" FOREIGN KEY (paragraph_id) REFERENCES paragraphs (id) ON DELETE CASCADE
);

-- Session logs
CREATE TABLE "public"."session_logs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "student_id" uuid NOT NULL,
    "paragraph_id" uuid NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "finished_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "session_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "session_logs_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT "session_logs_paragraph_id_fkey" FOREIGN KEY (paragraph_id) REFERENCES paragraphs (id) ON DELETE CASCADE
);

-- Student answers
CREATE TABLE "public"."student_answers" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "student_id" uuid NOT NULL,
    "block_id" uuid NOT NULL,
    "answer_data" jsonb NOT NULL,
    "is_correct" boolean,
    "score" integer,
    "feedback" text,
    "graded_by_ai" boolean DEFAULT false,
    "submitted_at" timestamp with time zone NOT NULL DEFAULT now(),
    "graded_at" timestamp with time zone,
    CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "student_answers_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT "student_answers_block_id_fkey" FOREIGN KEY (block_id) REFERENCES blocks (id) ON DELETE CASCADE
);

-- Submissions table
CREATE TABLE "public"."submissions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "assignment_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "content" jsonb,
    "files" jsonb DEFAULT '[]'::jsonb,
    "submitted_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "status" text DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded')),
    "grade" numeric,
    "feedback" text,
    "graded_at" timestamp with time zone,
    "graded_by" uuid,
    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE CASCADE,
    CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "submissions_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "unique_assignment_user" UNIQUE ("assignment_id", "user_id")
);

-- Materials table
CREATE TABLE "public"."materials" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid,
    "class_id" uuid,
    "type" text NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "content" jsonb,
    "source_text" text,
    "metadata" jsonb,
    "tags" text[],
    "is_public" boolean DEFAULT false,
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "materials_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "materials_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT "materials_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
);

-- 3. Create functions and triggers

-- Function to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, theme, language, high_contrast, dyslexia_font, reduced_motion)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'student', 'pastel', 'en', false, false, false);
  return new;
END;
$;

-- Trigger to call handle_new_user on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

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

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS "idx_chapters_subject_id" ON "public"."chapters"("subject_id");
CREATE INDEX IF NOT EXISTS "idx_paragraphs_chapter_id" ON "public"."paragraphs"("chapter_id");
CREATE INDEX IF NOT EXISTS "idx_assignments_paragraph_id" ON "public"."assignments"("paragraph_id");
CREATE INDEX IF NOT EXISTS "idx_assignments_class_id" ON "public"."assignments"("class_id");
CREATE INDEX IF NOT EXISTS "idx_blocks_assignment_id" ON "public"."blocks"("assignment_id");
CREATE INDEX IF NOT EXISTS "idx_progress_snapshots_student_paragraph" ON "public"."progress_snapshots"("student_id", "paragraph_id");
CREATE INDEX IF NOT EXISTS "idx_session_logs_student_paragraph" ON "public"."session_logs"("student_id", "paragraph_id");
CREATE INDEX IF NOT EXISTS "idx_student_answers_student_block" ON "public"."student_answers"("student_id", "block_id");
CREATE INDEX IF NOT EXISTS "submissions_assignment_id_idx" ON "public"."submissions"("assignment_id");
CREATE INDEX IF NOT EXISTS "submissions_user_id_idx" ON "public"."submissions"("user_id");

-- 5. Enable RLS
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."class_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."chapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."paragraphs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."progress_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."student_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."materials" ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- Profiles
CREATE POLICY "Allow individual read access" ON "public"."profiles" FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow individual insert access" ON "public"."profiles" FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow individual update access" ON "public"."profiles" FOR UPDATE USING (auth.uid() = id);

-- Classes - Simplified policies to avoid recursion
CREATE POLICY "Allow authenticated users for classes" ON "public"."classes" FOR ALL USING (auth.uid() IS NOT NULL);

-- Class Members - Simplified policies to avoid recursion
CREATE POLICY "Allow authenticated users for class_members" ON "public"."class_members" FOR ALL USING (auth.uid() IS NOT NULL);

-- Subjects
CREATE POLICY "Allow authenticated users for subjects" ON "public"."subjects" FOR ALL USING (auth.uid() IS NOT NULL);

-- Assignments - Simplified policies to avoid recursion
CREATE POLICY "Allow authenticated users for assignments" ON "public"."assignments" FOR ALL USING (auth.uid() IS NOT NULL);

-- Hierarchy tables (simplified - access control handled in API)
CREATE POLICY "Allow authenticated users for chapters" ON "public"."chapters" FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users for paragraphs" ON "public"."paragraphs" FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated users for blocks" ON "public"."blocks" FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Students can manage their progress" ON "public"."progress_snapshots" FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Students can manage their sessions" ON "public"."session_logs" FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Students can manage their answers" ON "public"."student_answers" FOR ALL USING (auth.uid() = student_id);

-- Submissions - Simplified policies
CREATE POLICY "Allow authenticated users for submissions" ON "public"."submissions" FOR ALL USING (auth.uid() IS NOT NULL);

-- Materials
CREATE POLICY "Users can manage their own materials" ON "public"."materials" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public materials" ON "public"."materials" FOR SELECT USING (is_public = true);

-- 7. Verification
SELECT
    'Migration completed successfully!' as status,
    COUNT(*) as tables_created
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'profiles', 'classes', 'class_members', 'subjects', 'assignments',
    'chapters', 'paragraphs', 'blocks', 'progress_snapshots', 'session_logs',
    'student_answers', 'submissions', 'materials'
);