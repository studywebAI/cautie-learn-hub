-- Integration foundation (run in Supabase SQL editor on production project)
-- Includes Microsoft account links + provider/app source storage

create table if not exists public.external_account_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('microsoft')),
  provider_account_id text null,
  account_email text null,
  scope text null,
  access_token_encrypted text not null,
  refresh_token_encrypted text null,
  expires_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists idx_external_account_connections_user_provider
on public.external_account_connections(user_id, provider);

alter table public.external_account_connections enable row level security;

drop policy if exists "external_account_connections_owner_all" on public.external_account_connections;
create policy "external_account_connections_owner_all"
on public.external_account_connections
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.external_integration_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  app text not null,
  provider_item_id text not null,
  name text not null,
  mime_type text null,
  web_url text null,
  extracted_text text null,
  extraction_status text not null default 'pending',
  is_selected boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, app, provider_item_id)
);

create index if not exists idx_external_integration_sources_user
on public.external_integration_sources(user_id);

create index if not exists idx_external_integration_sources_selected
on public.external_integration_sources(user_id, provider, app, is_selected);

alter table public.external_integration_sources enable row level security;

drop policy if exists "external_integration_sources_owner_all" on public.external_integration_sources;
create policy "external_integration_sources_owner_all"
on public.external_integration_sources
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.tool_run_sources (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.tool_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  app text not null,
  source_item_id text not null,
  source_name text not null,
  source_uri text null,
  source_kind text null,
  extraction_status text not null default 'unknown',
  content_fingerprint text null,
  source_preview text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tool_run_sources_run on public.tool_run_sources(run_id);
create index if not exists idx_tool_run_sources_user on public.tool_run_sources(user_id);

alter table public.tool_run_sources enable row level security;

drop policy if exists "tool_run_sources_owner_read" on public.tool_run_sources;
create policy "tool_run_sources_owner_read"
on public.tool_run_sources
for select
using (user_id = auth.uid());
