-- Re-hardens critical table RLS after legacy debug migration(s).
-- Safe to run multiple times.

ALTER TABLE IF EXISTS public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE 'RLS hardening applied for class_members/classes/subjects/assignments';
END;
$$;
