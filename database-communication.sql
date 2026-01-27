-- Communication Tools Migration
-- Add announcements table for class announcements and submission_comments for teacher comments

-- Create announcements table
CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "class_id" uuid NOT NULL,
    "title" text NOT NULL,
    "content" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "created_by" uuid,
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "announcements_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE,
    CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- Create submission_comments table
CREATE TABLE IF NOT EXISTS "public"."submission_comments" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "comment" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "submission_comments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "submission_comments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE,
    CONSTRAINT "submission_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS "announcements_class_id_idx" ON "public"."announcements"("class_id");
CREATE INDEX IF NOT EXISTS "announcements_created_at_idx" ON "public"."announcements"("created_at");
CREATE INDEX IF NOT EXISTS "submission_comments_submission_id_idx" ON "public"."submission_comments"("submission_id");
CREATE INDEX IF NOT EXISTS "submission_comments_created_at_idx" ON "public"."submission_comments"("created_at");

-- Enable RLS
ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."submission_comments" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Teachers can create announcements for their classes" ON "public"."announcements" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = announcements.class_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update their own announcements" ON "public"."announcements" FOR UPDATE USING (
  created_by = auth.uid()
);

CREATE POLICY "Teachers can delete their own announcements" ON "public"."announcements" FOR DELETE USING (
  created_by = auth.uid()
);

CREATE POLICY "Class members can view announcements" ON "public"."announcements" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM classes c
    JOIN class_members cm ON c.id = cm.class_id
    WHERE c.id = announcements.class_id AND cm.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = announcements.class_id AND c.owner_id = auth.uid()
  )
);

-- RLS Policies for submission_comments
CREATE POLICY "Teachers can create comments on submissions in their classes" ON "public"."submission_comments" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM submissions s
    JOIN assignments a ON s.assignment_id = a.id
    JOIN classes c ON a.class_id = c.id
    WHERE s.id = submission_comments.submission_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view comments on submissions in their classes" ON "public"."submission_comments" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM submissions s
    JOIN assignments a ON s.assignment_id = a.id
    JOIN classes c ON a.class_id = c.id
    WHERE s.id = submission_comments.submission_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Students can view comments on their own submissions" ON "public"."submission_comments" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM submissions s
    WHERE s.id = submission_comments.submission_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete their own comments" ON "public"."submission_comments" FOR DELETE USING (
  user_id = auth.uid()
);