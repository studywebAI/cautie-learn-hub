-- ============================================
-- FIX VALIDATION ISSUES AND RLS POLICIES
-- Ensures collaboration system works seamlessly
-- ============================================

-- ============================================
-- 1. ENSURE ALL REQUIRED COLUMNS EXIST
-- ============================================
-- Add class_id to subjects if not exists
ALTER TABLE public.subjects 
    ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- Add owner_id to subjects if not exists
ALTER TABLE public.subjects 
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add subject_id to classes if not exists
ALTER TABLE public.classes 
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Add subject_id to assignments if not exists (for direct subject assignments)
ALTER TABLE public.assignments 
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE;

-- ============================================
-- 2. BACKFILL CRITICAL DATA
-- ============================================
-- Backfill subjects.owner_id from subjects.user_id (for existing data)
UPDATE public.subjects 
SET owner_id = user_id 
WHERE owner_id IS NULL AND user_id IS NOT NULL;

-- Backfill classes.subject_id from subjects where class_id matches
UPDATE public.classes c
SET subject_id = s.id
FROM public.subjects s
WHERE s.class_id = c.id AND c.subject_id IS NULL;

-- Backfill subjects.class_id where missing (inverse relationship)
UPDATE public.subjects s
SET class_id = c.id
FROM public.classes c
WHERE c.subject_id = s.id AND s.class_id IS NULL;

-- Backfill assignments.subject_id from paragraphs → chapters → subjects
UPDATE public.assignments a
SET subject_id = s.id
FROM public.paragraphs p
JOIN public.chapters c ON p.chapter_id = c.id
JOIN public.subjects s ON c.subject_id = s.id
WHERE a.paragraph_id = p.id AND a.subject_id IS NULL;

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_owner_id ON public.subjects(owner_id);
CREATE INDEX IF NOT EXISTS idx_classes_subject_id ON public.classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON public.assignments(subject_id);

-- ============================================
-- 4. FIX RLS POLICIES - MAKE THEM PERMISSIVE ENOUGH FOR COLLABORATION
-- ============================================

-- First, disable all existing policies on classes to start fresh
DROP POLICY IF EXISTS "Users can view classes they own or are a member of" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can update their classes" ON public.classes;
DROP POLICY IF EXISTS "Class owners can delete their classes" ON public.classes;

-- NEW COLLABORATIVE CLASSES POLICIES
-- Teachers can view classes they own, are members of, or have subjects linked to
CREATE POLICY "classes_select_collaborative" ON public.classes FOR SELECT
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.class_members cm 
            WHERE cm.class_id = classes.id AND cm.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.subjects s
            WHERE s.class_id = classes.id
            AND (
                s.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.subject_teachers st
                    WHERE st.subject_id = s.id AND st.teacher_id = auth.uid()
                )
            )
        )
    );

-- Teachers can create classes
CREATE POLICY "classes_insert_teacher" ON public.classes FOR INSERT
    WITH CHECK (
        auth.uid() = owner_id
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    );

-- Class owners can update their classes
CREATE POLICY "classes_update_owner" ON public.classes FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Class owners can delete their classes
CREATE POLICY "classes_delete_owner" ON public.classes FOR DELETE
    USING (auth.uid() = owner_id);

-- ============================================
-- 5. FIX SUBJECTS RLS POLICIES
-- ============================================
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view subjects they own" ON public.subjects;
DROP POLICY IF EXISTS "Users can insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can update subjects they own" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete subjects they own" ON public.subjects;

-- NEW COLLABORATIVE SUBJECTS POLICIES
CREATE POLICY "subjects_select_collaborative" ON public.subjects FOR SELECT
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.subject_teachers st
            WHERE st.subject_id = subjects.id
            AND st.teacher_id = auth.uid()
            AND st.permissions->>'can_view' = 'true'
        )
    );

CREATE POLICY "subjects_insert_teacher" ON public.subjects FOR INSERT
    WITH CHECK (
        auth.uid() = owner_id
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    );

CREATE POLICY "subjects_update_collaborative" ON public.subjects FOR UPDATE
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.subject_teachers st
            WHERE st.subject_id = subjects.id
            AND st.teacher_id = auth.uid()
            AND st.permissions->>'can_edit' = 'true'
        )
    );

CREATE POLICY "subjects_delete_owner" ON public.subjects FOR DELETE
    USING (auth.uid() = owner_id);

-- ============================================
-- 6. FIX ASSIGNMENTS RLS POLICIES
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view assignments they have access to" ON public.assignments;
DROP POLICY IF EXISTS "Users can create assignments for their content" ON public.assignments;
DROP POLICY IF EXISTS "Users can update assignments they have access to" ON public.assignments;
DROP POLICY IF EXISTS "Users can delete assignments they have access to" ON public.assignments;

-- NEW COLLABORATIVE ASSIGNMENTS POLICIES
CREATE POLICY "assignments_select_collaborative" ON public.assignments FOR SELECT
    USING (
        -- Through subject ownership
        EXISTS (
            SELECT 1 FROM public.subjects s
            WHERE s.id = assignments.subject_id
            AND s.owner_id = auth.uid()
        )
        OR
        -- Through subject collaboration
        EXISTS (
            SELECT 1 FROM public.subjects s
            JOIN public.subject_teachers st ON s.id = st.subject_id
            WHERE s.id = assignments.subject_id
            AND st.teacher_id = auth.uid()
            AND st.permissions->>'can_view' = 'true'
        )
        OR
        -- Through class membership (for assignments with class_id)
        (
            assignments.class_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.classes cl
                JOIN public.class_members cm ON cl.id = cm.class_id
                WHERE cl.id = assignments.class_id
                AND cm.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "assignments_insert_collaborative" ON public.assignments FOR INSERT
    WITH CHECK (
        -- Must have subject_id or class_id
        (subject_id IS NOT NULL OR class_id IS NOT NULL)
        AND
        (
            -- Subject owner can create
            (subject_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.subjects s
                WHERE s.id = assignments.subject_id
                AND s.owner_id = auth.uid()
            ))
            OR
            -- Subject collaborator with edit permission
            (subject_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.subjects s
                JOIN public.subject_teachers st ON s.id = st.subject_id
                WHERE s.id = assignments.subject_id
                AND st.teacher_id = auth.uid()
                AND st.permissions->>'can_edit' = 'true'
            ))
            OR
            -- Class owner can create assignments for their class
            (class_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.classes cl
                WHERE cl.id = assignments.class_id
                AND cl.owner_id = auth.uid()
            ))
        )
    );

CREATE POLICY "assignments_update_collaborative" ON public.assignments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.subjects s
            WHERE s.id = assignments.subject_id
            AND s.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.subjects s
            JOIN public.subject_teachers st ON s.id = st.subject_id
            WHERE s.id = assignments.subject_id
            AND st.teacher_id = auth.uid()
            AND st.permissions->>'can_edit' = 'true'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.subjects s
            WHERE s.id = assignments.subject_id
            AND s.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.subjects s
            JOIN public.subject_teachers st ON s.id = st.subject_id
            WHERE s.id = assignments.subject_id
            AND st.teacher_id = auth.uid()
            AND st.permissions->>'can_edit' = 'true'
        )
    );

CREATE POLICY "assignments_delete_owner" ON public.assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.subjects s
            WHERE s.id = assignments.subject_id
            AND s.owner_id = auth.uid()
        )
    );

-- ============================================
-- 7. ENSURE SUBJECT_TEACHERS TABLE EXISTS AND HAS POLICIES
-- ============================================
-- Create table if not exists (from our main migration)
CREATE TABLE IF NOT EXISTS public.subject_teachers (
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner', 'collaborator', 'assistant')),
    permissions JSONB NOT NULL DEFAULT '{"can_view": true, "can_edit": false, "can_grade": false, "can_manage_students": false, "can_share": false, "can_delete": false}',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (subject_id, teacher_id)
);

-- Enable RLS
ALTER TABLE public.subject_teachers ENABLE ROW LEVEL SECURITY;

-- Policies for subject_teachers
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

CREATE POLICY "subject_teachers_insert_policy" ON subject_teachers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_teachers.subject_id
            AND s.owner_id = auth.uid()
        )
    );

CREATE POLICY "subject_teachers_update_policy" ON subject_teachers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_teachers.subject_id
            AND s.owner_id = auth.uid()
        )
    );

CREATE POLICY "subject_teachers_delete_policy" ON subject_teachers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_teachers.subject_id
            AND s.owner_id = auth.uid()
        )
    );

-- ============================================
-- 8. VERIFICATION QUERIES
-- ============================================
-- Show what we fixed
SELECT 'Columns added/verified: class_id, owner_id on subjects; subject_id on classes and assignments' as fix_summary;

-- Count accessible classes for current user
SELECT 
    'Accessible classes:' as metric,
    COUNT(*) as count
FROM public.classes
WHERE 
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.class_members cm WHERE cm.class_id = classes.id AND cm.user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.subjects s
        WHERE s.class_id = classes.id
        AND (s.owner_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.subject_teachers st 
            WHERE st.subject_id = s.id AND st.teacher_id = auth.uid()
        ))
    );

-- Count accessible subjects for current user
SELECT 
    'Accessible subjects:' as metric,
    COUNT(*) as count
FROM public.subjects
WHERE 
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.subject_teachers st 
        WHERE st.subject_id = subjects.id AND st.teacher_id = auth.uid()
    );

SELECT 'Validation and RLS fixes applied successfully!' as status;