-- Add hierarchical structure for subjects
-- subjects → chapters → subchapters → assignments → blocks

-- Chapters table (numbered 1, 2, 3... per subject)
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
ALTER TABLE "public"."chapters" OWNER TO "postgres";

-- Subchapters table (paragraphs numbered a, b, c, aa, ab... per chapter)
CREATE TABLE IF NOT EXISTS "public"."subchapters" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "chapter_id" uuid NOT NULL,
    "subchapter_index" int NOT NULL, -- 0=a, 1=b, 26=aa, 27=ab, etc.
    "title" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "subchapters_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subchapters_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE CASCADE,
    CONSTRAINT "subchapters_chapter_index_unique" UNIQUE ("chapter_id", "subchapter_index")
);
ALTER TABLE "public"."subchapters" OWNER TO "postgres";

-- Update assignments to link to subchapters instead of classes
ALTER TABLE "public"."assignments"
ADD COLUMN IF NOT EXISTS "subchapter_id" uuid,
ADD CONSTRAINT "assignments_subchapter_id_fkey" FOREIGN KEY ("subchapter_id") REFERENCES "public"."subchapters"("id") ON DELETE CASCADE;

-- Add assignment_index to assignments (a, b, c, aa, ab... per subchapter)
ALTER TABLE "public"."assignments"
ADD COLUMN IF NOT EXISTS "assignment_index" int NOT NULL DEFAULT 0;

-- Blocks table (if not exists - update to link to assignments)
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
ALTER TABLE "public"."blocks" OWNER TO "postgres";

-- Progress tracking table
CREATE TABLE IF NOT EXISTS "public"."progress_snapshots" (
    "student_id" uuid NOT NULL,
    "subchapter_id" uuid NOT NULL,
    "completion_percent" int NOT NULL DEFAULT 0,
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "progress_snapshots_pkey" PRIMARY KEY ("student_id", "subchapter_id"),
    CONSTRAINT "progress_snapshots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "progress_snapshots_subchapter_id_fkey" FOREIGN KEY ("subchapter_id") REFERENCES "public"."subchapters"("id") ON DELETE CASCADE
);
ALTER TABLE "public"."progress_snapshots" OWNER TO "postgres";

-- Session logs for time tracking
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
ALTER TABLE "public"."session_logs" OWNER TO "postgres";

-- Student answers table
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
ALTER TABLE "public"."student_answers" OWNER TO "postgres";

-- Enable RLS on new tables
ALTER TABLE "public"."chapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subchapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."progress_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."student_answers" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapters
CREATE POLICY "Allow authenticated read" ON "public"."chapters" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM subjects s
    INNER JOIN classes c ON s.class_id = c.id
    WHERE s.id = chapters.subject_id AND (
      c.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM class_members
        WHERE class_members.class_id = c.id AND class_members.user_id = auth.uid()
      )
    )
  )
);
CREATE POLICY "Allow authenticated insert" ON "public"."chapters" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects s
    INNER JOIN classes c ON s.class_id = c.id
    WHERE s.id = chapters.subject_id AND c.owner_id = auth.uid()
  )
);
CREATE POLICY "Allow authenticated update for owners" ON "public"."chapters" FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM subjects s
    INNER JOIN classes c ON s.class_id = c.id
    WHERE s.id = chapters.subject_id AND c.owner_id = auth.uid()
  )
);
CREATE POLICY "Allow authenticated delete for owners" ON "public"."chapters" FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM subjects s
    INNER JOIN classes c ON s.class_id = c.id
    WHERE s.id = chapters.subject_id AND c.owner_id = auth.uid()
  )
);

-- RLS Policies for subchapters (similar to chapters)
CREATE POLICY "Allow authenticated read" ON "public"."subchapters" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chapters ch
    INNER JOIN subjects s ON ch.subject_id = s.id
    INNER JOIN classes c ON s.class_id = c.id
    WHERE ch.id = subchapters.chapter_id AND (
      c.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM class_members
        WHERE class_members.class_id = c.id AND class_members.user_id = auth.uid()
      )
    )
  )
);
CREATE POLICY "Allow authenticated insert" ON "public"."subchapters" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM chapters ch
    INNER JOIN subjects s ON ch.subject_id = s.id
    INNER JOIN classes c ON s.class_id = c.id
    WHERE ch.id = subchapters.chapter_id AND c.owner_id = auth.uid()
  )
);
CREATE POLICY "Allow authenticated update for owners" ON "public"."subchapters" FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM chapters ch
    INNER JOIN subjects s ON ch.subject_id = s.id
    INNER JOIN classes c ON s.class_id = c.id
    WHERE ch.id = subchapters.chapter_id AND c.owner_id = auth.uid()
  )
);
CREATE POLICY "Allow authenticated delete for owners" ON "public"."subchapters" FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM chapters ch
    INNER JOIN subjects s ON ch.subject_id = s.id
    INNER JOIN classes c ON s.class_id = c.id
    WHERE ch.id = subchapters.chapter_id AND c.owner_id = auth.uid()
  )
);

-- RLS Policies for blocks
CREATE POLICY "Allow authenticated read" ON "public"."blocks" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assignments a
    INNER JOIN subchapters sc ON a.subchapter_id = sc.id
    INNER JOIN chapters ch ON sc.chapter_id = ch.id
    INNER JOIN subjects s ON ch.subject_id = s.id
    INNER JOIN classes c ON s.class_id = c.id
    WHERE a.id = blocks.assignment_id AND (
      c.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM class_members
        WHERE class_members.class_id = c.id AND class_members.user_id = auth.uid()
      )
    )
  )
);
CREATE POLICY "Allow authenticated insert" ON "public"."blocks" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM assignments a
    INNER JOIN subchapters sc ON a.subchapter_id = sc.id
    INNER JOIN chapters ch ON sc.chapter_id = ch.id
    INNER JOIN subjects s ON ch.subject_id = s.id
    INNER JOIN classes c ON s.class_id = c.id
    WHERE a.id = blocks.assignment_id AND c.owner_id = auth.uid()
  )
);
CREATE POLICY "Allow authenticated update for owners" ON "public"."blocks" FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM assignments a
    INNER JOIN subchapters sc ON a.subchapter_id = sc.id
    INNER JOIN chapters ch ON sc.chapter_id = ch.id
    INNER JOIN subjects s ON ch.subject_id = s.id
    INNER JOIN classes c ON s.class_id = c.id
    WHERE a.id = blocks.assignment_id AND c.owner_id = auth.uid()
  )
);
CREATE POLICY "Allow authenticated delete for owners" ON "public"."blocks" FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM assignments a
    INNER JOIN subchapters sc ON a.subchapter_id = sc.id
    INNER JOIN chapters ch ON sc.chapter_id = ch.id
    INNER JOIN subjects s ON ch.subject_id = s.id
    INNER JOIN classes c ON s.class_id = c.id
    WHERE a.id = blocks.assignment_id AND c.owner_id = auth.uid()
  )
);

-- RLS Policies for progress snapshots
CREATE POLICY "Allow individual read access" ON "public"."progress_snapshots" FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Allow teachers to read all" ON "public"."progress_snapshots" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM subchapters sc
    INNER JOIN chapters ch ON sc.chapter_id = ch.id
    INNER JOIN subjects s ON ch.subject_id = s.id
    INNER JOIN classes c ON s.class_id = c.id
    WHERE sc.id = progress_snapshots.subchapter_id AND c.owner_id = auth.uid()
  )
);
CREATE POLICY "Allow update access" ON "public"."progress_snapshots" FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Allow update access" ON "public"."progress_snapshots" FOR UPDATE USING (auth.uid() = student_id);

-- RLS Policies for session logs
CREATE POLICY "Allow individual read access" ON "public"."session_logs" FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Allow teachers to read all" ON "public"."session_logs" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM subchapters sc
    INNER JOIN chapters ch ON sc.chapter_id = ch.id
    INNER JOIN subjects s ON ch.subject_id = s.id
    INNER JOIN classes c ON s.class_id = c.id
    WHERE sc.id = session_logs.subchapter_id AND c.owner_id = auth.uid()
  )
);
CREATE POLICY "Allow insert access" ON "public"."session_logs" FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Allow update access" ON "public"."session_logs" FOR UPDATE USING (auth.uid() = student_id);

-- RLS Policies for student answers
CREATE POLICY "Allow individual read access" ON "public"."student_answers" FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Allow teachers to read all" ON "public"."student_answers" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM blocks b
    INNER JOIN assignments a ON b.assignment_id = a.id
    INNER JOIN subchapters sc ON a.subchapter_id = sc.id
    INNER JOIN chapters ch ON sc.chapter_id = ch.id
    INNER JOIN subjects s ON ch.subject_id = s.id
    INNER JOIN classes c ON s.class_id = c.id
    WHERE b.id = student_answers.block_id AND c.owner_id = auth.uid()
  )
);
CREATE POLICY "Allow insert access" ON "public"."student_answers" FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Allow teachers to grade" ON "public"."student_answers" FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM blocks b
    INNER JOIN assignments a ON b.assignment_id = a.id
    INNER JOIN subchapters sc ON a.subchapter_id = sc.id
    INNER JOIN chapters ch ON sc.chapter_id = ch.id
    INNER JOIN subjects s ON ch.subject_id = s.id
    INNER JOIN classes c ON s.class_id = c.id
    WHERE b.id = student_answers.block_id AND c.owner_id = auth.uid()
  )
);

-- Helper functions for automatic numbering
CREATE OR REPLACE FUNCTION get_next_chapter_number(subject_id_param uuid)
RETURNS int AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(chapter_number) + 1 FROM chapters WHERE subject_id = subject_id_param),
    1
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_subchapter_index(chapter_id_param uuid)
RETURNS int AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(subchapter_index) + 1 FROM subchapters WHERE chapter_id = chapter_id_param),
    0
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_assignment_index(subchapter_id_param uuid)
RETURNS int AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(assignment_index) + 1 FROM assignments WHERE subchapter_id = subchapter_id_param),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Function to convert index to letter notation (0=a, 1=b, 26=aa, 27=ab, etc.)
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
        result := chr(97 + (current MOD 26)) || result;
        current := current / 26 - 1;
        IF current < 0 THEN
            EXIT;
        END IF;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;