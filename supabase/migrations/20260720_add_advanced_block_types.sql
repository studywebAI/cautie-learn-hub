-- =============================================
-- Allow the 5 new advanced block types as blocks.type values
-- Date: 2026-07-20
-- Context: assignment editor block-type expansion — flashcard, table,
-- number_line, diagram_labeling, graph_plot. Built across Phases 1-5,
-- this single migration unlocks all five so it only needs to run once.
--
-- 2026-07-22 fix #1: added 'numeric_question' -- a real, long-used block
-- type that was never in this constraint. Turned out production still had
-- a row that violated it even with that added, i.e. there is at least one
-- more unknown legacy type value in the data that can't be enumerated
-- from here (no DB query access from this environment).
--
-- 2026-07-22 fix #2: switched to `NOT VALID`. This adds/enforces the
-- constraint for all NEW inserts and updates without requiring every
-- EXISTING row to already satisfy it -- Postgres skips the historical
-- table scan entirely, so unknown legacy junk in a handful of old rows
-- can no longer block this migration. Nothing is deleted or rewritten;
-- a legacy row with a bad type value simply keeps it, untouched, unless
-- someone later runs VALIDATE CONSTRAINT (not done here on purpose).
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
)) NOT VALID;

COMMIT;
