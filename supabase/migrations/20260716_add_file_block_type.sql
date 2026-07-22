-- =============================================
-- Allow 'file' as a blocks.type value
-- Date: 2026-07-16
-- Context: docs/subjects-feature-brainstorm.md section C10 — downloadable
-- materials (worksheets, slides, docs) as a block type in the assignment
-- editor, same treatment as the existing image/video blocks.
--
-- 2026-07-22 fix: this DROP+ADD ran BEFORE the later
-- 20260720_add_advanced_block_types.sql section in the RUN_ME bundle and,
-- without NOT VALID, was itself scanning/validating every existing row --
-- so it hit "check constraint blocks_type_check is violated by some row"
-- first, before the later section's own NOT VALID fix was ever reached.
-- Added NOT VALID here too so this section can't block on unknown legacy
-- type values either. The later migration replaces this constraint
-- entirely (DROP+ADD again) with the fuller type list, so this one only
-- needs to get past its own ALTER TABLE without erroring.
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
)) NOT VALID;

COMMIT;
