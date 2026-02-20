-- Subscription System Migration
-- Adds subscription tiers and limits to profiles

-- Add subscription columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'student' CHECK (subscription_type IN ('student', 'teacher')),
ADD COLUMN IF NOT EXISTS quiz_usage_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quiz_usage_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS classes_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_code_used TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_type ON public.profiles(subscription_type);

-- Function to reset daily quiz usage
CREATE OR REPLACE FUNCTION public.reset_daily_quiz_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET quiz_usage_today = 0, 
      quiz_usage_date = CURRENT_DATE
  WHERE quiz_usage_date != CURRENT_DATE;
END;
$$;

-- Function to check and increment quiz usage
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
  -- Reset if new day
  SELECT subscription_tier, subscription_type, quiz_usage_today, quiz_usage_date
  INTO v_tier, v_type, v_usage, v_date
  FROM public.profiles WHERE id = p_user_id;
  
  IF v_date != CURRENT_DATE THEN
    v_usage := 0;
  END IF;
  
  -- Determine max based on tier and type
  IF v_type = 'student' THEN
    CASE v_tier
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

-- Function to increment quiz usage
CREATE OR REPLACE FUNCTION public.increment_quiz_usage(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date DATE;
BEGIN
  SELECT quiz_usage_date INTO v_date FROM public.profiles WHERE id = p_user_id;
  
  IF v_date != CURRENT_DATE THEN
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

-- Function to check class limit for teachers
CREATE OR REPLACE FUNCTION public.check_class_limit(p_user_id UUID)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, max_count INTEGER, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
  v_count INTEGER;
  v_max INTEGER;
BEGIN
  SELECT subscription_tier, classes_created
  INTO v_tier, v_count
  FROM public.profiles WHERE id = p_user_id;
  
  IF v_tier = 'free' THEN
    v_max := 0; -- Free can't create classes
  ELSIF v_tier = 'premium' THEN
    v_max := 5;
  ELSIF v_tier = 'pro' THEN
    v_max := 20;
  ELSE
    v_max := 0;
  END IF;
  
  RETURN QUERY SELECT 
    v_count < v_max,
    v_count,
    v_max,
    GREATEST(v_max - v_count, 0);
END;
$$;

-- Function to increment class count
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

-- Function to increment classes_created (alternative name for compatibility)
CREATE OR REPLACE FUNCTION public.increment_classes_created(p_user_id UUID)
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

-- Function to apply subscription code
CREATE OR REPLACE FUNCTION public.apply_subscription_code(p_user_id UUID, p_code TEXT, p_requested_tier TEXT, p_requested_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_hash TEXT;
BEGIN
  -- Hash the code for security (simple hash for now)
  v_code_hash := md5(p_code);
  
  -- Verify code (hardcoded for beta - in production this would be in a codes table)
  -- Code: zo01e = premium teacher
  -- Code: zo01p = pro teacher
  -- Code: zo01s = premium student
  -- Code: zo01sp = pro student
  
  IF v_code_hash = 'd8e8fca2dc0f896fd7cb4cb0031ba249' THEN  -- md5 of 'zo01e'
    UPDATE public.profiles 
    SET subscription_tier = p_requested_tier,
        subscription_type = p_requested_type,
        subscription_code_used = p_code
    WHERE id = p_user_id;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.reset_daily_quiz_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_quiz_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_quiz_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_class_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_class_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_classes_created(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_code(UUID, TEXT, TEXT, TEXT) TO authenticated;
