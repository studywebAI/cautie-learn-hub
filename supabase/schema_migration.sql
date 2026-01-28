-- MIGRATION: Add missing columns expected by the codebase
-- Run this AFTER setup_all.sql in Supabase SQL Editor

-- 1) Add missing columns to blocks table
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES materials(id) ON DELETE CASCADE;
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE;
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- 2) Add missing column to materials table
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS content_id uuid;

-- 3) Create notes table if code expects it
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notes_pkey PRIMARY KEY (id)
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_all" ON public.notes FOR ALL USING (auth.uid() IS NOT NULL);

-- 4) Create user_roles table for proper role management (security best practice)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles
CREATE POLICY "users_can_read_own_roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins_can_manage_roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5) Insert profile for existing user (the one getting PGRST116 error)
INSERT INTO public.profiles (id, role, theme, language, high_contrast, dyslexia_font, reduced_motion)
VALUES ('886eb76a-aeeb-4ddf-abca-d498d48535e2', 'student', 'pastel', 'en', false, false, false)
ON CONFLICT (id) DO NOTHING;

-- 6) Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_blocks_material_id ON public.blocks(material_id);
CREATE INDEX IF NOT EXISTS idx_blocks_chapter_id ON public.blocks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Force PostgREST to reload schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Done!
SELECT 'Migration complete - all missing columns added' as status;
