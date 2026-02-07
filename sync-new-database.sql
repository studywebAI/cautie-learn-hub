-- ============================================================
-- SYNC NEW DATABASE - Non-destructive migration
-- Run this in Supabase SQL Editor on your NEW project
-- Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS everywhere
-- ============================================================

-- ============================================================
-- 1. ENUM TYPES (used by some tables)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'student', 'teacher', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.owner_type_enum AS ENUM ('user', 'guest');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 2. MISSING COLUMNS ON EXISTING TABLES
-- ============================================================

-- profiles: add email
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- subjects: add description, updated_at, class_id (legacy, nullable)
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

-- assignments: add is_visible, class_id (if missing)
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS content json;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'user';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS guest_id text;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- notes: add title, user_id, guest_id, owner_type
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS guest_id text;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'user';

-- notifications: add read_at if missing
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- rubrics: add total_points
ALTER TABLE public.rubrics ADD COLUMN IF NOT EXISTS total_points numeric DEFAULT 0;

-- personal_tasks: add missing columns from old DB
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS guest_id text;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'user';
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS estimated_duration integer DEFAULT 60;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS dependencies uuid[] DEFAULT '{}';
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS recurrence jsonb;

-- blocks: add material_id, chapter_id, order_index (safe, no FK constraint to avoid issues if referenced tables don't exist yet)
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS material_id uuid;
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS chapter_id uuid;
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- Make blocks.assignment_id nullable (blocks can belong to materials or chapters instead)
DO $$ BEGIN
  ALTER TABLE public.blocks ALTER COLUMN assignment_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;


-- ============================================================
-- 3. MISSING TABLES
-- ============================================================

-- materials: add content_id if missing
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS content_id uuid;

-- classes: add missing columns
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS guest_id text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'user';
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS status text;

-- class_members: ensure ON DELETE CASCADE exists (safe re-add)
-- Note: Can't easily alter FK constraints, but table creation already has them

-- class_subjects (many-to-many join table) - CRITICAL for student subject visibility
CREATE TABLE IF NOT EXISTS public.class_subjects (
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, subject_id)
);

-- announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- attendance_sessions
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    title text NOT NULL,
    date date NOT NULL,
    start_time time,
    end_time time,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- attendance_records
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    marked_at timestamptz NOT NULL DEFAULT now(),
    marked_by uuid REFERENCES auth.users(id),
    notes text
);

-- ai_grading_queue
CREATE TABLE IF NOT EXISTS public.ai_grading_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id uuid NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz
);

-- notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    announcement boolean DEFAULT true,
    submission_graded boolean DEFAULT true,
    assignment_due boolean DEFAULT true,
    assignment_created boolean DEFAULT true,
    class_invitation boolean DEFAULT true,
    ai_content_generated boolean DEFAULT true,
    ai_grading_completed boolean DEFAULT true,
    comment_added boolean DEFAULT true,
    deadline_reminder boolean DEFAULT true,
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- grading_categories
CREATE TABLE IF NOT EXISTS public.grading_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    weight numeric NOT NULL CHECK (weight > 0 AND weight <= 100),
    color text DEFAULT '#3b82f6',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- rubric_items (old DB version, complementary to rubric_criteria)
CREATE TABLE IF NOT EXISTS public.rubric_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_id uuid NOT NULL REFERENCES public.rubrics(id) ON DELETE CASCADE,
    criterion text NOT NULL,
    description text,
    max_score numeric NOT NULL DEFAULT 4,
    weight numeric DEFAULT 1,
    order_index integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- submission_comments
CREATE TABLE IF NOT EXISTS public.submission_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    comment text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- submission_rubric_scores
CREATE TABLE IF NOT EXISTS public.submission_rubric_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    rubric_item_id uuid NOT NULL REFERENCES public.rubric_items(id) ON DELETE CASCADE,
    score numeric NOT NULL,
    feedback text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- subchapters (under chapters)
CREATE TABLE IF NOT EXISTS public.subchapters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    content jsonb,
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- subject_chapters (subject-level content hierarchy)
CREATE TABLE IF NOT EXISTS public.subject_chapters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    order_index integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- subject_subchapters
CREATE TABLE IF NOT EXISTS public.subject_subchapters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id uuid NOT NULL REFERENCES public.subject_chapters(id) ON DELETE CASCADE,
    title text NOT NULL,
    order_index integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- subject_assignments
CREATE TABLE IF NOT EXISTS public.subject_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subchapter_id uuid NOT NULL REFERENCES public.subject_subchapters(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    content jsonb,
    order_index integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- class_chapters (class-level content hierarchy)
CREATE TABLE IF NOT EXISTS public.class_chapters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    order_index integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- class_subchapters
CREATE TABLE IF NOT EXISTS public.class_subchapters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id uuid NOT NULL REFERENCES public.class_chapters(id) ON DELETE CASCADE,
    title text NOT NULL,
    order_index integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- class_assignments
CREATE TABLE IF NOT EXISTS public.class_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subchapter_id uuid NOT NULL REFERENCES public.class_subchapters(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    content jsonb,
    ai_generated boolean DEFAULT false,
    order_index integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- class_templates
CREATE TABLE IF NOT EXISTS public.class_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    owner_id uuid NOT NULL REFERENCES auth.users(id),
    is_public boolean DEFAULT false,
    template_data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- subscription_tiers
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    max_classes integer DEFAULT 10,
    max_chapters_per_subject integer DEFAULT 50,
    max_paragraphs_per_chapter integer DEFAULT 20,
    max_assignments_per_paragraph integer DEFAULT 100,
    ai_grading_enabled boolean DEFAULT true,
    analytics_enabled boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- user_subscriptions
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tier_id uuid REFERENCES public.subscription_tiers(id),
    started_at timestamptz NOT NULL DEFAULT now(),
    ends_at timestamptz
);

-- user_sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_preferences (key-value style from setup_all.sql)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preference_key text NOT NULL,
    preference_value jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, preference_key)
);

-- user_roles (for secure role management)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'student',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);


-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- Generate unique join code
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.classes WHERE join_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Assignment index to letters (0=a, 1=b, 26=aa, etc.)
CREATE OR REPLACE FUNCTION public.assignment_index_to_letters(index integer)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  result text := '';
  num integer := index;
BEGIN
  IF num = 0 THEN RETURN 'a'; END IF;
  WHILE num >= 0 LOOP
    result := chr(97 + (num % 26)) || result;
    num := num / 26 - 1;
    IF num < 0 THEN EXIT; END IF;
  END LOOP;
  RETURN result;
END;
$$;

-- has_role security definer function (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$$;

-- Handle new user sign-up: create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, role, theme, language, high_contrast, dyslexia_font, reduced_motion)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    'student', 'pastel', 'en', false, false, false
  );
  RETURN new;
END;
$$;

-- Re-create trigger (safe: drops first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================================
-- 5. ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_grading_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_rubric_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subchapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_subchapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subchapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Also ensure existing tables have RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 6. RLS POLICIES - CRITICAL: class_subjects for student visibility
-- ============================================================

-- *** class_subjects: students in a class can see linked subjects ***
DROP POLICY IF EXISTS "class_subjects_select" ON public.class_subjects;
DROP POLICY IF EXISTS "class_subjects_insert" ON public.class_subjects;
DROP POLICY IF EXISTS "class_subjects_delete" ON public.class_subjects;

CREATE POLICY "class_subjects_select" ON public.class_subjects
  FOR SELECT USING (
    -- Class owner or class member can see links
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_subjects.class_id AND c.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = class_subjects.class_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "class_subjects_insert" ON public.class_subjects
  FOR INSERT WITH CHECK (
    -- Only class owner can link subjects
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_subjects.class_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "class_subjects_delete" ON public.class_subjects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = class_subjects.class_id AND c.owner_id = auth.uid()
    )
  );

-- *** subjects: students can read subjects linked to their classes ***
DROP POLICY IF EXISTS "subjects_allow_authenticated_read" ON public.subjects;
DROP POLICY IF EXISTS "subjects_allow_authenticated_insert" ON public.subjects;
DROP POLICY IF EXISTS "subjects_allow_authenticated_update" ON public.subjects;
DROP POLICY IF EXISTS "subjects_allow_authenticated_delete" ON public.subjects;
DROP POLICY IF EXISTS "subjects_all" ON public.subjects;
DROP POLICY IF EXISTS "subjects_select_policy" ON public.subjects;
DROP POLICY IF EXISTS "subjects_insert_policy" ON public.subjects;
DROP POLICY IF EXISTS "subjects_update_policy" ON public.subjects;
DROP POLICY IF EXISTS "subjects_delete_policy" ON public.subjects;

CREATE POLICY "subjects_select" ON public.subjects
  FOR SELECT USING (
    -- Owner of the subject
    user_id = auth.uid()
    OR
    -- Member of a class that has this subject linked
    EXISTS (
      SELECT 1 FROM public.class_subjects cs
      JOIN public.class_members cm ON cm.class_id = cs.class_id
      WHERE cs.subject_id = subjects.id AND cm.user_id = auth.uid()
    )
    OR
    -- Owner of a class that has this subject linked
    EXISTS (
      SELECT 1 FROM public.class_subjects cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.subject_id = subjects.id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "subjects_insert" ON public.subjects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "subjects_update" ON public.subjects
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_subjects cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.subject_id = subjects.id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "subjects_delete" ON public.subjects
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_subjects cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.subject_id = subjects.id AND c.owner_id = auth.uid()
    )
  );


-- *** Classes: viewable by owner + members, public lookup by join_code ***
DROP POLICY IF EXISTS "classes_allow_authenticated_read" ON public.classes;
DROP POLICY IF EXISTS "classes_allow_authenticated_insert" ON public.classes;
DROP POLICY IF EXISTS "classes_allow_authenticated_update" ON public.classes;
DROP POLICY IF EXISTS "classes_allow_authenticated_delete" ON public.classes;
DROP POLICY IF EXISTS "classes_all" ON public.classes;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.classes;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.classes;
DROP POLICY IF EXISTS "Allow authenticated update for owners" ON public.classes;
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON public.classes;

CREATE POLICY "classes_select" ON public.classes
  FOR SELECT USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_members cm WHERE cm.class_id = classes.id AND cm.user_id = auth.uid()
    )
    OR join_code IS NOT NULL  -- Allow lookup by join_code for joining
  );

CREATE POLICY "classes_insert" ON public.classes
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "classes_update" ON public.classes
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "classes_delete" ON public.classes
  FOR DELETE USING (owner_id = auth.uid());


-- *** Class members ***
DROP POLICY IF EXISTS "members_allow_authenticated_read" ON public.class_members;
DROP POLICY IF EXISTS "members_allow_authenticated_insert" ON public.class_members;
DROP POLICY IF EXISTS "members_allow_authenticated_update" ON public.class_members;
DROP POLICY IF EXISTS "members_allow_authenticated_delete" ON public.class_members;
DROP POLICY IF EXISTS "class_members_all" ON public.class_members;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.class_members;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.class_members;
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON public.class_members;

CREATE POLICY "class_members_select" ON public.class_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c WHERE c.id = class_members.class_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "class_members_insert" ON public.class_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c WHERE c.id = class_members.class_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "class_members_delete" ON public.class_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classes c WHERE c.id = class_members.class_id AND c.owner_id = auth.uid()
    )
  );


-- *** Profiles ***
DROP POLICY IF EXISTS "users_can_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "Allow read access for users and teachers" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual insert access" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update access" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.class_members cm
      JOIN public.classes c ON cm.class_id = c.id
      WHERE cm.user_id = profiles.id
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.class_members cm2
          WHERE cm2.class_id = c.id AND cm2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);


-- *** Announcements ***
CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = announcements.class_id AND c.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.class_members cm WHERE cm.class_id = announcements.class_id AND cm.user_id = auth.uid())
  );
CREATE POLICY "announcements_insert" ON public.announcements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = announcements.class_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "announcements_delete" ON public.announcements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = announcements.class_id AND c.owner_id = auth.uid())
  );


-- *** Attendance ***
CREATE POLICY "attendance_sessions_all" ON public.attendance_sessions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "attendance_records_all" ON public.attendance_records FOR ALL USING (auth.uid() IS NOT NULL);


-- *** Content hierarchy (authenticated access) ***
CREATE POLICY "subject_chapters_all" ON public.subject_chapters FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "subject_subchapters_all" ON public.subject_subchapters FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "subject_assignments_all" ON public.subject_assignments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "class_chapters_all" ON public.class_chapters FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "class_subchapters_all" ON public.class_subchapters FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "class_assignments_all" ON public.class_assignments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "subchapters_all" ON public.subchapters FOR ALL USING (auth.uid() IS NOT NULL);


-- *** Other tables - authenticated access ***
CREATE POLICY "ai_grading_queue_all" ON public.ai_grading_queue FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "notification_preferences_own" ON public.notification_preferences FOR ALL USING (user_id = auth.uid());
CREATE POLICY "grading_categories_all" ON public.grading_categories FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "rubric_items_all" ON public.rubric_items FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "submission_comments_all" ON public.submission_comments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "submission_rubric_scores_all" ON public.submission_rubric_scores FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "class_templates_all" ON public.class_templates FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "subscription_tiers_read" ON public.subscription_tiers FOR SELECT USING (true);
CREATE POLICY "user_subscriptions_own" ON public.user_subscriptions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_sessions_own" ON public.user_sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_preferences_own" ON public.user_preferences FOR ALL USING (user_id = auth.uid());
CREATE POLICY "user_roles_own" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- Existing tables that may need policies refreshed
-- Notes
DROP POLICY IF EXISTS "notes_all" ON public.notes;
CREATE POLICY "notes_own" ON public.notes FOR ALL USING (
  user_id = auth.uid() OR user_id IS NULL
);

-- Notifications  
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- Personal tasks
DROP POLICY IF EXISTS "personal_tasks_own" ON public.personal_tasks;
CREATE POLICY "personal_tasks_own" ON public.personal_tasks FOR ALL USING (user_id = auth.uid());

-- Materials
DROP POLICY IF EXISTS "materials_all" ON public.materials;
CREATE POLICY "materials_access" ON public.materials FOR ALL USING (
  user_id = auth.uid()
  OR is_public = true
  OR EXISTS (
    SELECT 1 FROM public.class_members cm WHERE cm.class_id = materials.class_id AND cm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = materials.class_id AND c.owner_id = auth.uid()
  )
);


-- ============================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON public.class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject_id ON public.class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_announcements_class_id ON public.announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_id ON public.attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_grading_categories_class_id ON public.grading_categories(class_id);
CREATE INDEX IF NOT EXISTS idx_rubric_items_rubric_id ON public.rubric_items(rubric_id);
CREATE INDEX IF NOT EXISTS idx_submission_comments_submission_id ON public.submission_comments(submission_id);
CREATE INDEX IF NOT EXISTS idx_subject_chapters_subject_id ON public.subject_chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_subchapters_chapter_id ON public.subject_subchapters(chapter_id);
CREATE INDEX IF NOT EXISTS idx_class_chapters_class_id ON public.class_chapters(class_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Existing table indexes (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter_id ON public.paragraphs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assignments_paragraph_id ON public.assignments(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_blocks_assignment_id ON public.blocks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_paragraph ON public.progress_snapshots(student_id, paragraph_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_student_paragraph ON public.session_logs(student_id, paragraph_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_student_block ON public.student_answers(student_id, block_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_user_id ON public.personal_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_class_id ON public.rubrics(class_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);


-- ============================================================
-- 8. RELOAD SCHEMA CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 9. VERIFICATION
-- ============================================================
SELECT 'Migration completed!' AS status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS total_tables,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') AS total_functions;
