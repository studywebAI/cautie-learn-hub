-- Student-scheduled study sessions (quiz/flashcards/notes/wordweb) for later,
-- with reminder notifications and dashboard/agenda visibility.

create table if not exists public.scheduled_study_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool text not null check (tool in ('quiz', 'flashcards', 'notes', 'wordweb')),
  title text not null,
  source_text text null,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'notified', 'completed', 'dismissed')),
  notified_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.scheduled_study_items enable row level security;

drop policy if exists "scheduled_study_items_owner_all" on public.scheduled_study_items;
create policy "scheduled_study_items_owner_all"
on public.scheduled_study_items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_scheduled_study_items_user_time
on public.scheduled_study_items(user_id, scheduled_for);

create index if not exists idx_scheduled_study_items_status_time
on public.scheduled_study_items(status, scheduled_for);
