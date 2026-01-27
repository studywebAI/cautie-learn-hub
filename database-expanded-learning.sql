-- Expanded Learning Management System Schema
-- Learnbeat-style hierarchical content organization

-- Subjects/Courses table (higher level than classes)
CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "description" text,
    "created_by" uuid NOT NULL,
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subjects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id")
);

-- Chapters within subjects
CREATE TABLE IF NOT EXISTS "public"."chapters" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "subject_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chapters_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE
);

-- Sub-chapters within chapters
CREATE TABLE IF NOT EXISTS "public"."subchapters" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "chapter_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "content" jsonb, -- Manual content or AI-generated
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "subchapters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subchapters_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE CASCADE
);

-- Link materials to subchapters
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS subchapter_id uuid REFERENCES public.subchapters(id) ON DELETE SET NULL;

-- Import existing content
CREATE TABLE IF NOT EXISTS "public"."imported_content" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "title" text NOT NULL,
    "content" jsonb,
    "type" text NOT NULL CHECK (type IN ('quiz', 'flashcards', 'notes', 'document')),
    "source" text, -- URL or file reference
    "imported_at" timestamp with time zone NOT NULL DEFAULT now(),
    "is_converted" boolean DEFAULT false,
    CONSTRAINT "imported_content_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "imported_content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
);

-- Assignment content references
CREATE TABLE IF NOT EXISTS "public"."assignment_references" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "assignment_id" uuid NOT NULL,
    "reference_type" text NOT NULL CHECK (reference_type IN ('material', 'subchapter', 'imported')),
    "reference_id" uuid NOT NULL,
    "description" text, -- e.g. "Study these flashcards for the exam"
    "is_required" boolean DEFAULT true,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "assignment_references_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assignment_references_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE CASCADE
);

-- Study sessions/progress
CREATE TABLE IF NOT EXISTS "public"."study_sessions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "material_id" uuid,
    "subchapter_id" uuid,
    "assignment_id" uuid,
    "session_type" text NOT NULL CHECK (session_type IN ('study', 'practice', 'review')),
    "duration_minutes" integer,
    "completed_at" timestamp with time zone,
    "score" numeric,
    "notes" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id"),
    CONSTRAINT "study_sessions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE SET NULL,
    CONSTRAINT "study_sessions_subchapter_id_fkey" FOREIGN KEY ("subchapter_id") REFERENCES "public"."subchapters"("id") ON DELETE SET NULL,
    CONSTRAINT "study_sessions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "chapters_subject_id_idx" ON "public"."chapters"("subject_id");
CREATE INDEX IF NOT EXISTS "subchapters_chapter_id_idx" ON "public"."subchapters"("chapter_id");
CREATE INDEX IF NOT EXISTS "assignment_references_assignment_id_idx" ON "public"."assignment_references"("assignment_id");
CREATE INDEX IF NOT EXISTS "study_sessions_user_id_idx" ON "public"."study_sessions"("user_id");

-- RLS Policies
ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."chapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subchapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."imported_content" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assignment_references" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."study_sessions" ENABLE ROW LEVEL SECURITY;

-- Subjects policies
CREATE POLICY "Users can view public subjects and their own" ON "public"."subjects" FOR SELECT USING (
  is_public = true OR created_by = auth.uid()
);
CREATE POLICY "Users can create subjects" ON "public"."subjects" FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Subject creators can update their subjects" ON "public"."subjects" FOR UPDATE USING (created_by = auth.uid());

-- Chapters policies (inherit from subjects)
CREATE POLICY "Users can view chapters of accessible subjects" ON "public"."chapters" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM subjects WHERE subjects.id = chapters.subject_id AND
    (subjects.is_public = true OR subjects.created_by = auth.uid())
  )
);
CREATE POLICY "Users can create chapters in their subjects" ON "public"."chapters" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects WHERE subjects.id = chapters.subject_id AND subjects.created_by = auth.uid()
  )
);

-- Similar policies for subchapters, imported_content, etc.
-- (Detailed policies would be added for each table)