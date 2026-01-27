-- Assignment Submissions Migration
-- Add submissions table for student work submission

-- Create submissions table
CREATE TABLE IF NOT EXISTS "public"."submissions" (
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

-- Add owner_type and guest_id columns to assignments if not exists
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'user' CHECK (owner_type IN ('user', 'guest'));
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS guest_id text;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS "submissions_assignment_id_idx" ON "public"."submissions"("assignment_id");
CREATE INDEX IF NOT EXISTS "submissions_user_id_idx" ON "public"."submissions"("user_id");

-- Enable RLS
ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for submissions
CREATE POLICY "Students can view their own submissions" ON "public"."submissions" FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN classes c ON a.class_id = c.id
    WHERE a.id = submissions.assignment_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their own submissions" ON "public"."submissions" FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN class_members cm ON a.class_id = cm.class_id
    WHERE a.id = assignment_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Students can update their own submissions" ON "public"."submissions" FOR UPDATE USING (
  auth.uid() = user_id AND status IN ('draft', 'submitted')
);

CREATE POLICY "Teachers can view submissions for their assignments" ON "public"."submissions" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN classes c ON a.class_id = c.id
    WHERE a.id = submissions.assignment_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Teachers can grade submissions for their assignments" ON "public"."submissions" FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN classes c ON a.class_id = c.id
    WHERE a.id = submissions.assignment_id AND c.owner_id = auth.uid()
  )
);