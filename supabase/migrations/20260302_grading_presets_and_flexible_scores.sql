-- =============================================
-- Grading Presets + Flexible Scores
-- Date: 2026-03-02
-- =============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.class_grading_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'freeform',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_grading_presets_name_len_chk CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT class_grading_presets_kind_chk CHECK (kind IN ('freeform', 'numeric_range', 'letter_scale'))
);

CREATE INDEX IF NOT EXISTS idx_class_grading_presets_class_id
  ON public.class_grading_presets(class_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_grading_presets_default_per_class
  ON public.class_grading_presets(class_id)
  WHERE is_default = true;

ALTER TABLE public.grade_sets
  ADD COLUMN IF NOT EXISTS grading_preset_id uuid REFERENCES public.class_grading_presets(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_class_grading_preset_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_grading_preset_updated_at ON public.class_grading_presets;
CREATE TRIGGER trg_class_grading_preset_updated_at
BEFORE UPDATE ON public.class_grading_presets
FOR EACH ROW
EXECUTE FUNCTION public.set_class_grading_preset_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_single_default_grading_preset()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.class_grading_presets
    SET is_default = false
    WHERE class_id = NEW.class_id
      AND id <> NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_default_grading_preset ON public.class_grading_presets;
CREATE TRIGGER trg_single_default_grading_preset
BEFORE INSERT OR UPDATE ON public.class_grading_presets
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_grading_preset();

ALTER TABLE public.class_grading_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_grading_presets_select" ON public.class_grading_presets;
DROP POLICY IF EXISTS "class_grading_presets_insert" ON public.class_grading_presets;
DROP POLICY IF EXISTS "class_grading_presets_update" ON public.class_grading_presets;
DROP POLICY IF EXISTS "class_grading_presets_delete" ON public.class_grading_presets;

CREATE POLICY "class_grading_presets_select"
ON public.class_grading_presets
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.class_members cm
    WHERE cm.class_id = class_grading_presets.class_id
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "class_grading_presets_insert"
ON public.class_grading_presets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.class_id = class_grading_presets.class_id
      AND cm.user_id = auth.uid()
      AND p.subscription_type = 'teacher'
  )
);

CREATE POLICY "class_grading_presets_update"
ON public.class_grading_presets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.class_id = class_grading_presets.class_id
      AND cm.user_id = auth.uid()
      AND p.subscription_type = 'teacher'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.class_id = class_grading_presets.class_id
      AND cm.user_id = auth.uid()
      AND p.subscription_type = 'teacher'
  )
);

CREATE POLICY "class_grading_presets_delete"
ON public.class_grading_presets
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.class_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.class_id = class_grading_presets.class_id
      AND cm.user_id = auth.uid()
      AND p.subscription_type = 'teacher'
  )
);

COMMIT;

