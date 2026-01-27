-- Comprehensive Database Setup for Cautie
-- Run this in your Supabase SQL editor to set up everything
-- Uses IF NOT EXISTS to avoid errors if tables already exist

-- Clean slate (only drop if exists)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Classes are viewable by owner and members." ON public.classes;
DROP POLICY IF EXISTS "Users can insert their own classes." ON public.classes;
DROP POLICY IF EXISTS "Users can update their own classes." ON public.classes;
DROP POLICY IF EXISTS "Users can delete their own classes." ON public.classes;
DROP POLICY IF EXISTS "Class members can view other members of the same class." ON public.class_members;
DROP POLICY IF EXISTS "Class owners can manage class members." ON public.class_members;
DROP POLICY IF EXISTS "Users can join a class." ON public.class_members;
DROP POLICY IF EXISTS "Students can leave classes." ON public.class_members;
DROP POLICY IF EXISTS "Assignments are viewable by class owners and members." ON public.assignments;
DROP POLICY IF EXISTS "Class owners can create assignments." ON public.assignments;
DROP POLICY IF EXISTS "Class owners can update assignments." ON public.assignments;
DROP POLICY IF EXISTS "Class owners can delete assignments." ON public.assignments;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create Tables with IF NOT EXISTS

-- Profiles Table: Stores public-facing user data
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    updated_at timestamp with time zone,
    full_name text,
    avatar_url text,
    role text DEFAULT 'student'::text
);
ALTER TABLE public.profiles OWNER TO postgres;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Classes Table: Stores class information
CREATE TABLE IF NOT EXISTS public.classes (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    description text,
    owner_id uuid REFERENCES auth.users ON DELETE CASCADE,
    guest_id text,
    owner_type text DEFAULT 'user',
    join_code text UNIQUE
);
ALTER TABLE public.classes OWNER TO postgres;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Assignments Table: Stores assignments for classes
CREATE TABLE IF NOT EXISTS public.assignments (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    due_date timestamp with time zone,
    content json,
    class_id uuid NOT NULL REFERENCES public.classes ON DELETE CASCADE,
    owner_id uuid REFERENCES auth.users ON DELETE CASCADE,
    guest_id text,
    owner_type text DEFAULT 'user',
    material_id uuid
);
ALTER TABLE public.assignments OWNER TO postgres;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Class Members Table: Junction table for users and classes
CREATE TABLE IF NOT EXISTS public.class_members (
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    role text NOT NULL DEFAULT 'student'::text,
    PRIMARY KEY (user_id, class_id)
);
ALTER TABLE public.class_members OWNER TO postgres;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Materials Table: Stores all generated content (notes, flashcards, etc.)
CREATE TABLE IF NOT EXISTS public.materials (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    "class_id" uuid REFERENCES public.classes ON DELETE CASCADE,
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
    "content_id" uuid, -- For linking to notes table if needed
    CONSTRAINT materials_pkey PRIMARY KEY ("id")
);

-- Notes Table: For storing note content separately
CREATE TABLE IF NOT EXISTS public.notes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT notes_pkey PRIMARY KEY (id)
);

-- Blocks Table: Stores blocks within materials
CREATE TABLE IF NOT EXISTS public.blocks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    material_id uuid NOT NULL REFERENCES public.materials (id) ON DELETE CASCADE,
    content jsonb NOT NULL,
    type text NOT NULL,
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT blocks_pkey PRIMARY KEY (id)
);

-- Personal Tasks Table: User's personal agenda items
CREATE TABLE IF NOT EXISTS public.personal_tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    date timestamp with time zone,
    subject text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT personal_tasks_pkey PRIMARY KEY (id)
);

-- User Sessions Table: Track user state for page reload restoration
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_sessions_pkey PRIMARY KEY (id)
);

-- User Preferences Table: Extended preferences beyond basic profile
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    preferences jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
    CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create Functions and Triggers

-- Function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'student');
  return new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create user preferences when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, preferences)
  VALUES (new.id, '{"language": "en", "theme": "system", "role": "student", "tier": "free", "onboarding_completed": false}');
  return new;
END;
$$;

-- Trigger to call handle_new_user_preferences on new user creation
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_preferences();

-- Set up Row Level Security (RLS)

-- Profiles RLS
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Classes RLS
CREATE POLICY "Classes are viewable by owner and members." ON public.classes FOR SELECT USING (
    auth.uid() = owner_id
    OR
    EXISTS (
        SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid()
    )
    OR
    auth.uid() IS NULL AND owner_type = 'guest' -- Allow guest access
);
CREATE POLICY "Users can insert their own classes." ON public.classes FOR INSERT WITH CHECK (auth.uid() = owner_id OR (auth.uid() IS NULL AND owner_type = 'guest'));
CREATE POLICY "Users can update their own classes." ON public.classes FOR UPDATE USING (auth.uid() = owner_id OR (auth.uid() IS NULL AND owner_type = 'guest')) WITH CHECK (auth.uid() = owner_id OR (auth.uid() IS NULL AND owner_type = 'guest'));
CREATE POLICY "Users can delete their own classes." ON public.classes FOR DELETE USING (auth.uid() = owner_id OR (auth.uid() IS NULL AND owner_type = 'guest'));

-- Allow select on join_code for uniqueness check
CREATE POLICY "Allow join_code access for uniqueness" ON public.classes FOR SELECT USING (true);

-- Assignments RLS
CREATE POLICY "Assignments are viewable by class owners and members." ON public.assignments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = assignments.class_id AND (
            classes.owner_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM class_members
                WHERE class_members.class_id = assignments.class_id AND class_members.user_id = auth.uid()
            )
            OR
            auth.uid() IS NULL AND classes.owner_type = 'guest'
        )
    )
);
CREATE POLICY "Class owners can create assignments." ON public.assignments FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND (classes.owner_id = auth.uid() OR (auth.uid() IS NULL AND classes.owner_type = 'guest'))
    )
);
CREATE POLICY "Class owners can update assignments." ON public.assignments FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND (classes.owner_id = auth.uid() OR (auth.uid() IS NULL AND classes.owner_type = 'guest'))
    )
);
CREATE POLICY "Class owners can delete assignments." ON public.assignments FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND (classes.owner_id = auth.uid() OR (auth.uid() IS NULL AND classes.owner_type = 'guest'))
    )
);

-- Class Members RLS
CREATE POLICY "Class members can view other members of the same class." ON public.class_members FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM class_members AS cm
        WHERE cm.user_id = auth.uid() AND cm.class_id = class_members.class_id
    )
    OR
    EXISTS (
        SELECT 1 FROM classes WHERE classes.id = class_members.class_id AND classes.owner_id = auth.uid()
    )
);

CREATE POLICY "Class owners can manage class members." ON public.class_members FOR ALL USING (
    EXISTS (
        SELECT 1 FROM classes
        WHERE classes.id = class_members.class_id AND classes.owner_id = auth.uid()
    )
);
CREATE POLICY "Users can join a class." ON public.class_members FOR INSERT WITH CHECK (
    class_members.user_id = auth.uid()
);
CREATE POLICY "Students can leave classes." ON public.class_members FOR DELETE USING (
    user_id = auth.uid()
);

-- Materials RLS
CREATE POLICY "Users can manage their own materials" ON public.materials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public materials" ON public.materials FOR SELECT USING (is_public = true);
CREATE POLICY "Class members can view class materials" ON public.materials FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = materials.class_id AND (
            c.owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.class_members cm
                WHERE cm.class_id = materials.class_id AND cm.user_id = auth.uid()
            )
        )
    )
);
CREATE POLICY "Class owners can manage class materials" ON public.materials FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = materials.class_id AND c.owner_id = auth.uid()
    )
);

-- Notes RLS
CREATE POLICY "Users can manage notes for their materials" ON public.notes FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.content_id = notes.id AND m.user_id = auth.uid()
    )
);

-- Blocks RLS
CREATE POLICY "Users can manage blocks for their materials" ON public.blocks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.id = blocks.material_id AND m.user_id = auth.uid()
    )
);

-- Personal Tasks RLS
CREATE POLICY "Users can manage their own tasks" ON public.personal_tasks FOR ALL USING (auth.uid() = user_id);

-- User Sessions RLS
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions FOR ALL USING (auth.uid() = user_id);

-- User Preferences RLS
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);