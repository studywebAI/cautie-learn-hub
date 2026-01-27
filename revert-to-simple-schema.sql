-- Revert to simple schema that matches the current API expectations
-- This drops the hierarchical tables and recreates the simple tables

-- Drop hierarchical tables
DROP TABLE IF EXISTS public.class_assignments CASCADE;
DROP TABLE IF EXISTS public.subject_assignments CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.class_chapters CASCADE;
DROP TABLE IF EXISTS public.class_subchapters CASCADE;
DROP TABLE IF EXISTS public.blocks CASCADE;
DROP TABLE IF EXISTS public.student_answers CASCADE;
DROP TABLE IF EXISTS public.progress_snapshots CASCADE;
DROP TABLE IF EXISTS public.session_logs CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_tiers CASCADE;

-- Recreate simple tables matching API expectations

-- Classes Table
DROP TABLE IF EXISTS public.classes CASCADE;
CREATE TABLE public.classes (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    description text,
    owner_id uuid REFERENCES auth.users ON DELETE CASCADE,
    guest_id text,
    owner_type text DEFAULT 'user',
    join_code text UNIQUE,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE,
    status text
);
ALTER TABLE public.classes OWNER TO postgres;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Assignments Table (simple version)
DROP TABLE IF EXISTS public.assignments CASCADE;
CREATE TABLE public.assignments (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    due_date timestamp with time zone,
    class_id uuid NOT NULL REFERENCES public.classes ON DELETE CASCADE,
    chapter_id uuid,
    block_id uuid,
    type text DEFAULT 'homework',
    content jsonb,
    files jsonb DEFAULT '[]',

    user_id uuid REFERENCES auth.users ON DELETE CASCADE,
    guest_id text,
    owner_type text DEFAULT 'user',
    material_id uuid
);
ALTER TABLE public.assignments OWNER TO postgres;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Class Members Table
DROP TABLE IF EXISTS public.class_members CASCADE;
CREATE TABLE public.class_members (
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    role text NOT NULL DEFAULT 'student'::text,
    PRIMARY KEY (user_id, class_id)
);
ALTER TABLE public.class_members OWNER TO postgres;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Materials Table
DROP TABLE IF EXISTS public.materials CASCADE;
CREATE TABLE public.materials (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    class_id uuid REFERENCES public.classes ON DELETE CASCADE,
    type text NOT NULL,
    title text,
    description text,
    content jsonb NOT NULL,
    source_text text,
    metadata jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    is_public boolean DEFAULT false,
    tags text[],
    content_id uuid
);
ALTER TABLE public.materials OWNER TO postgres;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Notes Table
DROP TABLE IF EXISTS public.notes CASCADE;
CREATE TABLE public.notes (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.notes OWNER TO postgres;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Personal Tasks Table
DROP TABLE IF EXISTS public.personal_tasks CASCADE;
CREATE TABLE public.personal_tasks (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    date timestamp with time zone,
    subject text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.personal_tasks OWNER TO postgres;
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;

-- User Sessions Table
DROP TABLE IF EXISTS public.user_sessions CASCADE;
CREATE TABLE public.user_sessions (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.user_sessions OWNER TO postgres;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- User Preferences Table
DROP TABLE IF EXISTS public.user_preferences CASCADE;
CREATE TABLE public.user_preferences (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    preferences jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);
ALTER TABLE public.user_preferences OWNER TO postgres;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles Table
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    updated_at timestamp with time zone,
    full_name text,
    avatar_url text,
    role text DEFAULT 'student'::text
);
ALTER TABLE public.profiles OWNER TO postgres;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate RLS Policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Classes are viewable by owner and members." ON public.classes FOR SELECT USING (
    auth.uid() = owner_id OR auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid()) OR
    auth.uid() IS NULL AND owner_type = 'guest'
);
CREATE POLICY "Users can insert their own classes." ON public.classes FOR INSERT WITH CHECK (auth.uid() = owner_id OR (auth.uid() IS NULL AND owner_type = 'guest'));
CREATE POLICY "Users can update their own classes." ON public.classes FOR UPDATE USING (auth.uid() = owner_id OR (auth.uid() IS NULL AND owner_type = 'guest')) WITH CHECK (auth.uid() = owner_id OR (auth.uid() IS NULL AND owner_type = 'guest'));
CREATE POLICY "Users can delete their own classes." ON public.classes FOR DELETE USING (auth.uid() = owner_id OR (auth.uid() IS NULL AND owner_type = 'guest'));

CREATE POLICY "Assignments are viewable by class owners and members." ON public.assignments FOR SELECT USING (
    EXISTS (SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND (classes.owner_id = auth.uid() OR classes.user_id = auth.uid() OR EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = assignments.class_id AND class_members.user_id = auth.uid()) OR (auth.uid() IS NULL AND classes.owner_type = 'guest')))
);
CREATE POLICY "Class owners can create assignments." ON public.assignments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND (classes.owner_id = auth.uid() OR (auth.uid() IS NULL AND classes.owner_type = 'guest')))
);
CREATE POLICY "Class owners can update assignments." ON public.assignments FOR UPDATE USING (
    EXISTS (SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND (classes.owner_id = auth.uid() OR (auth.uid() IS NULL AND classes.owner_type = 'guest')))
);
CREATE POLICY "Class owners can delete assignments." ON public.assignments FOR DELETE USING (
    EXISTS (SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND (classes.owner_id = auth.uid() OR (auth.uid() IS NULL AND classes.owner_type = 'guest')))
);

CREATE POLICY "Class members can view other members of the same class." ON public.class_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM class_members AS cm WHERE cm.user_id = auth.uid() AND cm.class_id = class_members.class_id) OR
    EXISTS (SELECT 1 FROM classes WHERE classes.id = class_members.class_id AND classes.owner_id = auth.uid())
);
CREATE POLICY "Class owners can manage class members." ON public.class_members FOR ALL USING (
    EXISTS (SELECT 1 FROM classes WHERE classes.id = class_members.class_id AND classes.owner_id = auth.uid())
);
CREATE POLICY "Users can join a class." ON public.class_members FOR INSERT WITH CHECK (class_members.user_id = auth.uid());
CREATE POLICY "Students can leave classes." ON public.class_members FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own materials" ON public.materials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public materials" ON public.materials FOR SELECT USING (is_public = true);
CREATE POLICY "Class members can view class materials" ON public.materials FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = materials.class_id AND (c.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.class_members cm WHERE cm.class_id = materials.class_id AND cm.user_id = auth.uid())))
);
CREATE POLICY "Class owners can manage class materials" ON public.materials FOR ALL USING (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = materials.class_id AND c.owner_id = auth.uid())
);

CREATE POLICY "Users can manage notes for their materials" ON public.notes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.materials m WHERE m.content_id = notes.id AND m.user_id = auth.uid())
);

CREATE POLICY "Users can manage their own tasks" ON public.personal_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON public.classes(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_owner_id ON public.classes(owner_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON public.materials(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_class_id ON public.materials(class_id);