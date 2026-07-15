-- =============================================
-- Subjects: archiving, folders, and paragraph prerequisites
-- Date: 2026-07-17
-- Context: docs/subjects-feature-brainstorm.md section B8/B9, D15
-- =============================================

BEGIN;

-- B8: archive a subject (finished course/school year) instead of it
-- cluttering the list forever.
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- B9: group subjects into folders (per school year / subject group etc.)
CREATE TABLE IF NOT EXISTS public.subject_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subject_folders_name_len_chk CHECK (char_length(btrim(name)) BETWEEN 1 AND 80)
);

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.subject_folders(id) ON DELETE SET NULL;

ALTER TABLE public.subject_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_folders_select" ON public.subject_folders;
DROP POLICY IF EXISTS "subject_folders_insert" ON public.subject_folders;
DROP POLICY IF EXISTS "subject_folders_update" ON public.subject_folders;
DROP POLICY IF EXISTS "subject_folders_delete" ON public.subject_folders;

-- Folders are a personal teacher-organization tool — scoped to their own.
CREATE POLICY "subject_folders_select" ON public.subject_folders
  FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "subject_folders_insert" ON public.subject_folders
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "subject_folders_update" ON public.subject_folders
  FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "subject_folders_delete" ON public.subject_folders
  FOR DELETE USING (created_by = auth.uid());

-- D15: a paragraph can require another paragraph to be finished first.
ALTER TABLE public.paragraphs
  ADD COLUMN IF NOT EXISTS prerequisite_paragraph_id uuid REFERENCES public.paragraphs(id) ON DELETE SET NULL;

COMMIT;
