-- Add deadline column to assignments table
ALTER TABLE public.assignments ADD COLUMN deadline timestamp with time zone NULL;