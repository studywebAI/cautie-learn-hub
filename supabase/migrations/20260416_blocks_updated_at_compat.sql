-- 20260416_blocks_updated_at_compat.sql
-- Compatibility patch: some environments have a blocks update trigger that sets NEW.updated_at
-- while the column is missing, causing all block updates to fail.

BEGIN;

ALTER TABLE IF EXISTS public.blocks
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.blocks
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

COMMIT;
