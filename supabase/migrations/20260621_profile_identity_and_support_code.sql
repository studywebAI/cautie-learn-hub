-- Adds a per-user support-identification code and a global, teacher-lockable
-- display name, so support can look a user up by email in the Supabase table
-- editor and see a short code, and a teacher's rename of a student becomes a
-- single global override the student can no longer self-revert.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS support_code text,
  ADD COLUMN IF NOT EXISTS name_locked_by_teacher boolean NOT NULL DEFAULT false;

-- 6-character code, letters/numbers only, excluding 0 and O to avoid visual
-- confusion when read aloud or typed in by support.
CREATE OR REPLACE FUNCTION public.generate_support_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  candidate text;
BEGIN
  LOOP
    SELECT string_agg(substr(chars, (random() * length(chars))::int + 1, 1), '')
    INTO candidate
    FROM generate_series(1, 6);

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE support_code = candidate) THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

-- Backfill existing profiles one at a time so each gets a distinct code.
DO $$
DECLARE
  profile_id uuid;
BEGIN
  FOR profile_id IN SELECT id FROM public.profiles WHERE support_code IS NULL LOOP
    UPDATE public.profiles SET support_code = public.generate_support_code() WHERE id = profile_id;
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ALTER COLUMN support_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_support_code_unique'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_support_code_unique UNIQUE (support_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_support_code ON public.profiles(support_code);
CREATE INDEX IF NOT EXISTS idx_profiles_email_lookup ON public.profiles(email);

-- Generate the support code (and seed display_name from signup metadata)
-- for every newly created user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, display_name, avatar_url,
    subscription_type, subscription_tier, theme, language,
    high_contrast, dyslexia_font, reduced_motion, support_code
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'student', 'free', 'light', 'en',
    false, false, false,
    public.generate_support_code()
  );
  RETURN new;
END;
$$;

-- A teacher-driven rename (set via the admin/service-role client) locks the
-- name; once locked, the student can no longer change display_name on their
-- own profile row. auth.uid() is null under the service-role key, so the
-- teacher-rename endpoint is unaffected by this guard.
CREATE OR REPLACE FUNCTION public.enforce_display_name_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.name_locked_by_teacher
     AND auth.uid() = OLD.id
     AND NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    NEW.display_name := OLD.display_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_display_name_lock ON public.profiles;
CREATE TRIGGER trg_enforce_display_name_lock
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_display_name_lock();

COMMIT;
