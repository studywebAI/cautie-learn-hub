-- Normalized adaptive studyset telemetry
-- Safe to run multiple times.

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

alter table public.studyset_task_attempts enable row level security;
alter table public.studyset_mastery_topics enable row level security;

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

