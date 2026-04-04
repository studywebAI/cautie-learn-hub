-- Integration dedupe + materials hardening
-- Safe to run multiple times.

-- 1) External integration sources: add fields that support stronger dedupe and observability.
ALTER TABLE IF EXISTS public.external_integration_sources
  ADD COLUMN IF NOT EXISTS content_hash text;

ALTER TABLE IF EXISTS public.external_integration_sources
  ADD COLUMN IF NOT EXISTS content_size_bytes bigint;

ALTER TABLE IF EXISTS public.external_integration_sources
  ADD COLUMN IF NOT EXISTS source_kind text;

ALTER TABLE IF EXISTS public.external_integration_sources
  ADD COLUMN IF NOT EXISTS first_ingested_at timestamptz;

ALTER TABLE IF EXISTS public.external_integration_sources
  ADD COLUMN IF NOT EXISTS last_ingested_at timestamptz;

DO $$
BEGIN
  IF to_regclass('public.external_integration_sources') IS NOT NULL THEN
    UPDATE public.external_integration_sources
    SET
      first_ingested_at = COALESCE(first_ingested_at, created_at, now()),
      last_ingested_at = COALESCE(last_ingested_at, updated_at, created_at, now())
    WHERE first_ingested_at IS NULL
       OR last_ingested_at IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.external_integration_sources') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_external_integration_sources_user_provider_item
      ON public.external_integration_sources(user_id, provider, app, provider_item_id);

    CREATE INDEX IF NOT EXISTS idx_external_integration_sources_ready_lookup
      ON public.external_integration_sources(user_id, provider, app, extraction_status, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_external_integration_sources_content_hash
      ON public.external_integration_sources(user_id, provider, app, content_hash)
      WHERE content_hash IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_external_integration_sources_selected_updated
      ON public.external_integration_sources(user_id, is_selected, updated_at DESC);
  END IF;
END $$;

-- 2) Ingestion jobs: optimize runnable-job scans and user/provider scoped polling.
DO $$
BEGIN
  IF to_regclass('public.external_integration_ingestion_jobs') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_external_integration_ingestion_jobs_runnable
      ON public.external_integration_ingestion_jobs(status, next_attempt_at, updated_at);

    CREATE INDEX IF NOT EXISTS idx_external_integration_ingestion_jobs_user_runnable
      ON public.external_integration_ingestion_jobs(user_id, provider, app, status, next_attempt_at);
  END IF;
END $$;

-- 3) Materials: add server-side fields to support durable dedupe and richer source metadata.
ALTER TABLE IF EXISTS public.materials
  ADD COLUMN IF NOT EXISTS content_hash text;

ALTER TABLE IF EXISTS public.materials
  ADD COLUMN IF NOT EXISTS source_kind text;

ALTER TABLE IF EXISTS public.materials
  ADD COLUMN IF NOT EXISTS source_name text;

ALTER TABLE IF EXISTS public.materials
  ADD COLUMN IF NOT EXISTS mime_type text;

ALTER TABLE IF EXISTS public.materials
  ADD COLUMN IF NOT EXISTS preview_url text;

ALTER TABLE IF EXISTS public.materials
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

DO $$
BEGIN
  IF to_regclass('public.materials') IS NOT NULL THEN
    UPDATE public.materials
    SET last_used_at = COALESCE(last_used_at, updated_at, created_at, now())
    WHERE last_used_at IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.materials') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_materials_user_content_hash
      ON public.materials(user_id, content_hash)
      WHERE content_hash IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_materials_user_source_kind_updated
      ON public.materials(user_id, source_kind, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_materials_class_updated
      ON public.materials(class_id, updated_at DESC);
  END IF;
END $$;
