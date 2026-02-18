-- Migration: Class Invite System
-- Date: 2025-02-19
-- Description: Adds teacher_join_code to classes and ensures join_code exists

-- 1. Add teacher_join_code column if not exists
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS teacher_join_code text UNIQUE;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_classes_teacher_join_code ON public.classes(teacher_join_code);

-- 3. Create function to generate unique teacher join codes
CREATE OR REPLACE FUNCTION public.generate_teacher_join_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  -- Generate code with T- prefix
  new_code := 'T-' || upper(substring(md5(random()::text) from 1 for 6));
  
  -- Check if code already exists
  SELECT EXISTS(SELECT 1 FROM public.classes WHERE teacher_join_code = new_code) INTO code_exists;
  
  -- Loop until we find a unique code
  WHILE code_exists LOOP
    new_code := 'T-' || upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.classes WHERE teacher_join_code = new_code) INTO code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- 4. Generate teacher_join_code for existing classes that don't have one
UPDATE public.classes
SET teacher_join_code = public.generate_teacher_join_code()
WHERE teacher_join_code IS NULL;

-- 5. Ensure generate_join_code function exists (for student codes)
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  -- Generate code without prefix
  new_code := upper(substring(md5(random()::text) from 1 for 6));
  
  -- Check if code already exists
  SELECT EXISTS(SELECT 1 FROM public.classes WHERE join_code = new_code) INTO code_exists;
  
  -- Loop until we find a unique code
  WHILE code_exists LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.classes WHERE join_code = new_code) INTO code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- 6. Generate join_code for existing classes that don't have one
UPDATE public.classes
SET join_code = public.generate_join_code()
WHERE join_code IS NULL;

-- 7. Add RLS policy for class_members insert (teachers can invite)
DROP POLICY IF EXISTS "class_members_insert_teachers" ON public.class_members;
CREATE POLICY "class_members_insert_teachers" ON public.class_members
FOR INSERT
WITH CHECK (
  -- Students can join themselves
  auth.uid() = user_id
  OR
  -- Owners can add anyone
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND c.owner_id = auth.uid()
  )
  OR
  -- Teachers can add students
  EXISTS (
    SELECT 1 FROM public.class_members cm
    WHERE cm.class_id = class_id AND cm.user_id = auth.uid() AND cm.role = 'teacher'
  )
);

-- 8. Verify setup
SELECT 
  'Classes with join_code: ' || COUNT(*) as join_code_status,
  'Classes with teacher_join_code: ' || COUNT(*) as teacher_join_code_status
FROM public.classes
WHERE join_code IS NOT NULL;

-- Show migration complete
SELECT 'Migration 20250219_class_invite_system completed successfully' as status;
