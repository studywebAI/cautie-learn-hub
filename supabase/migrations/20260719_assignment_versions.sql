-- =============================================
-- Assignment version history ("Doc history")
-- Date: 2026-07-19
-- Context: docs/mockups/editor-redesign.html -- confirmed to build, not
-- deferred. No version/snapshot infrastructure existed for assignments
-- before this (confirmed via repo-wide search).
-- =============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.assignment_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  blocks_snapshot jsonb NOT NULL,
  settings_snapshot jsonb,
  title_snapshot text,
  description_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.assignment_versions ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.assignment_versions ADD COLUMN IF NOT EXISTS assignment_id uuid;
ALTER TABLE public.assignment_versions ADD COLUMN IF NOT EXISTS blocks_snapshot jsonb;
ALTER TABLE public.assignment_versions ADD COLUMN IF NOT EXISTS settings_snapshot jsonb;
ALTER TABLE public.assignment_versions ADD COLUMN IF NOT EXISTS title_snapshot text;
ALTER TABLE public.assignment_versions ADD COLUMN IF NOT EXISTS description_snapshot text;
ALTER TABLE public.assignment_versions ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.assignment_versions ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_assignment_versions_assignment_id_created_at
  ON public.assignment_versions(assignment_id, created_at DESC);

ALTER TABLE public.assignment_versions ENABLE ROW LEVEL SECURITY;

-- Matches the app-layer-enforced pattern the blocks table already uses:
-- RLS just requires an authenticated session, actual teacher/ownership
-- checks happen in the API routes (consistent with how blocks/[blockId]
-- routes already work, not a new pattern introduced here).
DROP POLICY IF EXISTS "assignment_versions_authenticated_all" ON public.assignment_versions;
CREATE POLICY "assignment_versions_authenticated_all"
  ON public.assignment_versions
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;
