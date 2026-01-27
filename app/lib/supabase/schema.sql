--
-- RLS / AUTH POLICIES
--
-- Drop policies first to avoid dependency issues when dropping tables
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."assignments";
DROP POLICY IF EXISTS "Allow authenticated read" ON "public"."assignments";
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON "public"."assignments";
DROP POLICY IF EXISTS "Allow authenticated update for owners" ON "public"."assignments";

DROP POLICY IF EXISTS "Allow authenticated read" ON "public"."class_members";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."class_members";
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON "public"."class_members";

DROP POLICY IF EXISTS "Allow authenticated read" ON "public"."classes";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."classes";
DROP POLICY IF EXISTS "Allow authenticated update for owners" ON "public"."classes";
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON "public"."classes";

DROP POLICY IF EXISTS "Allow individual read access" ON "public"."profiles";
DROP POLICY IF EXISTS "Allow individual insert access" ON "public"."profiles";
DROP POLICY IF EXISTS "Allow individual update access" ON "public"."profiles";

DROP POLICY IF EXISTS "Users can manage their own materials" ON "public"."materials";
DROP POLICY IF EXISTS "Users can view public materials" ON "public"."materials";
DROP POLICY IF EXISTS "Allow authenticated read" ON "public"."blocks";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "public"."blocks";
DROP POLICY IF EXISTS "Allow authenticated update for owners" ON "public"."blocks";
DROP POLICY IF EXISTS "Allow authenticated delete for owners" ON "public"."blocks";

-- Drop dependent functions and triggers before tables
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop tables using CASCADE to handle any remaining dependencies
DROP TABLE IF EXISTS "public"."assignments" CASCADE;
DROP TABLE IF EXISTS "public"."class_members" CASCADE;
DROP TABLE IF EXISTS "public"."classes" CASCADE;
DROP TABLE IF EXISTS "public"."profiles" CASCADE;
DROP TABLE IF EXISTS "public"."materials" CASCADE;
DROP TABLE IF EXISTS "public"."blocks" CASCADE;


--
-- CREATE TABLES
--

-- Profiles Table: Stores public-facing user data
CREATE TABLE "public"."profiles" (
    "id" uuid NOT NULL,
    "updated_at" timestamp with time zone,
    "full_name" text,
    "avatar_url" text,
    "email" text,
    "role" text DEFAULT 'student'::text,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";

-- Classes Table: Represents a class or course
CREATE TABLE "public"."classes" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "name" text NOT NULL,
    "description" text,
    "owner_id" uuid NOT NULL,
    "join_code" text UNIQUE,
    CONSTRAINT "classes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "classes_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users (id) ON DELETE CASCADE
);
ALTER TABLE "public"."classes" OWNER TO "postgres";

-- Assignments Table: Stores assignments for classes
CREATE TABLE "public"."assignments" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "class_id" uuid NOT NULL,
    "title" text NOT NULL,
    "content" json,
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "assignments_pkey" PRIMARY KEY (id),
    CONSTRAINT "assignments_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
);
ALTER TABLE "public"."assignments" OWNER TO "postgres";

-- Class Members Table: Junction table for students and classes
CREATE TABLE "public"."class_members" (
    "class_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" text NOT NULL DEFAULT 'student'::text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "class_members_pkey" PRIMARY KEY ("class_id", "user_id"),
    CONSTRAINT "class_members_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT "class_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);
ALTER TABLE "public"."class_members" OWNER TO "postgres";


--
-- FUNCTIONS & TRIGGERS
--

-- Function to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email, 'student');
  return new;
END;
$;

-- Trigger to call handle_new_user on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


--
-- ENABLE RLS and APPLY POLICIES
--

-- Profiles
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access for users and teachers" ON "public"."profiles" FOR SELECT USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM class_members cm
    INNER JOIN classes c ON cm.class_id = c.id
    WHERE cm.user_id = profiles.id
    AND (
      c.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM class_members cm2
        WHERE cm2.class_id = c.id AND cm2.user_id = auth.uid() AND (cm2.role = 'teacher' OR cm2.role = 'student')
      )
    )
  )
);
CREATE POLICY "Allow individual insert access" ON "public"."profiles" FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow individual update access" ON "public"."profiles" FOR UPDATE USING (auth.uid() = id);

-- Classes
ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read" ON "public"."classes" FOR SELECT USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.user_id = auth.uid()
  )
);
CREATE POLICY "Allow authenticated insert" ON "public"."classes" FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Allow authenticated update for owners" ON "public"."classes" FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Allow authenticated delete for owners" ON "public"."classes" FOR DELETE USING (auth.uid() = owner_id);

-- Assignments
ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read" ON "public"."assignments" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = assignments.class_id AND (
      classes.owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM class_members 
        WHERE class_members.class_id = assignments.class_id AND class_members.user_id = auth.uid()
      )
    )
  )
);
CREATE POLICY "Allow authenticated insert" ON "public"."assignments" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND classes.owner_id = auth.uid()
  )
);
CREATE POLICY "Allow authenticated update for owners" ON "public"."assignments" FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND classes.owner_id = auth.uid()
  )
);
CREATE POLICY "Allow authenticated delete for owners" ON "public"."assignments" FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = assignments.class_id AND classes.owner_id = auth.uid()
  )
);


-- Class Members
ALTER TABLE "public"."class_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read" ON "public"."class_members" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = class_members.class_id AND (
      classes.owner_id = auth.uid() OR
      class_members.user_id = auth.uid()
    )
  )
);
CREATE POLICY "Allow authenticated insert" ON "public"."class_members" FOR INSERT WITH CHECK (
  -- Students can join, or owners can add them
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = class_members.class_id
  ) AND (
    class_members.user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM classes WHERE classes.id = class_members.class_id AND classes.owner_id = auth.uid())
  )
);
CREATE POLICY "Allow authenticated delete for owners" ON "public"."class_members" FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = class_members.class_id AND classes.owner_id = auth.uid()
  )
);

-- Subjects Table: Stores subjects for classes
CREATE TABLE "public"."subjects" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "title" text NOT NULL,
    "class_id" uuid NOT NULL,
    "class_label" text,
    "cover_type" text,
    "cover_image_url" text,
    "ai_icon_seed" text,
    "user_id" uuid NOT NULL,
    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subjects_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE,
    CONSTRAINT "subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);
ALTER TABLE "public"."subjects" OWNER TO "postgres";

-- Subjects RLS policies
ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects_select_policy" ON subjects
    FOR SELECT USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM classes c
            JOIN class_members cm ON cm.class_id = c.id
            WHERE c.id = subjects.class_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "subjects_insert_policy" ON subjects
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_id
            AND (c.owner_id = auth.uid())
        )
    );

CREATE POLICY "subjects_update_policy" ON subjects
    FOR UPDATE USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_id
            AND c.owner_id = auth.uid()
        )
    );

CREATE POLICY "subjects_delete_policy" ON subjects
    FOR DELETE USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = class_id
            AND c.owner_id = auth.uid()
        )
    );
