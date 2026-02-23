-- =============================================
-- GRADING SYSTEM TABLES
-- Supports: New Grades, Edit Grades, History (audit)
-- =============================================

-- Grade Sets: Each "test/quiz/homework" is a grade set
CREATE TABLE public.grade_sets (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    category text DEFAULT 'test'::text, -- 'test', 'quiz', 'homework', 'exam'
    weight numeric DEFAULT 1, -- 1x, 2x, 3x, etc.
    status text DEFAULT 'draft'::text, -- 'draft', 'published'
    release_date timestamp with time zone,
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.grade_sets IS 'Represents a grade set (test, quiz, homework) for a class/subject';

-- Student Grades: Individual grades per student per grade set
CREATE TABLE public.student_grades (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    grade_set_id uuid NOT NULL REFERENCES public.grade_sets(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    grade_value text, -- Can be numeric (1-10), letter (A-F), or custom
    feedback_text text,
    status text DEFAULT 'draft'::text, -- 'draft', 'final'
    tag text, -- 'absent', 'exempt', 'late', 'excused'
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(grade_set_id, student_id)
);

COMMENT ON TABLE public.student_grades IS 'Individual grades for each student in a grade set';

-- Grade History: Audit log for compliance
CREATE TABLE public.grade_history (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_grade_id uuid NOT NULL REFERENCES public.student_grades(id) ON DELETE CASCADE,
    old_value text,
    new_value text,
    change_reason text,
    changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.grade_history IS 'Audit log for all grade changes';

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_grade_sets_class_id ON public.grade_sets(class_id);
CREATE INDEX IF NOT EXISTS idx_grade_sets_subject_id ON public.grade_sets(subject_id);
CREATE INDEX IF NOT EXISTS idx_grade_sets_status ON public.grade_sets(status);
CREATE INDEX IF NOT EXISTS idx_grade_sets_created_at ON public.grade_sets(created_at);

CREATE INDEX IF NOT EXISTS idx_student_grades_grade_set_id ON public.student_grades(grade_set_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_student_id ON public.student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_status ON public.student_grades(status);

CREATE INDEX IF NOT EXISTS idx_grade_history_student_grade_id ON public.grade_history(student_grade_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_changed_by ON public.grade_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_grade_history_created_at ON public.grade_history(created_at);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.grade_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;

-- Grade Sets policies
-- Teachers can view grade sets for classes they own
CREATE POLICY "Teachers can view grade sets for their classes" ON public.grade_sets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.classes c 
            WHERE c.id = grade_sets.class_id AND c.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.class_members cm 
            WHERE cm.class_id = grade_sets.class_id AND cm.user_id = auth.uid()
        )
    );

-- Only class owners can create/update/delete grade sets
CREATE POLICY "Class owners can create grade sets" ON public.grade_sets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classes c 
            WHERE c.id = grade_sets.class_id AND c.owner_id = auth.uid()
        )
    );

CREATE POLICY "Class owners can update grade sets" ON public.grade_sets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.classes c 
            WHERE c.id = grade_sets.class_id AND c.owner_id = auth.uid()
        )
    );

CREATE POLICY "Class owners can delete grade sets" ON public.grade_sets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.classes c 
            WHERE c.id = grade_sets.class_id AND c.owner_id = auth.uid()
        )
    );

-- Student Grades policies
-- Teachers can view/edit grades for their classes
CREATE POLICY "Teachers can view student grades for their classes" ON public.student_grades FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.grade_sets gs
            JOIN public.classes c ON gs.class_id = c.id
            WHERE gs.id = student_grades.grade_set_id AND c.owner_id = auth.uid()
        )
        OR student_grades.student_id = auth.uid() -- Students can view their own grades
    );

-- Only class owners can create/update student grades
CREATE POLICY "Class owners can manage student grades" ON public.student_grades FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.grade_sets gs
            JOIN public.classes c ON gs.class_id = c.id
            WHERE gs.id = student_grades.grade_set_id AND c.owner_id = auth.uid()
        )
    );

-- Grade History policies
-- Teachers can view history for their classes, students can view their own
CREATE POLICY "Teachers can view grade history for their classes" ON public.grade_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.student_grades sg
            JOIN public.grade_sets gs ON sg.grade_set_id = gs.id
            JOIN public.classes c ON gs.class_id = c.id
            WHERE sg.id = grade_history.student_grade_id AND c.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.student_grades sg
            WHERE sg.id = grade_history.student_grade_id AND sg.student_id = auth.uid()
        )
    );

-- =============================================
-- FUNCTION: Log grade changes
-- =============================================

CREATE OR REPLACE FUNCTION public.log_grade_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only log if grade_value actually changed
    IF OLD.grade_value IS DISTINCT FROM NEW.grade_value THEN
        INSERT INTO public.grade_history (student_grade_id, old_value, new_value, changed_by)
        VALUES (NEW.id, OLD.grade_value, NEW.grade_value, auth.uid());
    END IF;
    
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create trigger for auto-logging grade changes
DROP TRIGGER IF EXISTS trigger_log_grade_change ON public.student_grades;
CREATE TRIGGER trigger_log_grade_change
    BEFORE UPDATE ON public.student_grades
    FOR EACH ROW
    EXECUTE FUNCTION public.log_grade_change();

-- =============================================
-- FUNCTION: Get students for a class
-- =============================================

CREATE OR REPLACE FUNCTION public.get_class_students(p_class_id uuid)
RETURNS TABLE (
    user_id uuid,
    full_name text,
    email text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.full_name,
        p.email
    FROM public.profiles p
    JOIN public.class_members cm ON cm.user_id = p.id
    WHERE cm.class_id = p_class_id
    AND cm.role = 'student'
    ORDER BY p.full_name;
END;
$$;
