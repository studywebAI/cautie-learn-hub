-- Migration: Add scheduling columns to assignments table
-- Run this in Supabase SQL Editor

-- Add scheduling columns
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS scheduled_start_at timestamp with time zone;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS scheduled_end_at timestamp with time zone;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS scheduled_answer_release_at timestamp with time zone;

-- Create indexes for scheduling queries
CREATE INDEX IF NOT EXISTS idx_assignments_scheduled_start ON public.assignments(scheduled_start_at) WHERE scheduled_start_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_scheduled_end ON public.assignments(scheduled_end_at) WHERE scheduled_end_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_scheduled_answer_release ON public.assignments(scheduled_answer_release_at) WHERE scheduled_answer_release_at IS NOT NULL;

-- Verify
SELECT 'Scheduling columns added' as status;
