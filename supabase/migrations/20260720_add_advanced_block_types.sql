-- =============================================
-- Allow the 5 new advanced block types as blocks.type values
-- Date: 2026-07-20
-- Context: assignment editor block-type expansion — flashcard, table,
-- number_line, diagram_labeling, graph_plot. Built across Phases 1-5,
-- this single migration unlocks all five so it only needs to run once.
--
-- 2026-07-22 fix: also add 'numeric_question' -- it's a real, long-used
-- block type (grading logic, submission route, StudentBlockRenderer,
-- validation schemas all handle it) that was simply never added to this
-- constraint in any prior migration. Production already has rows with
-- this type, so re-running the DROP+ADD below without it fails with
-- "check constraint blocks_type_check is violated by some row" the moment
-- this migration actually runs against real data.
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
  'quote', 'layout', 'complex', 'numeric_question',
  'flashcard', 'table', 'number_line', 'diagram_labeling', 'graph_plot'
));

COMMIT;
