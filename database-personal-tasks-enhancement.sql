-- Enhance personal_tasks table for Smart Scheduling features

-- Add priority column
ALTER TABLE public.personal_tasks
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- Add estimated_duration (in minutes)
ALTER TABLE public.personal_tasks
ADD COLUMN IF NOT EXISTS estimated_duration integer DEFAULT 60 CHECK (estimated_duration > 0);

-- Add tags (array of strings)
ALTER TABLE public.personal_tasks
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add dependencies (array of task ids)
ALTER TABLE public.personal_tasks
ADD COLUMN IF NOT EXISTS dependencies uuid[] DEFAULT '{}';

-- Add status
ALTER TABLE public.personal_tasks
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

-- Add completed_at timestamp
ALTER TABLE public.personal_tasks
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- Add recurrence (optional JSON for recurring tasks)
ALTER TABLE public.personal_tasks
ADD COLUMN IF NOT EXISTS recurrence jsonb;

-- Update the updated_at trigger (assuming trigger exists, if not add)
-- Note: Ensure there's a trigger to update updated_at on changes

-- Update RLS policies if needed (existing should cover)