-- =============================================
-- Blocks: attach a media block (image/video) to a question block
-- Date: 2026-07-19
-- Context: docs/mockups/editor-redesign.html -- linked media renders as a
-- banner inside its parent question's card instead of an independent
-- flat-list block. No parent/link relationship existed on blocks before this.
-- =============================================

BEGIN;

ALTER TABLE public.blocks
  ADD COLUMN IF NOT EXISTS attached_to_block_id uuid REFERENCES public.blocks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blocks_attached_to_block_id
  ON public.blocks(attached_to_block_id)
  WHERE attached_to_block_id IS NOT NULL;

COMMENT ON COLUMN public.blocks.attached_to_block_id IS
  'When set, this block (typically image/video) renders as a banner inside the question block it is attached to, instead of as an independent list item.';

COMMIT;
