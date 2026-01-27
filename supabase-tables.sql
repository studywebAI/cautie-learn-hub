-- TABLES SETUP - Run after dropping old tables

-- Profiles Table
CREATE TABLE "public"."profiles" (
    "id" uuid NOT NULL,
    "updated_at" timestamp with time zone,
    "full_name" text,
    "avatar_url" text,
    "role" text DEFAULT 'student'::text,
    "theme" text DEFAULT 'pastel'::text,
    "language" text DEFAULT 'en'::text,
    "high_contrast" boolean DEFAULT false,
    "dyslexia_font" boolean DEFAULT false,
    "reduced_motion" boolean DEFAULT false,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Classes Table
CREATE TABLE "public"."classes" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "name" text NOT NULL,
    "description" text,
    "owner_id" uuid,
    "user_id" uuid,
    "guest_id" text,
    "join_code" text UNIQUE,
    "owner_type" text DEFAULT 'user' CHECK (owner_type IN ('user', 'guest')),
    "status" text,
    CONSTRAINT "classes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "classes_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT "classes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Class Members Table
CREATE TABLE "public"."class_members" (
    "class_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" text NOT NULL DEFAULT 'student'::text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "class_members_pkey" PRIMARY KEY ("class_id", "user_id"),
    CONSTRAINT "class_members_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT "class_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Subjects Table
CREATE TABLE "public"."subjects" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "class_id" uuid NOT NULL,
    "title" text NOT NULL,
    "class_label" text,
    "cover_type" text DEFAULT 'ai_icons',
    "cover_image_url" text,
    "ai_icon_seed" text,
    "user_id" uuid,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subjects_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT "subjects_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- Assignments Table
CREATE TABLE "public"."assignments" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "class_id" uuid NOT NULL,
    "paragraph_id" uuid,
    "assignment_index" integer NOT NULL DEFAULT 0,
    "title" text NOT NULL,
    "content" json,
    "due_date" timestamp with time zone,
    "answers_enabled" boolean DEFAULT false,
    "owner_type" text DEFAULT 'user' CHECK (owner_type IN ('user', 'guest')),
    "guest_id" text,
    "user_id" uuid,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assignments_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT "assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- Create unique index for assignments
CREATE UNIQUE INDEX idx_assignments_unique ON public.assignments(
    COALESCE(paragraph_id::text, 'class-' || class_id::text),
    assignment_index
);