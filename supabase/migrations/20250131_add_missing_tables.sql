-- Add missing tables from original project
-- Attendance Sessions
CREATE TABLE public.attendance_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title text NOT NULL,
    date date NOT NULL,
    start_time time with time zone,
    end_time time with time zone,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Attendance Records
CREATE TABLE public.attendance_records (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL,
    timestamp timestamp with time zone NOT NULL DEFAULT now(),
    notes text
);

-- AI Grading Queue
CREATE TABLE public.ai_grading_queue (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    block_id uuid NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    error_message text
);

-- Announcements
CREATE TABLE public.announcements (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone
);

-- Attendance Records
CREATE TABLE public.attendance_records (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL,
    timestamp timestamp with time zone NOT NULL DEFAULT now(),
    notes text
);

-- Attendance Sessions
CREATE TABLE public.attendance_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title text NOT NULL,
    date date NOT NULL,
    start_time time with time zone,
    end_time time with time zone,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Class Assignments
CREATE TABLE public.class_assignments (
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, assignment_id)
);

-- Class Chapters
CREATE TABLE public.class_chapters (
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, chapter_id)
);

-- Class Subchapters
CREATE TABLE public.class_subchapters (
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subchapter_id uuid NOT NULL REFERENCES subchapters(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, subchapter_id)
);

-- Class Templates
CREATE TABLE public.class_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    class_structure jsonb NOT NULL,
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Grading Categories
CREATE TABLE public.grading_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name text NOT NULL,
    weight numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Notes
CREATE TABLE public.notes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Notification Preferences
CREATE TABLE public.notification_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_type UNIQUE (user_id, notification_type)
);

-- Rubric Items
CREATE TABLE public.rubric_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rubric_id uuid NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    max_score integer NOT NULL DEFAULT 10,
    weight numeric DEFAULT 1,
    position integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Subchapters
CREATE TABLE public.subchapters (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    subchapter_number integer NOT NULL,
    title text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unique_chapter_subchapter UNIQUE (chapter_id, subchapter_number)
);

-- Subject Assignments
CREATE TABLE public.subject_assignments (
    subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (subject_id, assignment_id)
);

-- Subject Chapters
CREATE TABLE public.subject_chapters (
    subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (subject_id, chapter_id)
);

-- Subject Subchapters
CREATE TABLE public.subject_subchapters (
    subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    subchapter_id uuid NOT NULL REFERENCES subchapters(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (subject_id, subchapter_id)
);

-- Submission Comments
CREATE TABLE public.submission_comments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Submission Rubric Scores
CREATE TABLE public.submission_rubric_scores (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    rubric_item_id uuid NOT NULL REFERENCES rubric_items(id) ON DELETE CASCADE,
    score numeric NOT NULL,
    feedback text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Subscription Tiers
CREATE TABLE public.subscription_tiers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    features jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User Preferences
CREATE TABLE public.user_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preference_key text NOT NULL,
    preference_value jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_preference UNIQUE (user_id, preference_key)
);

-- User Sessions
CREATE TABLE public.user_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone
);

-- User Subscriptions
CREATE TABLE public.user_subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier_id uuid NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
    start_date date NOT NULL,
    end_date date,
    status text NOT NULL DEFAULT 'active',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for all new tables
ALTER TABLE public.ai_grading_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subchapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subchapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_subchapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_rubric_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_grading_queue_assignment ON public.ai_grading_queue(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ai_grading_queue_student ON public.ai_grading_queue(student_id);
CREATE INDEX IF NOT EXISTS idx_announcements_class ON public.announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class ON public.attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_created_by ON public.attendance_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_class_assignments_class ON public.class_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_assignments_assignment ON public.class_assignments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_class_chapters_class ON public.class_chapters(class_id);
CREATE INDEX IF NOT EXISTS idx_class_chapters_chapter ON public.class_chapters(chapter_id);
CREATE INDEX IF NOT EXISTS idx_class_subchapters_class ON public.class_subchapters(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subchapters_subchapter ON public.class_subchapters(subchapter_id);
CREATE INDEX IF NOT EXISTS idx_grading_categories_class ON public.grading_categories(class_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_rubric_items_rubric ON public.rubric_items(rubric_id);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_subject ON public.subject_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_assignment ON public.subject_assignments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_subject_chapters_subject ON public.subject_chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_chapters_chapter ON public.subject_chapters(chapter_id);
CREATE INDEX IF NOT EXISTS idx_subject_subchapters_subject ON public.subject_subchapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_subchapters_subchapter ON public.subject_subchapters(subchapter_id);
CREATE INDEX IF NOT EXISTS idx_submission_comments_submission ON public.submission_comments(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_comments_user ON public.submission_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_submission_rubric_scores_submission ON public.submission_rubric_scores(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_rubric_scores_rubric_item ON public.submission_rubric_scores(rubric_item_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON public.user_subscriptions(tier_id);