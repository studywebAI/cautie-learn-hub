
--
-- Clean slate
--

-- Drop existing policies, functions, and tables
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

DROP FUNCTION IF EXISTS public.handle_new_user;

-- Use CASCADE to remove dependent objects like policies that might exist
DROP TABLE IF EXISTS public.class_members CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;


--
-- Create Tables
--

-- Profiles Table: Stores public-facing user data
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    updated_at timestamp with time zone,
    full_name text,
    avatar_url text,
    role text DEFAULT 'student'::text
);
ALTER TABLE public.profiles OWNER TO postgres;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Classes Table: Stores class information
CREATE TABLE public.classes (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    description text,
    owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE
);
ALTER TABLE public.classes OWNER TO postgres;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Assignments Table: Stores assignments for classes
CREATE TABLE public.assignments (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    due_date timestamp with time zone,
    content json,
    class_id uuid NOT NULL REFERENCES public.classes ON DELETE CASCADE
);
ALTER TABLE public.assignments OWNER TO postgres;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;


-- Class Members Table: Junction table for users and classes
CREATE TABLE public.class_members (
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    role text NOT NULL DEFAULT 'student'::text,
    PRIMARY KEY (user_id, class_id)
);
ALTER TABLE public.class_members OWNER TO postgres;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;


--
-- Create Functions and Triggers
--

-- Function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'student');
  
  -- Also insert the class owner as a member of their own class upon creation
  -- Note: this part is handled in application logic, but a DB trigger could be an alternative
  
  return new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Set up Row Level Security (RLS)
--

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
);
CREATE POLICY "Users can insert their own classes." ON public.classes FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own classes." ON public.classes FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own classes." ON public.classes FOR DELETE USING (auth.uid() = owner_id);


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
        )
    )
);
CREATE POLICY "Class owners can create assignments." ON public.assignments FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND classes.owner_id = auth.uid()
    )
);
CREATE POLICY "Class owners can update assignments." ON public.assignments FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND classes.owner_id = auth.uid()
    )
);
CREATE POLICY "Class owners can delete assignments." ON public.assignments FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND classes.owner_id = auth.uid()
    )
);


-- Class Members RLS
CREATE POLICY "Class members can view other members of the same class." ON public.class_members FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM class_members AS cm 
        WHERE cm.user_id = auth.uid() AND cm.class_id = class_members.class_id
    )
);

CREATE POLICY "Class owners can manage class members." ON public.class_members FOR ALL USING (
    EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = class_members.class_id AND classes.owner_id = auth.uid()
    )
);
CREATE POLICY "Users can join a class." ON public.class_members FOR INSERT WITH CHECK (
    -- A user can be added by a class owner (covered by previous policy) or can add themselves.
    class_members.user_id = auth.uid()
);
CREATE POLICY "Students can leave classes." ON public.class_members FOR DELETE USING (
    user_id = auth.uid()
);
