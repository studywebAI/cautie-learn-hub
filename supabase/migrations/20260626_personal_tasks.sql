-- Personal Tasks table for student agenda items
-- Stores personal study tasks, deadlines, and reminders created by students

create table if not exists public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  date text, -- YYYY-MM-DD format for agenda display
  due_date text, -- YYYY-MM-DD format
  subject text,
  priority text check (priority in ('low', 'medium', 'high')),
  estimated_duration integer, -- minutes
  tags text[] default '{}', -- Array of tags
  dependencies uuid[] default '{}', -- Array of task IDs this task depends on
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  recurrence jsonb, -- For recurring tasks
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for efficient lookup by user
create index if not exists idx_personal_tasks_user_id on public.personal_tasks(user_id);

-- Index for date-based queries (agenda view)
create index if not exists idx_personal_tasks_date on public.personal_tasks(user_id, date);

-- Index for status queries
create index if not exists idx_personal_tasks_status on public.personal_tasks(user_id, status);

-- Enable RLS
alter table public.personal_tasks enable row level security;

-- Policy: Users can only access their own tasks
drop policy if exists "personal_tasks_owner_all" on public.personal_tasks;
create policy "personal_tasks_owner_all"
on public.personal_tasks
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Update timestamp trigger (optional, for updated_at column)
create or replace function public.update_personal_tasks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_personal_tasks_updated_at on public.personal_tasks;
create trigger update_personal_tasks_updated_at
  before update on public.personal_tasks
  for each row
  execute function public.update_personal_tasks_updated_at();
