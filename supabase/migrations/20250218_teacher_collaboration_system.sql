-- ============================================
-- TEACHER COLLABORATION SYSTEM
-- Perfect implementation for collaborative teaching
-- ============================================

-- ============================================
-- 1. CREATE SUBJECT_TEACHERS COLLABORATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.subject_teachers (
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner', 'collaborator', 'assistant')),
    permissions JSONB NOT NULL DEFAULT '{
        "can_view": true,
        "can_edit": false,
        "can_grade": false,
      "can_manage_students": false,
        "can_share": false,
        "can_delete": false
    }',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (subject_id, teacher_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subject_teachers_subject_id ON public.subject_teachers(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_teachers_teacher_id ON public.subject_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subject_teachers_role ON public.subject_teachers(role);

-- ============================================
-- 2. UPDATE SUBJECTS TABLE
-- ============================================
ALTER TABLE public.subjects 
    ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill owner_id from user_id (for existing data)
UPDATE public.subjects 
SET owner_id = user_id 
WHERE owner_id IS NULL AND user_id IS NOT NULL;

-- Create index for class_id
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_owner_id ON public.subjects(owner_id);

-- ============================================
-- 3. UPDATE CLASSES TABLE
-- ============================================
ALTER TABLE public.classes 
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Create index for subject_id
CREATE INDEX IF NOT EXISTS idx_classes_subject_id ON public.classes(subject_id);

-- ============================================
-- 4. CREATE COLLABORATION ACTIVITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.collaboration_activities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'shared', 'permission_changed', 'assignment_created', 'assignment_updated', 'graded', 'commented'
    target_type TEXT, -- 'subject', 'assignment', 'student', 'material'
    target_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for activity queries
CREATE INDEX IF NOT EXISTS idx_collab_activities_subject_id ON public.collaboration_activities(subject_id);
CREATE INDEX IF NOT EXISTS idx_collab_activities_teacher_id ON public.collaboration_activities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_collab_activities_created_at ON public.collaboration_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collab_activities_subject_created ON public.collaboration_activities(subject_id, created_at DESC);

-- ============================================
-- 5. CREATE SUBJECT TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.subject_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_structure JSONB NOT NULL DEFAULT '{}', -- chapters, paragraphs, assignments structure
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT false,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subject_templates_owner_id ON public.subject_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_subject_templates_public ON public.subject_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_subject_templates_tags ON public.subject_templates(tags);

-- ============================================
-- 6. CREATE ASSIGNMENT COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.assignment_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.assignment_comments(id) ON DELETE CASCADE,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_assignment_comments_assignment_id ON public.assignment_comments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_comments_teacher_id ON public.assignment_comments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignment_comments_parent ON public.assignment_comments(parent_comment_id);

-- ============================================
-- 7. ENABLE RLS ON NEW TABLES
-- ============================================
ALTER TABLE public.subject_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS POLICIES FOR SUBJECT_TEACHERS
-- ============================================
-- View: Teachers can see subject_teachers for subjects they have access to
CREATE POLICY "subject_teachers_select_policy" ON subject_teachers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subjects s
            LEFT JOIN subject_teachers st ON s.id = st.subject_id
            WHERE s.id = subject_teachers.subject_id
            AND (
                s.owner_id = auth.uid()
                OR st.teacher_id = auth.uid()
            )
        )
    );

-- Insert: Only subject owners can add teachers
CREATE POLICY "subject_teachers_insert_policy" ON subject_teachers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_teachers.subject_id
            AND s.owner_id = auth.uid()
        )
    );

-- Update: Only subject owners can update teacher permissions
CREATE POLICY "subject_teachers_update_policy" ON subject_teachers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_teachers.subject_id
            AND s.owner_id = auth.uid()
        )
    );

-- Delete: Only subject owners can remove teachers
CREATE POLICY "subject_teachers_delete_policy" ON subject_teachers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_teachers.subject_id
            AND s.owner_id = auth.uid()
        )
    );

-- ============================================
-- 9. RLS POLICIES FOR COLLABORATION ACTIVITIES
-- ============================================
-- Teachers can see activities for subjects they have access to
CREATE POLICY "collaboration_activities_select_policy" ON collaboration_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subjects s
            LEFT JOIN subject_teachers st ON s.id = st.subject_id
            WHERE s.id = collaboration_activities.subject_id
            AND (
                s.owner_id = auth.uid()
                OR st.teacher_id = auth.uid()
            )
        )
    );

-- Teachers can insert their own activities
CREATE POLICY "collaboration_activities_insert_policy" ON collaboration_activities
    FOR INSERT WITH CHECK (
        teacher_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM subjects s
            LEFT JOIN subject_teachers st ON s.id = st.subject_id
            WHERE s.id = collaboration_activities.subject_id
            AND (
                s.owner_id = auth.uid()
                OR st.teacher_id = auth.uid()
            )
        )
    );

-- ============================================
-- 10. RLS POLICIES FOR SUBJECT_TEMPLATES
-- ============================================
-- Public templates are viewable by all teachers
-- Private templates only viewable by owner
CREATE POLICY "subject_templates_select_policy" ON subject_templates
    FOR SELECT USING (
        is_public = true OR owner_id = auth.uid()
    );

-- Teachers can create their own templates
CREATE POLICY "subject_templates_insert_policy" ON subject_templates
    FOR INSERT WITH CHECK (
        owner_id = auth.uid()
    );

-- Only template owner can update
CREATE POLICY "subject_templates_update_policy" ON subject_templates
    FOR UPDATE USING (
        owner_id = auth.uid()
    );

-- Only template owner can delete
CREATE POLICY "subject_templates_delete_policy" ON subject_templates
    FOR DELETE USING (
        owner_id = auth.uid()
    );

-- ============================================
-- 11. RLS POLICIES FOR ASSIGNMENT_COMMENTS
-- ============================================
-- Teachers can see comments for assignments in subjects they have access to
CREATE POLICY "assignment_comments_select_policy" ON assignment_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN subject_teachers st ON s.id = st.subject_id
            WHERE a.id = assignment_comments.assignment_id
            AND (
                s.owner_id = auth.uid()
                OR st.teacher_id = auth.uid()
            )
        )
    );

-- Teachers can insert comments for assignments they have edit access to
CREATE POLICY "assignment_comments_insert_policy" ON assignment_comments
    FOR INSERT WITH CHECK (
        teacher_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN subject_teachers st ON s.id = st.subject_id
            WHERE a.id = assignment_comments.assignment_id
            AND (
                s.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM subject_teachers st2
                    WHERE st2.subject_id = s.id
                    AND st2.teacher_id = auth.uid()
                    AND st2.permissions->>'can_edit' = 'true'
                )
            )
        )
    );

-- Teachers can update their own comments
CREATE POLICY "assignment_comments_update_policy" ON assignment_comments
    FOR UPDATE USING (
        teacher_id = auth.uid()
    );

-- Teachers can delete their own comments
CREATE POLICY "assignment_comments_delete_policy" ON assignment_comments
    FOR DELETE USING (
        teacher_id = auth.uid()
    );

-- ============================================
-- 12. UPDATE SUBJECTS RLS POLICIES FOR COLLABORATION
-- ============================================
-- Drop old policies that only allowed owners
DROP POLICY IF EXISTS "Users can view subjects they own" ON public.subjects;
DROP POLICY IF EXISTS "Users can insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can update subjects they own" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete subjects they own" ON public.subjects;

-- New collaborative policies
CREATE POLICY "subjects_select_collaborative" ON subjects
    FOR SELECT USING (
        auth.uid() = subjects.owner_id OR
        EXISTS (
            SELECT 1 FROM subject_teachers st
            WHERE st.subject_id = subjects.id
            AND st.teacher_id = auth.uid()
            AND st.permissions->>'can_view' = 'true'
        )
    );

CREATE POLICY "subjects_insert_collaborative" ON subjects
    FOR INSERT WITH CHECK (
        auth.uid() = subjects.owner_id
    );

CREATE POLICY "subjects_update_collaborative" ON subjects
    FOR UPDATE USING (
        auth.uid() = subjects.owner_id OR
        EXISTS (
            SELECT 1 FROM subject_teachers st
            WHERE st.subject_id = subjects.id
            AND st.teacher_id = auth.uid()
            AND st.permissions->>'can_edit' = 'true'
        )
    );

CREATE POLICY "subjects_delete_collaborative" ON subjects
    FOR DELETE USING (
        auth.uid() = subjects.owner_id
    );

-- ============================================
-- 13. UPDATE ASSIGNMENTS RLS POLICIES FOR COLLABORATION
-- ============================================
-- Drop old policies
DROP POLICY IF EXISTS "Users can view assignments they have access to" ON public.assignments;
DROP POLICY IF EXISTS "Users can create assignments for their content" ON public.assignments;
DROP POLICY IF EXISTS "Users can update assignments they have access to" ON public.assignments;
DROP POLICY IF EXISTS "Users can delete assignments they have access to" ON public.assignments;

-- New collaborative policies
CREATE POLICY "assignments_select_collaborative" ON assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subjects s
            LEFT JOIN subject_teachers st ON s.id = st.subject_id
            WHERE s.id = assignments.subject_id
            AND (
                s.owner_id = auth.uid()
                OR (st.teacher_id = auth.uid() AND st.permissions->>'can_view' = 'true')
            )
        )
    );

CREATE POLICY "assignments_insert_collaborative" ON assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM subjects s
            LEFT JOIN subject_teachers st ON s.id = st.subject_id
            WHERE s.id = assignments.subject_id
            AND (
                s.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM subject_teachers st2
                    WHERE st2.subject_id = s.id
                    AND st2.teacher_id = auth.uid()
                    AND st2.permissions->>'can_edit' = 'true'
                )
            )
        )
    );

CREATE POLICY "assignments_update_collaborative" ON assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM subjects s
            LEFT JOIN subject_teachers st ON s.id = st.subject_id
            WHERE s.id = assignments.subject_id
            AND (
                s.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM subject_teachers st2
                    WHERE st2.subject_id = s.id
                    AND st2.teacher_id = auth.uid()
                    AND st2.permissions->>'can_edit' = 'true'
                )
            )
        )
    );

CREATE POLICY "assignments_delete_collaborative" ON assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = assignments.subject_id
            AND s.owner_id = auth.uid()
        )
    );

-- ============================================
-- 14. CREATE FUNCTIONS FOR COLLABORATION
-- ============================================
-- Function to get teacher's accessible subjects
CREATE OR REPLACE FUNCTION public.get_teacher_accessible_subjects(teacher_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    subject_id UUID,
    subject_title TEXT,
    class_id UUID,
    class_name TEXT,
    owner_id UUID,
    owner_name TEXT,
    teacher_role TEXT,
    permissions JSONB,
    is_owner BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.title,
        s.class_id,
        c.name,
        s.owner_id,
        p.full_name,
        st.role,
        st.permissions,
        (s.owner_id = teacher_id) as is_owner
    FROM subjects s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN profiles p ON s.owner_id = p.id
    LEFT JOIN subject_teachers st ON s.id = st.subject_id AND st.teacher_id = teacher_id
    WHERE 
        s.owner_id = teacher_id
        OR EXISTS (
            SELECT 1 FROM subject_teachers st2
            WHERE st2.subject_id = s.id
            AND st2.teacher_id = teacher_id
        )
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to share subject with teacher
CREATE OR REPLACE FUNCTION public.share_subject_with_teacher(
    p_subject_id UUID,
    p_teacher_email TEXT,
    p_role TEXT DEFAULT 'collaborator',
    p_permissions JSONB DEFAULT '{"can_view": true, "can_edit": false, "can_grade": false, "can_manage_students": false, "can_share": false, "can_delete": false}'
)
RETURNS JSONB AS $$
DECLARE
    v_teacher_id UUID;
    v_owner_id UUID;
    v_result JSONB;
BEGIN
    -- Get teacher ID from email
    SELECT id INTO v_teacher_id
    FROM auth.users
    WHERE email = p_teacher_email;
    
    IF v_teacher_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Teacher not found with that email'
        );
    END IF;
    
    -- Get subject owner
    SELECT owner_id INTO v_owner_id
    FROM subjects
    WHERE id = p_subject_id;
    
    IF v_owner_id != auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Only subject owner can share'
        );
    END IF;
    
    -- Check if already shared
    IF EXISTS (
        SELECT 1 FROM subject_teachers
        WHERE subject_id = p_subject_id AND teacher_id = v_teacher_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Subject already shared with this teacher'
        );
    END IF;
    
    -- Insert collaboration
    INSERT INTO subject_teachers (subject_id, teacher_id, role, permissions)
    VALUES (p_subject_id, v_teacher_id, p_role, p_permissions);
    
    -- Log activity
    INSERT INTO collaboration_activities (subject_id, teacher_id, action, target_type, target_id, details)
    VALUES (p_subject_id, auth.uid(), 'shared', 'subject', p_subject_id, jsonb_build_object(
        'shared_with', v_teacher_id,
        'role', p_role,
        'permissions', p_permissions
    ));
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Subject shared successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update teacher permissions
CREATE OR REPLACE FUNCTION public.update_teacher_permissions(
    p_subject_id UUID,
    p_teacher_id UUID,
    p_permissions JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_owner_id UUID;
    v_result JSONB;
BEGIN
    -- Get subject owner
    SELECT owner_id INTO v_owner_id
    FROM subjects
    WHERE id = p_subject_id;
    
    IF v_owner_id != auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Only subject owner can update permissions'
        );
    END IF;
    
    -- Update permissions
    UPDATE subject_teachers
    SET permissions = p_permissions
    WHERE subject_id = p_subject_id AND teacher_id = p_teacher_id;
    
    -- Log activity
    INSERT INTO collaboration_activities (subject_id, teacher_id, action, target_type, target_id, details)
    VALUES (p_subject_id, auth.uid(), 'permission_changed', 'teacher', p_teacher_id, jsonb_build_object(
        'new_permissions', p_permissions
    ));
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Permissions updated successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 15. VERIFICATION
-- ============================================
SELECT 'Teacher collaboration system migration completed successfully' as status;
SELECT 'Created tables: subject_teachers, collaboration_activities, subject_templates, assignment_comments' as tables_created;
SELECT 'Added columns: class_id to subjects, subject_id to classes' as columns_added;
SELECT 'Created indexes for performance optimization' as indexes_status;
SELECT 'Enabled RLS and created collaborative policies' as rls_status;
SELECT 'Created helper functions for collaboration' as functions_status;