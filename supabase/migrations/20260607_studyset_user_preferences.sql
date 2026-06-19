-- StudySet per-user preferences (organization, study-flow personalization)
-- Idempotent migration

create table if not exists public.studyset_user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  studyset_id uuid not null references public.studysets(id) on delete cascade,
  random_order boolean not null default false,
  daily_reminders boolean not null default true,
  daily_task_limit integer,
  theme text not null default 'auto' check (theme in ('auto', 'light', 'dark')),
  pinned boolean not null default false,
  folder text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studyset_id, user_id)
);

create index if not exists idx_studyset_user_preferences_user
on public.studyset_user_preferences(user_id, updated_at desc);

create index if not exists idx_studyset_user_preferences_pinned
on public.studyset_user_preferences(user_id, pinned) where pinned = true;

alter table public.studyset_user_preferences enable row level security;

drop policy if exists "studyset_user_preferences_owner_all" on public.studyset_user_preferences;
create policy "studyset_user_preferences_owner_all"
on public.studyset_user_preferences
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
