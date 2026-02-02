-- COMPLETE SYSTEM SETUP (single file)
-- Copy/paste this whole file into Supabase SQL Editor and run it.

-- 1) Drop tables first (CASCADE removes policies, indexes, triggers automatically)
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
DROP TABLE IF EXISTS "public"."personal_tasks" CASCADE;
DROP TABLE IF EXISTS "public"."rubrics" CASCADE;
DROP TABLE IF EXISTS "public"."rubric_criteria" CASCADE;
DROP TABLE IF EXISTS "public"."notifications" CASCADE;
DROP TABLE IF EXISTS "public"."user_preferences" CASCADE;

-- Drop trigger/function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2) Create tables

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

CREATE TABLE "public"."class_members" (
  "class_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL DEFAULT 'student'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "class_members_pkey" PRIMARY KEY ("class_id", "user_id"),
  CONSTRAINT "class_members_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
  CONSTRAINT "class_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

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
  CONSTRAINT "assignments_paragraph_id_fkey" FOREIGN KEY (paragraph_id) REFERENCES paragraphs (id) ON DELETE CASCADE,
  CONSTRAINT "assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

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

CREATE TABLE "public"."progress_snapshots" (
  "student_id" uuid NOT NULL,
  "paragraph_id" uuid NOT NULL,
  "completion_percent" integer NOT NULL CHECK (completion_percent >= 0 AND completion_percent <= 100),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "progress_snapshots_pkey" PRIMARY KEY (student_id, paragraph_id),
  CONSTRAINT "progress_snapshots_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT "progress_snapshots_paragraph_id_fkey" FOREIGN KEY (paragraph_id) REFERENCES paragraphs (id) ON DELETE CASCADE
);

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

CREATE TABLE "public"."materials" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "class_id" uuid,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "content" jsonb,
  "content_id" uuid,
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

CREATE TABLE "public"."personal_tasks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "due_date" timestamp with time zone,
  "completed" boolean DEFAULT false,
  "priority" text DEFAULT 'medium',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "personal_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "personal_tasks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE TABLE "public"."rubrics" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "class_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rubrics_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
);

CREATE TABLE "public"."rubric_criteria" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "rubric_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "max_score" integer NOT NULL DEFAULT 10,
  "weight" numeric DEFAULT 1,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rubric_criteria_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rubric_criteria_rubric_id_fkey" FOREIGN KEY (rubric_id) REFERENCES rubrics (id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE "public"."notifications" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text,
  "data" jsonb,
  "read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- User preferences table
CREATE TABLE "public"."user_preferences" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "preference_key" text NOT NULL,
  "preference_value" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT "user_preferences_user_key" UNIQUE (user_id, preference_key)
);

-- Add missing columns to blocks table
ALTER TABLE "public"."blocks" ADD COLUMN IF NOT EXISTS "material_id" uuid REFERENCES materials(id) ON DELETE CASCADE;
ALTER TABLE "public"."blocks" ADD COLUMN IF NOT EXISTS "chapter_id" uuid REFERENCES chapters(id) ON DELETE CASCADE;
ALTER TABLE "public"."blocks" ADD COLUMN IF NOT EXISTS "order_index" integer;

-- Make assignment_id nullable (blocks can belong to materials or chapters instead)
ALTER TABLE "public"."blocks" ALTER COLUMN "assignment_id" DROP NOT NULL;

-- Add content_id to materials if missing  
ALTER TABLE "public"."materials" ADD COLUMN IF NOT EXISTS "content_id" uuid;

-- 3) Auth trigger was already defined above (line ~255)
-- The rest continues with rubric_criteria definition that was truncated...
  "description" text,
  "max_score" integer NOT NULL DEFAULT 10,
  "weight" numeric DEFAULT 1,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rubric_criteria_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rubric_criteria_rubric_id_fkey" FOREIGN KEY (rubric_id) REFERENCES rubrics (id) ON DELETE CASCADE
);

-- 3) Auth trigger: create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, theme, language, high_contrast, dyslexia_font, reduced_motion)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'student', 'pastel', 'en', false, false, false);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Generate unique join code for classes
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate a 6-character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.classes WHERE join_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- 4) Indexes
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
CREATE INDEX IF NOT EXISTS "idx_personal_tasks_user_id" ON "public"."personal_tasks"("user_id");
CREATE INDEX IF NOT EXISTS "idx_rubrics_class_id" ON "public"."rubrics"("class_id");
CREATE INDEX IF NOT EXISTS "idx_rubric_criteria_rubric_id" ON "public"."rubric_criteria"("rubric_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "public"."notifications"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_preferences_user_id" ON "public"."user_preferences"("user_id");

-- 5) Enable RLS
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
ALTER TABLE "public"."personal_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rubrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rubric_criteria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;

-- 6) Policies
CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "classes_all" ON "public"."classes" FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "class_members_all" ON "public"."class_members" FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "subjects_all" ON "public"."subjects" FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "assignments_all" ON "public"."assignments" FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "chapters_all" ON "public"."chapters" FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "paragraphs_all" ON "public"."paragraphs" FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "blocks_all" ON "public"."blocks" FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "progress_snapshots_all" ON "public"."progress_snapshots" FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "session_logs_all" ON "public"."session_logs" FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "student_answers_all" ON "public"."student_answers" FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "submissions_all" ON "public"."submissions" FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "materials_own" ON "public"."materials" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "materials_public" ON "public"."materials" FOR SELECT USING (is_public = true);

CREATE POLICY "personal_tasks_all" ON "public"."personal_tasks" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "rubrics_all" ON "public"."rubrics" FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "rubric_criteria_all" ON "public"."rubric_criteria" FOR ALL USING (auth.uid() IS NOT NULL);

-- Notifications: users can only see their own notifications
CREATE POLICY "notifications_own" ON "public"."notifications" FOR ALL USING (auth.uid() = user_id);

-- User preferences: users can only access their own preferences
CREATE POLICY "user_preferences_own" ON "public"."user_preferences" FOR ALL USING (auth.uid() = user_id);

-- Force PostgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');
