-- Studyset feature additions: exam_date, subject, description, last_activity_at, review status
-- Class calendar events table for ICS feeds
-- Studyset materials table

-- ─── 1. Extend studysets table ───────────────────────────────────────────────

alter table public.studysets
  add column if not exists exam_date date null,
  add column if not exists subject text null,
  add column if not exists description text null,
  add column if not exists last_activity_at timestamptz null;

-- Widen the status check to include 'review' and 'in_progress'
alter table public.studysets
  drop constraint if exists studysets_status_check;

alter table public.studysets
  add constraint studysets_status_check
  check (status in ('draft', 'active', 'in_progress', 'review', 'completed', 'archived'));

-- Index for exam_date lookups (countdown queries)
create index if not exists idx_studysets_exam_date on public.studysets(exam_date) where exam_date is not null;
create index if not exists idx_studysets_last_activity on public.studysets(last_activity_at) where last_activity_at is not null;

-- ─── 2. class_calendar_events ────────────────────────────────────────────────

create table if not exists public.class_calendar_events (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text null,
  event_type text not null default 'other'
    check (event_type in ('assignment', 'quiz', 'exam', 'cancellation', 'event', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz null,
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.class_calendar_events enable row level security;

-- Teachers can do everything with their own class events
create policy if not exists "class_calendar_events_teacher_all"
  on public.class_calendar_events
  for all
  using (
    exists (
      select 1 from public.class_members cm
      where cm.class_id = class_calendar_events.class_id
        and cm.user_id = auth.uid()
        and cm.role = 'teacher'
    )
  );

-- Students can read events for classes they are members of
create policy if not exists "class_calendar_events_student_read"
  on public.class_calendar_events
  for select
  using (
    exists (
      select 1 from public.class_members cm
      where cm.class_id = class_calendar_events.class_id
        and cm.user_id = auth.uid()
    )
  );

create index if not exists idx_class_calendar_events_class_id on public.class_calendar_events(class_id);
create index if not exists idx_class_calendar_events_starts_at on public.class_calendar_events(starts_at);

-- ─── 3. studyset_materials ───────────────────────────────────────────────────

create table if not exists public.studyset_materials (
  id uuid primary key default gen_random_uuid(),
  studyset_id uuid not null references public.studysets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'text'
    check (kind in ('text', 'file', 'url', 'onedrive')),
  title text null,
  content text null,
  file_name text null,
  file_size integer null,
  mime_type text null,
  extraction_status text null default 'ready'
    check (extraction_status in ('ready', 'pending', 'error', 'empty')),
  created_at timestamptz not null default now()
);

alter table public.studyset_materials enable row level security;

create policy if not exists "studyset_materials_owner"
  on public.studyset_materials
  for all
  using (user_id = auth.uid());

create index if not exists idx_studyset_materials_studyset_id on public.studyset_materials(studyset_id);

-- ─── 4. Calendar subscription tokens (for webcal:// links) ──────────────────

create table if not exists public.calendar_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.calendar_tokens enable row level security;

create policy if not exists "calendar_tokens_owner"
  on public.calendar_tokens
  for all
  using (user_id = auth.uid());

create unique index if not exists idx_calendar_tokens_user_id on public.calendar_tokens(user_id);
