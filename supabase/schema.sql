-- Drop policies, tables, and functions in a safe order to ensure the script is re-runnable.

-- Drop Policies first, as they depend on tables.
-- Note: Dropping the table will also drop its policies, but being explicit is safer.
-- We will handle policy drops implicitly by dropping the tables.

-- Drop Tables in reverse order of creation to respect foreign key constraints.
DROP TABLE IF EXISTS public.class_members;
DROP TABLE IF EXISTS public.assignments;
DROP TABLE IF EXISTS public.classes;
DROP TABLE IF EXISTS public.profiles;

-- Drop Functions that might depend on types or other structures.
DROP FUNCTION IF EXISTS public.handle_new_user;

-- Step 1: Create all tables first, with no other dependencies.
-- This ensures all relations exist before we try to apply security or functions.

-- Create the profiles table to store user-specific data.
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    avatar_url text,
    role text DEFAULT 'student'::text,
    theme text DEFAULT 'light'::text,
    language text DEFAULT 'en'::text,
    high_contrast boolean DEFAULT false,
    dyslexia_font boolean DEFAULT false,
    reduced_motion boolean DEFAULT false,
    updated_at timestamp with time zone
);
COMMENT ON TABLE public.profiles IS 'Profile data for each user.';

-- Create the classes table for teachers to create their classes.
CREATE TABLE public.classes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    description text,
    owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.classes IS 'Represents a class created by a teacher.';

-- Create the assignments table.
-- This table was the source of the previous errors. It is now guaranteed to exist before policies are applied.
CREATE TABLE public.assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    due_date timestamp with time zone,
    content json
);
COMMENT ON TABLE public.assignments IS 'Assignments created by teachers for a class.';

-- Create a join table for class members.
CREATE TABLE public.class_members (
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    role text NOT NULL DEFAULT 'student'::text,
    PRIMARY KEY (class_id, user_id)
);
COMMENT ON TABLE public.class_members IS 'Join table for users who are members of a class.';

-- Step 2: Create functions and triggers.
-- This function runs after a user is created in the auth system.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, theme, language, high_contrast, dyslexia_font, reduced_motion)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'student', 'light', 'en', false, false, false);
  return new;
END;
$$;

-- Create the trigger that uses the function above.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Enable Row Level Security (RLS) and define policies for each table.
-- This is the final step, ensuring tables exist before policies are attached.

-- Profiles Table RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Classes Table RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view classes they own or are a member of" ON public.classes;
CREATE POLICY "Users can view classes they own or are a member of" ON public.classes FOR SELECT
  USING (auth.uid() = owner_id OR EXISTS (
    SELECT 1 FROM public.class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
CREATE POLICY "Teachers can create classes" ON public.classes FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Class owners can update their classes" ON public.classes;
CREATE POLICY "Class owners can update their classes" ON public.classes FOR UPDATE
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Class owners can delete their classes" ON public.classes;
CREATE POLICY "Class owners can delete their classes" ON public.classes FOR DELETE
  USING (auth.uid() = owner_id);

-- Assignments Table RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view assignments for their classes" ON public.assignments;
CREATE POLICY "Users can view assignments for their classes" ON public.assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = assignments.class_id AND (c.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.class_members cm WHERE cm.class_id = c.id AND cm.user_id = auth.uid()
    ))
  ));
DROP POLICY IF EXISTS "Class owners can create assignments" ON public.assignments;
CREATE POLICY "Class owners can create assignments" ON public.assignments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.classes WHERE id = assignments.class_id AND owner_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Class owners can update assignments" ON public.assignments;
CREATE POLICY "Class owners can update assignments" ON public.assignments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.classes WHERE id = assignments.class_id AND owner_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Class owners can delete assignments" ON public.assignments;
CREATE POLICY "Class owners can delete assignments" ON public.assignments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.classes WHERE id = assignments.class_id AND owner_id = auth.uid()
  ));

-- Class Members Table RLS
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view members of their own classes" ON public.class_members;
CREATE POLICY "Users can view members of their own classes" ON public.class_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.class_members cm
    WHERE cm.class_id = class_members.class_id AND cm.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Class owners can manage members" ON public.class_members;
CREATE POLICY "Class owners can manage members" ON public.class_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = class_members.class_id AND c.owner_id = auth.uid()
  ));
DROP POLICY IF EXISTS "Students can join a class" ON public.class_members;
CREATE POLICY "Students can join a class" ON public.class_members FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Students can leave a class" ON public.class_members;
CREATE POLICY "Students can leave a class" ON public.class_members FOR DELETE
  USING (user_id = auth.uid());
