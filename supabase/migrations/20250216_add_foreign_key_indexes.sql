-- Add indexes on all foreign keys for better query performance
-- Run this after the main schema is in place

-- Classes table indexes
CREATE INDEX IF NOT EXISTS idx_classes_owner_id ON public.classes(owner_id);
CREATE INDEX IF NOT EXISTS idx_classes_join_code ON public.classes(join_code);

-- Class Members indexes (composite for common queries)
CREATE INDEX IF NOT EXISTS idx_class_members_class_id ON public.class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user_id ON public.class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_class_members_class_user ON public.class_members(class_id, user_id);

-- Subjects indexes
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);

-- Class Subjects junction table indexes (composite is crucial)
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON public.class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject_id ON public.class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_subject ON public.class_subjects(class_id, subject_id);

-- Chapters indexes
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject_number ON public.chapters(subject_id, chapter_number);

-- Paragraphs indexes
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_id ON public.paragraphs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_number ON public.paragraphs(chapter_id, paragraph_number);

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_paragraph_id ON public.assignments(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_assignments_scheduled_start ON public.assignments(scheduled_start_at);
CREATE INDEX IF NOT EXISTS idx_assignments_completed ON public.assignments(completed);
CREATE INDEX IF NOT EXISTS idx_assignments_type ON public.assignments(type);

-- Materials indexes
CREATE INDEX IF NOT EXISTS idx_materials_class_id ON public.materials(class_id);
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON public.materials(user_id);

-- Progress tracking indexes (if progress_snapshots table exists)
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'progress_snapshots') THEN
        CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_id ON public.progress_snapshots(student_id);
        CREATE INDEX IF NOT EXISTS idx_progress_snapshots_paragraph_id ON public.progress_snapshots(paragraph_id);
        CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_paragraph ON public.progress_snapshots(student_id, paragraph_id);
    END IF;
END $$;

-- Blocks indexes
-- Note: blocks table does not have paragraph_id column in current schema
CREATE INDEX IF NOT EXISTS idx_blocks_assignment_id ON public.blocks(assignment_id);

-- Submissions indexes
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_user ON public.submissions(assignment_id, user_id);

-- Announcements indexes
CREATE INDEX IF NOT EXISTS idx_announcements_class_id ON public.announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
