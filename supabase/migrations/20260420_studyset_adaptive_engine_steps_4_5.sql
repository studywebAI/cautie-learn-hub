-- Step 4 + Step 5 studyset adaptive runtime
-- Tool performance profiles + intervention queue
-- Idempotent migration

create extension if not exists pgcrypto;

create table if not exists public.studyset_tool_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  studyset_id uuid not null references public.studysets(id) on delete cascade,
  tool_key text not null,
  attempts_count integer not null default 0 check (attempts_count >= 0),
  avg_score integer not null default 0 check (avg_score >= 0 and avg_score <= 100),
  recent_avg_score integer not null default 0 check (recent_avg_score >= 0 and recent_avg_score <= 100),
  mastery_band text not null default 'developing' check (mastery_band in ('weak', 'developing', 'strong')),
  momentum text not null default 'flat' check (momentum in ('down', 'flat', 'up')),
  momentum_delta integer not null default 0,
  recommended_action text not null default 'stabilize' check (recommended_action in ('reinforce', 'stabilize', 'challenge')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, studyset_id, tool_key)
);

create index if not exists idx_studyset_tool_profiles_user_studyset
on public.studyset_tool_profiles(user_id, studyset_id, updated_at desc);

create table if not exists public.studyset_intervention_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  studyset_id uuid not null references public.studysets(id) on delete cascade,
  studyset_day_id uuid null references public.studyset_plan_days(id) on delete set null,
  studyset_task_id uuid null references public.studyset_plan_tasks(id) on delete set null,
  kind text not null check (kind in ('retry', 'focus', 'challenge')),
  tool_key text null,
  title text not null,
  reason text not null,
  priority integer not null default 50,
  due_date date null,
  status text not null default 'pending' check (status in ('pending', 'done', 'dismissed')),
  origin text not null default 'adaptive_engine',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_studyset_intervention_queue_user_studyset_status
on public.studyset_intervention_queue(user_id, studyset_id, status, priority desc, created_at desc);

create index if not exists idx_studyset_intervention_queue_task
on public.studyset_intervention_queue(studyset_task_id, status, created_at desc);

alter table public.studyset_tool_profiles enable row level security;
alter table public.studyset_intervention_queue enable row level security;

drop policy if exists "studyset_tool_profiles_owner_all" on public.studyset_tool_profiles;
create policy "studyset_tool_profiles_owner_all"
on public.studyset_tool_profiles
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "studyset_intervention_queue_owner_all" on public.studyset_intervention_queue;
create policy "studyset_intervention_queue_owner_all"
on public.studyset_intervention_queue
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
