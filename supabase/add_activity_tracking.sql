-- Activity Tracking Migration
-- Run this SQL in your Supabase SQL Editor to add activity tracking support.
-- This adds a unified activity_logs table for tracking quiz results, flashcard sessions,
-- and other learning activities alongside existing session_logs and student_answers.

-- 1. Create activity type enum
DO $$ BEGIN
  CREATE TYPE public.activity_type AS ENUM ('quiz', 'flashcard', 'assignment', 'study_session');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  paragraph_id uuid REFERENCES public.paragraphs(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  score integer, -- percentage score (0-100)
  total_items integer, -- total questions/cards
  correct_items integer, -- correct answers / mastered cards
  time_spent_seconds integer, -- time spent on the activity
  metadata jsonb DEFAULT '{}'::jsonb, -- extra data (quiz mode, flashcard mode, etc.)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add activity_type column to session_logs (optional enrichment)
DO $$ BEGIN
  ALTER TABLE public.session_logs ADD COLUMN activity_type text DEFAULT 'study_session';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 4. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_logs_student_id ON public.activity_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON public.activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_paragraph_id ON public.activity_logs(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_subject_id ON public.activity_logs(subject_id);

-- 5. Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Students can insert their own activity logs
CREATE POLICY "Students can insert own activity logs"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- Students can read their own activity logs
CREATE POLICY "Students can read own activity logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- Teachers can read activity logs for students in their classes
CREATE POLICY "Teachers can read student activity logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      JOIN public.class_members cm ON cm.class_id = c.id
      WHERE c.owner_id = auth.uid()
        AND cm.user_id = activity_logs.student_id
    )
  );

-- Service role bypass for API routes
CREATE POLICY "Service role full access to activity_logs"
  ON public.activity_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
