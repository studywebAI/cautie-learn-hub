-- Attendance Tracking Migration
-- Add attendance table for tracking student attendance

-- Create attendance_sessions table
CREATE TABLE IF NOT EXISTS "public"."attendance_sessions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "class_id" uuid NOT NULL,
    "title" text NOT NULL,
    "date" date NOT NULL,
    "start_time" time,
    "end_time" time,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attendance_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS "public"."attendance_records" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "session_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "status" text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    "marked_at" timestamp with time zone NOT NULL DEFAULT now(),
    "marked_by" uuid,
    "notes" text,
    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "attendance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "attendance_records_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "unique_session_user" UNIQUE ("session_id", "user_id")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "attendance_sessions_class_id_idx" ON "public"."attendance_sessions"("class_id");
CREATE INDEX IF NOT EXISTS "attendance_sessions_date_idx" ON "public"."attendance_sessions"("date");
CREATE INDEX IF NOT EXISTS "attendance_records_session_id_idx" ON "public"."attendance_records"("session_id");
CREATE INDEX IF NOT EXISTS "attendance_records_user_id_idx" ON "public"."attendance_records"("user_id");

-- Enable RLS
ALTER TABLE "public"."attendance_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."attendance_records" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_sessions
CREATE POLICY "Teachers can manage attendance sessions for their classes" ON "public"."attendance_sessions" FOR ALL USING (
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = attendance_sessions.class_id AND classes.owner_id = auth.uid()
  )
);

CREATE POLICY "Students can view attendance sessions for their classes" ON "public"."attendance_sessions" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM class_members cm
    JOIN classes c ON cm.class_id = c.id
    WHERE cm.class_id = attendance_sessions.class_id AND cm.user_id = auth.uid()
  )
);

-- RLS Policies for attendance_records
CREATE POLICY "Teachers can manage attendance records for their classes" ON "public"."attendance_records" FOR ALL USING (
  EXISTS (
    SELECT 1 FROM attendance_sessions sess
    JOIN classes c ON sess.class_id = c.id
    WHERE sess.id = attendance_records.session_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own attendance records" ON "public"."attendance_records" FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY "Students can mark their own attendance when session is active" ON "public"."attendance_records" FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM attendance_sessions sess
    WHERE sess.id = session_id AND sess.is_active = true
  )
);

CREATE POLICY "Students can update their own attendance records" ON "public"."attendance_records" FOR UPDATE USING (
  auth.uid() = user_id
);