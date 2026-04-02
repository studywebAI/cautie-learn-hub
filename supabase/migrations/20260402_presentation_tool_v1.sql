-- CAUTIE Presentation Tool V1 persistent model

create table if not exists public.presentation_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid null references public.classes(id) on delete set null,
  title text not null default 'Untitled presentation',
  prompt text not null default '',
  status text not null default 'draft' check (status in ('draft','processing','ready','failed','exporting')),
  selected_platform text not null default 'powerpoint' check (selected_platform in ('powerpoint','google-slides','keynote')),
  language text not null default 'en',
  ui_config jsonb not null default '{}'::jsonb,
  ai_suggested_config jsonb not null default '{}'::jsonb,
  effective_config jsonb not null default '{}'::jsonb,
  source_ids uuid[] not null default '{}',
  latest_version_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.presentation_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.presentation_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('text','file','image','cloud_file','link','internal_note','internal_flashcards','internal_quiz')),
  mime_type text null,
  file_name text null,
  storage_key text null,
  external_provider text null check (external_provider in ('onedrive','sharepoint','google_drive','dropbox') or external_provider is null),
  external_file_id text null,
  content text null,
  extracted_text text null,
  parsed_metadata jsonb not null default '{}'::jsonb,
  thumbnail_url text null,
  created_at timestamptz not null default now()
);

create table if not exists public.presentation_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.presentation_projects(id) on delete cascade,
  version_number integer not null,
  blueprint_json jsonb not null,
  analysis_json jsonb not null default '{}'::jsonb,
  quality_json jsonb not null default '{}'::jsonb,
  render_status text not null default 'queued' check (render_status in ('queued','rendering','ready','failed')),
  pptx_url text null,
  pdf_url text null,
  preview_manifest_json jsonb not null default '{}'::jsonb,
  slide_count integer not null default 0,
  generation_summary text null,
  ai_change_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(project_id, version_number)
);

create table if not exists public.presentation_share_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.presentation_projects(id) on delete cascade,
  version_id uuid not null references public.presentation_versions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  public_token text not null unique,
  title text not null,
  preview_manifest_json jsonb not null default '{}'::jsonb,
  expires_at timestamptz null,
  password_hash text null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'presentation_projects_latest_version_fkey'
  ) then
    alter table public.presentation_projects
      add constraint presentation_projects_latest_version_fkey
      foreign key (latest_version_id)
      references public.presentation_versions(id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_presentation_projects_user on public.presentation_projects(user_id, updated_at desc);
create index if not exists idx_presentation_sources_project on public.presentation_sources(project_id, created_at desc);
create index if not exists idx_presentation_versions_project on public.presentation_versions(project_id, version_number desc);
create index if not exists idx_presentation_share_token on public.presentation_share_snapshots(public_token);

alter table public.presentation_projects enable row level security;
alter table public.presentation_sources enable row level security;
alter table public.presentation_versions enable row level security;
alter table public.presentation_share_snapshots enable row level security;

drop policy if exists "presentation_projects_owner_select" on public.presentation_projects;
create policy "presentation_projects_owner_select"
on public.presentation_projects for select
using (auth.uid() = user_id);

drop policy if exists "presentation_projects_owner_insert" on public.presentation_projects;
create policy "presentation_projects_owner_insert"
on public.presentation_projects for insert
with check (auth.uid() = user_id);

drop policy if exists "presentation_projects_owner_update" on public.presentation_projects;
create policy "presentation_projects_owner_update"
on public.presentation_projects for update
using (auth.uid() = user_id);

drop policy if exists "presentation_projects_owner_delete" on public.presentation_projects;
create policy "presentation_projects_owner_delete"
on public.presentation_projects for delete
using (auth.uid() = user_id);

drop policy if exists "presentation_sources_owner_select" on public.presentation_sources;
create policy "presentation_sources_owner_select"
on public.presentation_sources for select
using (auth.uid() = user_id);

drop policy if exists "presentation_sources_owner_insert" on public.presentation_sources;
create policy "presentation_sources_owner_insert"
on public.presentation_sources for insert
with check (auth.uid() = user_id);

drop policy if exists "presentation_sources_owner_update" on public.presentation_sources;
create policy "presentation_sources_owner_update"
on public.presentation_sources for update
using (auth.uid() = user_id);

drop policy if exists "presentation_sources_owner_delete" on public.presentation_sources;
create policy "presentation_sources_owner_delete"
on public.presentation_sources for delete
using (auth.uid() = user_id);

drop policy if exists "presentation_versions_owner_select" on public.presentation_versions;
create policy "presentation_versions_owner_select"
on public.presentation_versions for select
using (exists (
  select 1 from public.presentation_projects p
  where p.id = project_id and p.user_id = auth.uid()
));

drop policy if exists "presentation_versions_owner_insert" on public.presentation_versions;
create policy "presentation_versions_owner_insert"
on public.presentation_versions for insert
with check (exists (
  select 1 from public.presentation_projects p
  where p.id = project_id and p.user_id = auth.uid()
));

drop policy if exists "presentation_versions_owner_update" on public.presentation_versions;
create policy "presentation_versions_owner_update"
on public.presentation_versions for update
using (exists (
  select 1 from public.presentation_projects p
  where p.id = project_id and p.user_id = auth.uid()
));

drop policy if exists "presentation_share_owner_select" on public.presentation_share_snapshots;
create policy "presentation_share_owner_select"
on public.presentation_share_snapshots for select
using (auth.uid() = user_id);

drop policy if exists "presentation_share_owner_insert" on public.presentation_share_snapshots;
create policy "presentation_share_owner_insert"
on public.presentation_share_snapshots for insert
with check (auth.uid() = user_id);

drop policy if exists "presentation_share_owner_update" on public.presentation_share_snapshots;
create policy "presentation_share_owner_update"
on public.presentation_share_snapshots for update
using (auth.uid() = user_id);

drop policy if exists "presentation_share_public_read" on public.presentation_share_snapshots;
create policy "presentation_share_public_read"
on public.presentation_share_snapshots for select
using (
  revoked_at is null
  and (expires_at is null or expires_at > now())
);
