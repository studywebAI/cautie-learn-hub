-- Student Attendance Records table
CREATE TABLE IF NOT EXISTS public.student_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  is_present boolean DEFAULT true, -- true = V (present), false = X (absent)
  has_homework_incomplete boolean DEFAULT false,
  was_sent_out boolean DEFAULT false,
  was_too_late boolean DEFAULT false,
  note text,
  noted_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_student_class ON public.student_attendance(student_id, class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON public.student_attendance(class_id);

-- Enable RLS
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "attendance_all_teachers" ON public.student_attendance;
CREATE POLICY "attendance_all_teachers" ON public.student_attendance
  FOR ALL USING (
    -- User is owner of the class
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = student_attendance.class_id
        AND c.owner_id = auth.uid()
    )
    OR
    -- User is teacher or owner in class_members
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = student_attendance.class_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('teacher', 'owner')
    )
  );

-- Student can see their own attendance
DROP POLICY IF EXISTS "attendance_student_own" ON public.student_attendance;
CREATE POLICY "attendance_student_own" ON public.student_attendance
  FOR SELECT USING (auth.uid() = student_id);
