alter table if exists public.presentation_projects
  add column if not exists workflow_state jsonb not null default '{}'::jsonb;

