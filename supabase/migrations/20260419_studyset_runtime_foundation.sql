-- Studyset runtime foundation migration
-- Idempotent: safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.ai_error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid null references public.tool_runs(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  flow_name text not null,
  provider_preference text not null check (provider_preference in ('auto', 'gemini', 'openai')),
  provider_attempted text not null check (provider_attempted in ('gemini', 'openai')),
  stage text not null check (stage in ('primary_error', 'fallback_error', 'run_failed')),
  fallback_attempted boolean not null default false,
  fallback_succeeded boolean not null default false,
  error_code text null,
  error_message text not null,
  fingerprint text not null
);

create index if not exists ai_error_logs_created_at_idx on public.ai_error_logs (created_at desc);
create index if not exists ai_error_logs_user_created_idx on public.ai_error_logs (user_id, created_at desc);
create index if not exists ai_error_logs_fingerprint_idx on public.ai_error_logs (fingerprint);

create table if not exists public.external_account_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
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

create table if not exists public.external_integration_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_id uuid not null references public.external_integration_sources(id) on delete cascade,
  provider text not null,
  app text not null,
  status text not null default 'queued',
  attempts int not null default 0,
  max_attempts int not null default 5,
  next_attempt_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_external_integration_ingestion_jobs_user
on public.external_integration_ingestion_jobs(user_id, provider, app);

create index if not exists idx_external_integration_ingestion_jobs_status
on public.external_integration_ingestion_jobs(status, updated_at);

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

create table if not exists public.studyset_task_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  studyset_id uuid not null references public.studysets(id) on delete cascade,
  studyset_day_id uuid null references public.studyset_plan_days(id) on delete set null,
  studyset_task_id uuid null references public.studyset_plan_tasks(id) on delete set null,
  task_type text null,
  tool_id text not null,
  score integer not null default 0 check (score >= 0 and score <= 100),
  total_items integer not null default 0 check (total_items >= 0),
  correct_items integer not null default 0 check (correct_items >= 0),
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  weak_topics jsonb not null default '[]'::jsonb,
  notes text null,
  created_at timestamptz not null default now()
);

create table if not exists public.studyset_mastery_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  studyset_id uuid not null references public.studysets(id) on delete cascade,
  topic_key text not null,
  topic_label text not null,
  exposure_count integer not null default 0 check (exposure_count >= 0),
  weakness_score integer not null default 0 check (weakness_score >= 0),
  mastery_score integer not null default 0 check (mastery_score >= 0),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_studyset_mastery_topics_unique
on public.studyset_mastery_topics(user_id, studyset_id, topic_key);

create index if not exists idx_studyset_task_attempts_studyset_created
on public.studyset_task_attempts(user_id, studyset_id, created_at desc);

create index if not exists idx_studyset_task_attempts_task_created
on public.studyset_task_attempts(studyset_task_id, created_at desc);

create index if not exists idx_studyset_mastery_topics_studyset_weakness
on public.studyset_mastery_topics(user_id, studyset_id, weakness_score desc, updated_at desc);

alter table public.ai_error_logs enable row level security;
alter table public.external_account_connections enable row level security;
alter table public.external_integration_sources enable row level security;
alter table public.external_integration_ingestion_jobs enable row level security;
alter table public.tool_run_sources enable row level security;
alter table public.studyset_task_attempts enable row level security;
alter table public.studyset_mastery_topics enable row level security;

drop policy if exists "ai_error_logs_insert_own" on public.ai_error_logs;
create policy "ai_error_logs_insert_own"
on public.ai_error_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "ai_error_logs_select_own" on public.ai_error_logs;
create policy "ai_error_logs_select_own"
on public.ai_error_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "external_account_connections_owner_all" on public.external_account_connections;
create policy "external_account_connections_owner_all"
on public.external_account_connections
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "external_integration_sources_owner_all" on public.external_integration_sources;
create policy "external_integration_sources_owner_all"
on public.external_integration_sources
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "external_integration_ingestion_jobs_owner_all" on public.external_integration_ingestion_jobs;
create policy "external_integration_ingestion_jobs_owner_all"
on public.external_integration_ingestion_jobs
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "tool_run_sources_owner_read" on public.tool_run_sources;
create policy "tool_run_sources_owner_read"
on public.tool_run_sources
for select
using (user_id = auth.uid());

drop policy if exists "studyset_task_attempts_owner_all" on public.studyset_task_attempts;
create policy "studyset_task_attempts_owner_all"
on public.studyset_task_attempts
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "studyset_mastery_topics_owner_all" on public.studyset_mastery_topics;
create policy "studyset_mastery_topics_owner_all"
on public.studyset_mastery_topics
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
