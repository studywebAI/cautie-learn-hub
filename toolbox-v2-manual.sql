-- Toolbox 2.0 Foundation (manual SQL)
-- Run this in Supabase SQL editor.

begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- Billing + Entitlements
-- =========================

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_key text not null default 'free',
  subscription_type text not null default 'student',
  collab_seats integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null,
  feature_key text not null,
  enabled boolean not null default false,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_key, feature_key)
);

create table if not exists public.meter_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  feature_key text not null,
  compute_class text not null default 'standard',
  quantity integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_meter_events_user_created_at on public.meter_events (user_id, created_at desc);
create index if not exists idx_meter_events_event_type_created_at on public.meter_events (event_type, created_at desc);
create index if not exists idx_meter_events_compute_class on public.meter_events (compute_class);

-- =========================
-- Tool Runs (v2 execution)
-- =========================

create table if not exists public.tool_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  flow_name text not null,
  mode text,
  status text not null default 'queued',
  compute_class text not null default 'standard',
  idempotency_key text not null,
  input_payload jsonb not null default '{}'::jsonb,
  context_payload jsonb not null default '{}'::jsonb,
  options_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  output_artifact_id uuid,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists idx_tool_runs_user_created_at on public.tool_runs (user_id, created_at desc);
create index if not exists idx_tool_runs_status on public.tool_runs (status);
create index if not exists idx_tool_runs_tool_id on public.tool_runs (tool_id);

create table if not exists public.tool_run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.tool_runs(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tool_run_events_run_id_created_at on public.tool_run_events (run_id, created_at asc);

-- =========================
-- Artifacts + Versioning
-- =========================

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  artifact_type text not null,
  title text not null,
  latest_version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_artifacts_user_updated_at on public.artifacts (user_id, updated_at desc);
create index if not exists idx_artifacts_tool_id on public.artifacts (tool_id);
create index if not exists idx_artifacts_type on public.artifacts (artifact_type);

create table if not exists public.artifact_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  version_number integer not null,
  content jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (artifact_id, version_number)
);

create index if not exists idx_artifact_versions_artifact_version on public.artifact_versions (artifact_id, version_number desc);

create table if not exists public.artifact_links (
  id uuid primary key default gen_random_uuid(),
  source_artifact_id uuid not null references public.artifacts(id) on delete cascade,
  target_artifact_id uuid not null references public.artifacts(id) on delete cascade,
  link_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_artifact_links_source on public.artifact_links (source_artifact_id);
create index if not exists idx_artifact_links_target on public.artifact_links (target_artifact_id);

alter table public.tool_runs
  drop constraint if exists tool_runs_output_artifact_id_fkey;

alter table public.tool_runs
  add constraint tool_runs_output_artifact_id_fkey
  foreign key (output_artifact_id) references public.artifacts(id) on delete set null;

-- =========================
-- Collaboration
-- =========================

create table if not exists public.collab_sessions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'comment',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_collab_sessions_artifact on public.collab_sessions (artifact_id);
create index if not exists idx_collab_sessions_owner on public.collab_sessions (owner_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  selection_path text,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comments_artifact_created_at on public.comments (artifact_id, created_at desc);
create index if not exists idx_comments_author on public.comments (author_id);

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  patch jsonb not null default '{}'::jsonb,
  note text,
  status text not null default 'pending',
  applied_by uuid references auth.users(id) on delete set null,
  applied_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_suggestions_artifact_status on public.suggestions (artifact_id, status);
create index if not exists idx_suggestions_author on public.suggestions (author_id);

-- =========================
-- Triggers
-- =========================

drop trigger if exists trg_entitlements_updated_at on public.entitlements;
create trigger trg_entitlements_updated_at
before update on public.entitlements
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_plan_features_updated_at on public.plan_features;
create trigger trg_plan_features_updated_at
before update on public.plan_features
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_tool_runs_updated_at on public.tool_runs;
create trigger trg_tool_runs_updated_at
before update on public.tool_runs
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_artifacts_updated_at on public.artifacts;
create trigger trg_artifacts_updated_at
before update on public.artifacts
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_collab_sessions_updated_at on public.collab_sessions;
create trigger trg_collab_sessions_updated_at
before update on public.collab_sessions
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at
before update on public.comments
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_suggestions_updated_at on public.suggestions;
create trigger trg_suggestions_updated_at
before update on public.suggestions
for each row execute procedure public.set_updated_at();

-- =========================
-- RLS
-- =========================

alter table public.entitlements enable row level security;
alter table public.plan_features enable row level security;
alter table public.meter_events enable row level security;
alter table public.tool_runs enable row level security;
alter table public.tool_run_events enable row level security;
alter table public.artifacts enable row level security;
alter table public.artifact_versions enable row level security;
alter table public.artifact_links enable row level security;
alter table public.collab_sessions enable row level security;
alter table public.comments enable row level security;
alter table public.suggestions enable row level security;

-- entitlements
drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
on public.entitlements for select
using (auth.uid() = user_id);

drop policy if exists "entitlements_insert_own" on public.entitlements;
create policy "entitlements_insert_own"
on public.entitlements for insert
with check (auth.uid() = user_id);

drop policy if exists "entitlements_update_own" on public.entitlements;
create policy "entitlements_update_own"
on public.entitlements for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- plan_features: read for authenticated users, write via service role only
drop policy if exists "plan_features_select_authenticated" on public.plan_features;
create policy "plan_features_select_authenticated"
on public.plan_features for select
using (auth.role() = 'authenticated');

-- meter_events
drop policy if exists "meter_events_select_own" on public.meter_events;
create policy "meter_events_select_own"
on public.meter_events for select
using (auth.uid() = user_id);

drop policy if exists "meter_events_insert_own" on public.meter_events;
create policy "meter_events_insert_own"
on public.meter_events for insert
with check (auth.uid() = user_id);

-- tool_runs
drop policy if exists "tool_runs_select_own" on public.tool_runs;
create policy "tool_runs_select_own"
on public.tool_runs for select
using (auth.uid() = user_id);

drop policy if exists "tool_runs_insert_own" on public.tool_runs;
create policy "tool_runs_insert_own"
on public.tool_runs for insert
with check (auth.uid() = user_id);

drop policy if exists "tool_runs_update_own" on public.tool_runs;
create policy "tool_runs_update_own"
on public.tool_runs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- tool_run_events
drop policy if exists "tool_run_events_select_owner" on public.tool_run_events;
create policy "tool_run_events_select_owner"
on public.tool_run_events for select
using (
  exists (
    select 1
    from public.tool_runs tr
    where tr.id = tool_run_events.run_id
      and tr.user_id = auth.uid()
  )
);

drop policy if exists "tool_run_events_insert_owner" on public.tool_run_events;
create policy "tool_run_events_insert_owner"
on public.tool_run_events for insert
with check (
  exists (
    select 1
    from public.tool_runs tr
    where tr.id = tool_run_events.run_id
      and tr.user_id = auth.uid()
  )
);

-- artifacts
drop policy if exists "artifacts_select_own" on public.artifacts;
create policy "artifacts_select_own"
on public.artifacts for select
using (auth.uid() = user_id);

drop policy if exists "artifacts_insert_own" on public.artifacts;
create policy "artifacts_insert_own"
on public.artifacts for insert
with check (auth.uid() = user_id);

drop policy if exists "artifacts_update_own" on public.artifacts;
create policy "artifacts_update_own"
on public.artifacts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "artifacts_delete_own" on public.artifacts;
create policy "artifacts_delete_own"
on public.artifacts for delete
using (auth.uid() = user_id);

-- artifact_versions
drop policy if exists "artifact_versions_select_owner" on public.artifact_versions;
create policy "artifact_versions_select_owner"
on public.artifact_versions for select
using (
  exists (
    select 1 from public.artifacts a
    where a.id = artifact_versions.artifact_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "artifact_versions_insert_owner" on public.artifact_versions;
create policy "artifact_versions_insert_owner"
on public.artifact_versions for insert
with check (
  exists (
    select 1 from public.artifacts a
    where a.id = artifact_versions.artifact_id
      and a.user_id = auth.uid()
  )
);

-- artifact_links
drop policy if exists "artifact_links_select_owner" on public.artifact_links;
create policy "artifact_links_select_owner"
on public.artifact_links for select
using (
  exists (
    select 1 from public.artifacts a
    where a.id = artifact_links.source_artifact_id
      and a.user_id = auth.uid()
  )
  or exists (
    select 1 from public.artifacts a
    where a.id = artifact_links.target_artifact_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "artifact_links_insert_owner" on public.artifact_links;
create policy "artifact_links_insert_owner"
on public.artifact_links for insert
with check (
  exists (
    select 1 from public.artifacts a
    where a.id = artifact_links.source_artifact_id
      and a.user_id = auth.uid()
  )
  and exists (
    select 1 from public.artifacts a
    where a.id = artifact_links.target_artifact_id
      and a.user_id = auth.uid()
  )
);

-- collab_sessions
drop policy if exists "collab_sessions_select_owner_or_creator" on public.collab_sessions;
create policy "collab_sessions_select_owner_or_creator"
on public.collab_sessions for select
using (auth.uid() = owner_id or auth.uid() = created_by);

drop policy if exists "collab_sessions_insert_creator" on public.collab_sessions;
create policy "collab_sessions_insert_creator"
on public.collab_sessions for insert
with check (auth.uid() = created_by);

drop policy if exists "collab_sessions_update_owner_or_creator" on public.collab_sessions;
create policy "collab_sessions_update_owner_or_creator"
on public.collab_sessions for update
using (auth.uid() = owner_id or auth.uid() = created_by)
with check (auth.uid() = owner_id or auth.uid() = created_by);

-- comments
drop policy if exists "comments_select_related" on public.comments;
create policy "comments_select_related"
on public.comments for select
using (
  auth.uid() = author_id
  or exists (
    select 1 from public.artifacts a
    where a.id = comments.artifact_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "comments_insert_author" on public.comments;
create policy "comments_insert_author"
on public.comments for insert
with check (auth.uid() = author_id);

drop policy if exists "comments_update_author_or_owner" on public.comments;
create policy "comments_update_author_or_owner"
on public.comments for update
using (
  auth.uid() = author_id
  or exists (
    select 1 from public.artifacts a
    where a.id = comments.artifact_id
      and a.user_id = auth.uid()
  )
)
with check (
  auth.uid() = author_id
  or exists (
    select 1 from public.artifacts a
    where a.id = comments.artifact_id
      and a.user_id = auth.uid()
  )
);

-- suggestions
drop policy if exists "suggestions_select_related" on public.suggestions;
create policy "suggestions_select_related"
on public.suggestions for select
using (
  auth.uid() = author_id
  or exists (
    select 1 from public.artifacts a
    where a.id = suggestions.artifact_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "suggestions_insert_author" on public.suggestions;
create policy "suggestions_insert_author"
on public.suggestions for insert
with check (auth.uid() = author_id);

drop policy if exists "suggestions_update_author_or_owner" on public.suggestions;
create policy "suggestions_update_author_or_owner"
on public.suggestions for update
using (
  auth.uid() = author_id
  or exists (
    select 1 from public.artifacts a
    where a.id = suggestions.artifact_id
      and a.user_id = auth.uid()
  )
)
with check (
  auth.uid() = author_id
  or exists (
    select 1 from public.artifacts a
    where a.id = suggestions.artifact_id
      and a.user_id = auth.uid()
  )
);

-- =========================
-- Seed plan feature defaults
-- =========================

insert into public.plan_features (plan_key, feature_key, enabled, limits)
values
  ('free', 'tool_runs', true, '{}'::jsonb),
  ('free', 'artifact_history', true, '{}'::jsonb),
  ('premium', 'tool_runs', true, '{}'::jsonb),
  ('premium', 'artifact_transforms', true, '{}'::jsonb),
  ('premium', 'artifact_history', true, '{}'::jsonb),
  ('premium', 'collab_comments', true, '{}'::jsonb),
  ('premium', 'advanced_analytics', true, '{}'::jsonb),
  ('pro', 'tool_runs', true, '{}'::jsonb),
  ('pro', 'artifact_transforms', true, '{}'::jsonb),
  ('pro', 'artifact_history', true, '{}'::jsonb),
  ('pro', 'collab_comments', true, '{}'::jsonb),
  ('pro', 'collab_suggestions', true, '{}'::jsonb),
  ('pro', 'teacher_workflows', true, '{}'::jsonb),
  ('pro', 'advanced_analytics', true, '{}'::jsonb),
  ('pro', 'bulk_generation', true, '{}'::jsonb)
on conflict (plan_key, feature_key) do update
set enabled = excluded.enabled,
    limits = excluded.limits,
    updated_at = now();

commit;
