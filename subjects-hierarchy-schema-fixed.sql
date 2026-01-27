-- Fixed SQL migration for subjects hierarchy
-- MOD operator doesn't exist in PostgreSQL, use %

-- Complete hierarchical schema for subjects system
-- Run this in Supabase SQL editor

-- Chapters table
CREATE TABLE IF NOT EXISTS "public"."chapters" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "subject_id" uuid NOT NULL,
    "chapter_number" int NOT NULL,
    "title" text NOT NULL,
    "ai_summary" text,
    "summary_overridden" boolean DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chapters_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE,
    CONSTRAINT "chapters_subject_number_unique" UNIQUE ("subject_id", "chapter_number")
);

-- Subchapters table
CREATE TABLE IF NOT EXISTS "public"."subchapters" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "chapter_id" uuid NOT NULL,
    "subchapter_index" int NOT NULL,
    "title" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "subchapters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subchapters_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE CASCADE,
    CONSTRAINT "subchapters_chapter_index_unique" UNIQUE ("chapter_id", "subchapter_index")
);

-- Update assignments to link to subchapters
ALTER TABLE "public"."assignments"
ADD COLUMN IF NOT EXISTS "subchapter_id" uuid,
ADD COLUMN IF NOT EXISTS "assignment_index" int NOT NULL DEFAULT 0;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'assignments_subchapter_id_fkey'
    ) THEN
        ALTER TABLE "public"."assignments"
        ADD CONSTRAINT "assignments_subchapter_id_fkey"
        FOREIGN KEY ("subchapter_id") REFERENCES "public"."subchapters"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Blocks table
CREATE TABLE IF NOT EXISTS "public"."blocks" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "assignment_id" uuid NOT NULL,
    "type" text NOT NULL,
    "content" jsonb NOT NULL,
    "position" float NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "blocks_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE CASCADE
);

-- Progress snapshots
CREATE TABLE IF NOT EXISTS "public"."progress_snapshots" (
    "student_id" uuid NOT NULL,
    "subchapter_id" uuid NOT NULL,
    "completion_percent" int NOT NULL DEFAULT 0,
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "progress_snapshots_pkey" PRIMARY KEY ("student_id", "subchapter_id"),
    CONSTRAINT "progress_snapshots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "progress_snapshots_subchapter_id_fkey" FOREIGN KEY ("subchapter_id") REFERENCES "public"."subchapters"("id") ON DELETE CASCADE
);

-- Session logs
CREATE TABLE IF NOT EXISTS "public"."session_logs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "student_id" uuid NOT NULL,
    "subchapter_id" uuid NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "finished_at" timestamp with time zone,
    CONSTRAINT "session_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "session_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "session_logs_subchapter_id_fkey" FOREIGN KEY ("subchapter_id") REFERENCES "public"."subchapters"("id") ON DELETE CASCADE
);

-- Student answers
CREATE TABLE IF NOT EXISTS "public"."student_answers" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "student_id" uuid NOT NULL,
    "block_id" uuid NOT NULL,
    "answer_data" jsonb NOT NULL,
    "is_correct" boolean,
    "score" int,
    "feedback" text,
    "graded_by_ai" boolean DEFAULT false,
    "graded_at" timestamp with time zone,
    "submitted_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "student_answers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "student_answers_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE "public"."chapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subchapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."progress_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."student_answers" ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (simplified for now)
CREATE POLICY "chapters_access" ON "public"."chapters" FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "chapters_insert" ON "public"."chapters" FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "chapters_update" ON "public"."chapters" FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "chapters_delete" ON "public"."chapters" FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "subchapters_access" ON "public"."subchapters" FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "subchapters_insert" ON "public"."subchapters" FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "subchapters_update" ON "public"."subchapters" FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "subchapters_delete" ON "public"."subchapters" FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "blocks_access" ON "public"."blocks" FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "blocks_insert" ON "public"."blocks" FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "blocks_update" ON "public"."blocks" FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "blocks_delete" ON "public"."blocks" FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "progress_access" ON "public"."progress_snapshots" FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "progress_insert" ON "public"."progress_snapshots" FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "progress_update" ON "public"."progress_snapshots" FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "answers_access" ON "public"."student_answers" FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "answers_insert" ON "public"."student_answers" FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "answers_update" ON "public"."student_answers" FOR UPDATE USING (auth.uid() = student_id);

-- Helper function for letter conversion (fixed syntax)
CREATE OR REPLACE FUNCTION index_to_letters(index_param int)
RETURNS text AS $$
DECLARE
    result text := '';
    current int := index_param;
BEGIN
    IF current = 0 THEN
        RETURN 'a';
    END IF;

    WHILE current >= 0 LOOP
        result := chr(97 + (current % 26)) || result;
        current := current / 26 - 1;
        IF current < 0 THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-numbering functions
CREATE OR REPLACE FUNCTION get_next_chapter_number(subject_uuid uuid)
RETURNS int AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(chapter_number) + 1 FROM chapters WHERE subject_id = subject_uuid),
    1
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_subchapter_index(chapter_uuid uuid)
RETURNS int AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(subchapter_index) + 1 FROM subchapters WHERE chapter_id = chapter_uuid),
    0
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_assignment_index(subchapter_uuid uuid)
RETURNS int AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(assignment_index) + 1 FROM assignments WHERE subchapter_id = subchapter_uuid),
    0
  );
END;
$$ LANGUAGE plpgsql;