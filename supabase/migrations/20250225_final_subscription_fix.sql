-- Final Subscription System Fix
-- Consolidates role -> subscription_type completely
-- This migration should be run ONCE to fix all issues

BEGIN;

-- Step 1: Ensure subscription columns exist with proper defaults
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'student' CHECK (subscription_type IN ('student', 'teacher')),
ADD COLUMN IF NOT EXISTS quiz_usage_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quiz_usage_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS classes_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_code_used TEXT;

-- Step 2: Migrate existing role data to subscription_type if needed
-- Only update if subscription_type is still default 'student' and role exists
UPDATE public.profiles 
SET subscription_type = role 
WHERE subscription_type = 'student' 
AND EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'profiles' 
  AND column_name = 'role'
  AND role = 'teacher'
);

-- Step 3: Drop the old role column if it exists (cleanup)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN role;
  END IF;
END
$$;

-- Step 4: Update the trigger to use subscription_type (not role)
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

-- Step 5: Create indexes for performance (if not exist)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_type ON public.profiles(subscription_type);

-- Step 6: Create helper function to get user role (for easy access)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_type TEXT;
  v_tier TEXT;
BEGIN
  SELECT subscription_type, subscription_tier INTO v_type, v_tier
  FROM public.profiles WHERE id = user_id;
  
  RETURN COALESCE(v_type, 'student');
END;
$$;

-- Step 7: Create function to check quiz limits (centralized)
CREATE OR REPLACE FUNCTION public.check_quiz_limit(p_user_id UUID)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, max_count INTEGER, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
  v_type TEXT;
  v_usage INTEGER;
  v_date DATE;
  v_max INTEGER;
BEGIN
  -- Get current values
  SELECT subscription_tier, subscription_type, quiz_usage_today, quiz_usage_date
  INTO v_tier, v_type, v_usage, v_date
  FROM public.profiles WHERE id = p_user_id;
  
  -- Reset if new day
  IF v_date != CURRENT_DATE THEN
    v_usage := 0;
  END IF;
  
  -- Determine max based on tier and type
  IF COALESCE(v_type, 'student') = 'student' THEN
    CASE COALESCE(v_tier, 'free')
      WHEN 'free' THEN v_max := 5;
      WHEN 'premium' THEN v_max := 30;
      WHEN 'pro' THEN v_max := 999999;
      ELSE v_max := 5;
    END CASE;
  ELSE
    -- Teachers don't have quiz limits
    v_max := 999999;
  END IF;
  
  RETURN QUERY SELECT 
    v_usage < v_max,
    v_usage,
    v_max,
    GREATEST(v_max - v_usage, 0);
END;
$$;

-- Step 8: Create function to increment quiz usage
CREATE OR REPLACE FUNCTION public.increment_quiz_usage(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date DATE;
BEGIN
  SELECT quiz_usage_date INTO v_date FROM public.profiles WHERE id = p_user_id;
  
  IF v_date != CURRENT_DATE OR v_date IS NULL THEN
    UPDATE public.profiles 
    SET quiz_usage_today = 1, quiz_usage_date = CURRENT_DATE 
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles 
    SET quiz_usage_today = quiz_usage_today + 1 
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- Step 9: Create function to check class limits
CREATE OR REPLACE FUNCTION public.check_class_limit(p_user_id UUID)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, max_count INTEGER, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
  v_type TEXT;
  v_count INTEGER;
  v_max INTEGER;
BEGIN
  SELECT subscription_tier, subscription_type, classes_created
  INTO v_tier, v_type, v_count
  FROM public.profiles WHERE id = p_user_id;
  
  -- Only teachers can create classes
  IF COALESCE(v_type, 'student') != 'teacher' THEN
    RETURN QUERY SELECT false, v_count, 0, 0;
    RETURN;
  END IF;
  
  CASE COALESCE(v_tier, 'free')
    WHEN 'free' THEN v_max := 0;
    WHEN 'premium' THEN v_max := 5;
    WHEN 'pro' THEN v_max := 20;
    ELSE v_max := 0;
  END CASE;
  
  RETURN QUERY SELECT 
    v_count < v_max,
    v_count,
    v_max,
    GREATEST(v_max - v_count, 0);
END;
$$;

-- Step 10: Create function to increment class count
CREATE OR REPLACE FUNCTION public.increment_class_count(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET classes_created = classes_created + 1 
  WHERE id = p_user_id;
END;
$$;

-- Step 11: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_quiz_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_quiz_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_class_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_class_count(UUID) TO authenticated;

COMMIT;

-- Verify the fix
SELECT id, subscription_type, subscription_tier, quiz_usage_today, classes_created
FROM public.profiles 
LIMIT 10;
