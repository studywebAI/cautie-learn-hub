-- Add join_code to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS join_code text UNIQUE;

-- Add missing tables for full application functionality
-- Run this in your Supabase SQL editor

-- Drop existing materials table to recreate with all columns
DROP TABLE IF EXISTS public.materials CASCADE;

-- Materials Table: Stores all generated content (notes, flashcards, etc.)
CREATE TABLE public.materials (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "type" text NOT NULL, -- 'notes', 'flashcards', 'quiz', 'mindmap', 'timeline', 'wordweb'
    "title" text,
    "description" text,
    "content" jsonb NOT NULL, -- Flexible storage for different content types
    "source_text" text, -- Original input text
    "metadata" jsonb, -- Additional data like settings, timestamps, etc.
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "is_public" boolean DEFAULT false,
    "tags" text[],
    CONSTRAINT materials_pkey PRIMARY KEY ("id"),
    CONSTRAINT materials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Personal Tasks Table: User's personal agenda items
CREATE TABLE IF NOT EXISTS public.personal_tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    due_date timestamp with time zone,
    completed boolean DEFAULT false,
    priority text DEFAULT 'medium', -- 'low', 'medium', 'high'
    category text, -- 'assignment', 'activity', 'reminder'
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT personal_tasks_pkey PRIMARY KEY (id),
    CONSTRAINT personal_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- User Sessions Table: Track user state for page reload restoration
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    session_data jsonb NOT NULL, -- Store scroll position, zoom level, selected tool, etc.
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- User Preferences Table: Extended preferences beyond basic profile
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    preferences jsonb NOT NULL, -- Store color themes, tool settings, etc.
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
    CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
CREATE POLICY "Users can manage their own materials" ON public.materials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public materials" ON public.materials FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.personal_tasks;
CREATE POLICY "Users can manage their own tasks" ON public.personal_tasks FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);