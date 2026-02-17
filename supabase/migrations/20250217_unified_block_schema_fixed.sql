-- Unified Block Schema Migration
-- Standardize on AssignmentEditor's schema with snake_case types and proper fields

-- ============================================
-- 1. ADD MISSING COLUMNS TO blocks TABLE
-- ============================================
ALTER TABLE public.blocks 
ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_feedback boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_grading_override jsonb;

-- ============================================
-- 2. ENSURE type COLUMN USES snake_case VALUES
-- ============================================
-- First, convert any PascalCase types to snake_case
UPDATE public.blocks 
SET type = 
  CASE type
    WHEN 'TextBlock' THEN 'text'
    WHEN 'ImageBlock' THEN 'image'
    WHEN 'VideoBlock' THEN 'video'
    WHEN 'MultipleChoiceBlock' THEN 'multiple_choice'
    WHEN 'OpenQuestionBlock' THEN 'open_question'
    WHEN 'FillInBlankBlock' THEN 'fill_in_blank'
    WHEN 'DragDropBlock' THEN 'drag_drop'
    WHEN 'OrderingBlock' THEN 'ordering'
    WHEN 'MediaEmbedBlock' THEN 'media_embed'
    WHEN 'DividerBlock' THEN 'divider'
    WHEN 'RichTextBlock' THEN 'rich_text'
    WHEN 'ExecutableCodeBlock' THEN 'executable_code'
    WHEN 'CodeBlock' THEN 'code'
    WHEN 'ListBlock' THEN 'list'
    WHEN 'QuoteBlock' THEN 'quote'
    WHEN 'LayoutBlock' THEN 'layout'
    WHEN 'ComplexBlock' THEN 'complex'
    ELSE type
  END
WHERE type IN (
  'TextBlock', 'ImageBlock', 'VideoBlock', 'MultipleChoiceBlock', 
  'OpenQuestionBlock', 'FillInBlankBlock', 'DragDropBlock', 
  'OrderingBlock', 'MediaEmbedBlock', 'DividerBlock', 'RichTextBlock',
  'ExecutableCodeBlock', 'CodeBlock', 'ListBlock', 'QuoteBlock',
  'LayoutBlock', 'ComplexBlock'
);

-- ============================================
-- 3. ADD CHECK CONSTRAINT FOR VALID BLOCK TYPES
-- ============================================
ALTER TABLE public.blocks 
DROP CONSTRAINT IF EXISTS blocks_type_check;

ALTER TABLE public.blocks 
ADD CONSTRAINT blocks_type_check 
CHECK (type IN (
  'text', 'image', 'video', 'multiple_choice', 'open_question',
  'fill_in_blank', 'drag_drop', 'ordering', 'media_embed',
  'divider', 'rich_text', 'executable_code', 'code', 'list',
  'quote', 'layout', 'complex'
));

-- ============================================
-- 4. ENSURE position FIELD IS USED CONSISTENTLY
-- ============================================
-- If order_index exists, copy its values to position and drop it
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'order_index') THEN
    -- Copy order_index to position where position is NULL
    UPDATE public.blocks 
    SET position = order_index 
    WHERE position IS NULL AND order_index IS NOT NULL;
    
    -- Drop the order_index column
    ALTER TABLE public.blocks DROP COLUMN order_index;
  END IF;
END $$;

-- ============================================
-- 5. ADD UNIQUE CONSTRAINT ON (assignment_id, position)
-- ============================================
-- First, ensure all blocks have a position (set default if NULL)
UPDATE public.blocks
SET position = 0
WHERE position IS NULL;

-- Fix duplicate positions by renumbering sequentially within each assignment
-- This creates a unique position for every block within the same assignment
WITH numbered_blocks AS (
  SELECT
    id,
    assignment_id,
    position,
    ROW_NUMBER() OVER (PARTITION BY assignment_id ORDER BY created_at, id) as row_num
  FROM public.blocks
  WHERE assignment_id IS NOT NULL
)
UPDATE public.blocks b
SET position = nb.row_num - 1
FROM numbered_blocks nb
WHERE b.id = nb.id
  AND EXISTS (
    SELECT 1 FROM public.blocks b2
    WHERE b2.assignment_id = b.assignment_id
      AND b2.position = b.position
      AND b2.id <> b.id
  );

-- Now add the unique constraint
ALTER TABLE public.blocks
DROP CONSTRAINT IF EXISTS blocks_assignment_id_position_key;

ALTER TABLE public.blocks
ADD CONSTRAINT blocks_assignment_id_position_key
UNIQUE (assignment_id, position);

-- ============================================
-- 6. ADD INDEXES FOR BETTER PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_blocks_assignment_id ON public.blocks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_blocks_paragraph_id ON public.blocks(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_blocks_type ON public.blocks(type);
CREATE INDEX IF NOT EXISTS idx_blocks_position ON public.blocks(position);

-- ============================================
-- 7. ENSURE RLS IS ENABLED (if not already)
-- ============================================
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. UPDATE RLS POLICIES TO HANDLE NEW COLUMNS
-- ============================================
-- Policies should already exist, but ensure they're correct
-- The existing policies in the main schema should work fine

-- ============================================
-- 9. CREATE TRIGGER FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_blocks_updated_at ON public.blocks;
CREATE TRIGGER handle_blocks_updated_at
  BEFORE UPDATE ON public.blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();