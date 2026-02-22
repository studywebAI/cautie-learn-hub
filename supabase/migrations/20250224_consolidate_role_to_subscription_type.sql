-- Consolidate role to single system: use subscription_type as the only source of truth
-- Remove the old role column and update all code to use subscription_type

-- Step 1: Migrate existing role data to subscription_type (if subscription_type is still default)
UPDATE public.profiles 
SET subscription_type = role 
WHERE subscription_type = 'student' AND role = 'teacher';

-- Step 2: Drop the old role column (it's no longer needed)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Step 3: Make sure subscription_type has a proper default
ALTER TABLE public.profiles 
ALTER COLUMN subscription_type SET DEFAULT 'student';

-- Step 4: Update trigger to set subscription_type instead of role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, subscription_type, subscription_tier, theme, language, high_contrast, dyslexia_font, reduced_motion)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'student', 'free', 'light', 'en', false, false, false);
  return new;
END;
$$;
