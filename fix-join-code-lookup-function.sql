-- Reliable join-code lookup that works even if classes SELECT policy only allows members.
-- Run in Supabase SQL Editor.
-- Safe to re-run.

BEGIN;

-- 1) Create or replace SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION public.get_class_by_join_code(p_code text)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  join_code text,
  teacher_join_code text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    c.join_code,
    c.teacher_join_code
  FROM public.classes c
  WHERE
    upper(coalesce(c.join_code, '')) = upper(trim(coalesce(p_code, '')))
    OR upper(coalesce(c.teacher_join_code, '')) = upper(trim(coalesce(p_code, '')))
  LIMIT 1;
$$;

-- 2) Lock down and grant execute only to authenticated users.
REVOKE ALL ON FUNCTION public.get_class_by_join_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_class_by_join_code(text) TO authenticated;

COMMIT;

-- Optional smoke test (replace with a real code):
-- SELECT * FROM public.get_class_by_join_code('F7XX9A');

