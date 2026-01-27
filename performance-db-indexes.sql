-- Performance Optimization: Database Indexes for Analytics Queries
-- Run this on your Supabase database to speed up slow analytics queries
-- Only includes indexes for core tables that definitely exist

-- Index for session logs analytics (most important - used in weekly study time)
CREATE INDEX IF NOT EXISTS idx_session_logs_student_date
ON session_logs(student_id, started_at DESC);

-- Index for progress snapshots
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student
ON progress_snapshots(student_id, completion_percent);

-- Index for submissions with assignments join
CREATE INDEX IF NOT EXISTS idx_submissions_user_assignments
ON submissions(user_id, assignment_id);

-- Index for class members lookup
CREATE INDEX IF NOT EXISTS idx_class_members_user
ON class_members(user_id, class_id);

-- Index for student answers analytics
CREATE INDEX IF NOT EXISTS idx_student_answers_student_correct
ON student_answers(student_id, is_correct);

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_id
ON profiles(id, role);

-- Index for session logs date range queries
CREATE INDEX IF NOT EXISTS idx_session_logs_date_range
ON session_logs(started_at, finished_at, student_id);