-- Step 12: daily studyset pulse snapshots
-- Idempotent migration

create extension if not exists pgcrypto;

create table if not exists public.studyset_daily_pulses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  studyset_id uuid not null references public.studysets(id) on delete cascade,
  pulse_date date not null,
  completion_percent integer not null default 0 check (completion_percent >= 0 and completion_percent <= 100),
  avg_score integer not null default 0 check (avg_score >= 0 and avg_score <= 100),
  pending_tasks integer not null default 0 check (pending_tasks >= 0),
  pending_interventions integer not null default 0 check (pending_interventions >= 0),
  weakest_tool text null,
  focus_topics jsonb not null default '[]'::jsonb,
  recommended_tools jsonb not null default '[]'::jsonb,
  summary text not null default '',
  source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, studyset_id, pulse_date)
);

create index if not exists idx_studyset_daily_pulses_user_date
on public.studyset_daily_pulses(user_id, pulse_date desc, updated_at desc);

create index if not exists idx_studyset_daily_pulses_studyset_date
on public.studyset_daily_pulses(studyset_id, pulse_date desc, updated_at desc);

alter table public.studyset_daily_pulses enable row level security;

drop policy if exists "studyset_daily_pulses_owner_all" on public.studyset_daily_pulses;
create policy "studyset_daily_pulses_owner_all"
on public.studyset_daily_pulses
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

