-- StudySet workflow settings and plan storage
-- Idempotent migration

create table if not exists public.studyset_workflow_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  studyset_id uuid not null references public.studysets(id) on delete cascade,
  workflow_type text not null check (workflow_type in ('balanced', 'test_prep', 'visual', 'deep_diver', 'quick_learner')),
  knowledge_level text not null check (knowledge_level in ('nothing', 'some', 'medium', 'advanced')),
  study_days text[] not null,
  workflow_setting text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studyset_id)
);

create table if not exists public.studyset_generated_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  studyset_id uuid not null references public.studysets(id) on delete cascade,
  plan_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studyset_id)
);

create index if not exists idx_studyset_workflow_settings_user_studyset
on public.studyset_workflow_settings(user_id, studyset_id);

create index if not exists idx_studyset_generated_plans_user_studyset
on public.studyset_generated_plans(user_id, studyset_id);

alter table public.studyset_workflow_settings enable row level security;
alter table public.studyset_generated_plans enable row level security;

drop policy if exists "studyset_workflow_settings_owner_all" on public.studyset_workflow_settings;
create policy "studyset_workflow_settings_owner_all"
on public.studyset_workflow_settings
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "studyset_generated_plans_owner_all" on public.studyset_generated_plans;
create policy "studyset_generated_plans_owner_all"
on public.studyset_generated_plans
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
