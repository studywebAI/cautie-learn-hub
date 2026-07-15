-- =============================================
-- Allow 'file' as a blocks.type value
-- Date: 2026-07-16
-- Context: docs/subjects-feature-brainstorm.md section C10 — downloadable
-- materials (worksheets, slides, docs) as a block type in the assignment
-- editor, same treatment as the existing image/video blocks.
-- =============================================

BEGIN;

ALTER TABLE public.blocks
DROP CONSTRAINT IF EXISTS blocks_type_check;

ALTER TABLE public.blocks
ADD CONSTRAINT blocks_type_check
CHECK (type IN (
  'text', 'image', 'video', 'file', 'multiple_choice', 'open_question',
  'fill_in_blank', 'drag_drop', 'matching', 'ordering', 'media_embed',
  'divider', 'rich_text', 'executable_code', 'code', 'list',
  'quote', 'layout', 'complex'
));

COMMIT;
