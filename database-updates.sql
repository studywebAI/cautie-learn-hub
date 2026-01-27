-- Add user preferences and recents tables for the new features

-- User Preferences Table: Stores user settings and preferences
CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "language" text NOT NULL DEFAULT 'en',
    "theme" text NOT NULL DEFAULT 'system',
    "role" text NOT NULL DEFAULT 'student',
    "tier" text NOT NULL DEFAULT 'free',
    "onboarding_completed" boolean NOT NULL DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT "user_preferences_user_id_key" UNIQUE (user_id)
);
ALTER TABLE "public"."user_preferences" OWNER TO "postgres";

-- Recents Table: Stores user's recent activities
CREATE TABLE IF NOT EXISTS "public"."recents" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "type" text NOT NULL,
    "title" text NOT NULL,
    "data" json,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "recents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);
ALTER TABLE "public"."recents" OWNER TO "postgres";

-- Enable RLS and create policies for user_preferences
ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual read access" ON "public"."user_preferences" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow individual insert access" ON "public"."user_preferences" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow individual update access" ON "public"."user_preferences" FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS and create policies for recents
ALTER TABLE "public"."recents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual read access" ON "public"."recents" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow individual insert access" ON "public"."recents" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow individual update access" ON "public"."recents" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow individual delete access" ON "public"."recents" FOR DELETE USING (auth.uid() = user_id);

-- Function to create user preferences when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, language, theme, role, tier, onboarding_completed)
  VALUES (new.id, 'en', 'system', 'student', 'free', false);
  return new;
END;
$$;

-- Trigger to call handle_new_user_preferences on new user creation
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_preferences();