-- Migration: Add scheduling, description, and linked_content to assignments
-- Run this in Supabase SQL Editor

-- Add scheduling columns
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS scheduled_start_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS scheduled_end_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS scheduled_answer_release_at timestamp with time zone;

-- Add description and linked_content columns
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS linked_content jsonb DEFAULT '[]'::jsonb;

-- Create indexes for scheduling queries
CREATE INDEX IF NOT EXISTS idx_assignments_scheduled_start ON public.assignments(scheduled_start_at) WHERE scheduled_start_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_scheduled_end ON public.assignments(scheduled_end_at) WHERE scheduled_end_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_scheduled_answer_release ON public.assignments(scheduled_answer_release_at) WHERE scheduled_answer_release_at IS NOT NULL;

-- Create GIN index for linked_content JSONB queries
CREATE INDEX IF NOT EXISTS idx_assignments_linked_content ON public.assignments USING gin(linked_content);

-- Verify
SELECT 'All assignment enhancements added successfully' as status;