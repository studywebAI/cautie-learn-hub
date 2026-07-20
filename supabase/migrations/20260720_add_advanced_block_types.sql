-- =============================================
-- Allow the 5 new advanced block types as blocks.type values
-- Date: 2026-07-20
-- Context: assignment editor block-type expansion — flashcard, table,
-- number_line, diagram_labeling, graph_plot. Built across Phases 1-5,
-- this single migration unlocks all five so it only needs to run once.
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
  'quote', 'layout', 'complex',
  'flashcard', 'table', 'number_line', 'diagram_labeling', 'graph_plot'
));

COMMIT;
