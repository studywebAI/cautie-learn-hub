-- UI/UX refactor support indexes and audit metadata.
-- Safe, additive migration only.

begin;

-- Share feed filtering (class + audience + newest first)
create index if not exists idx_class_share_posts_class_audience_created_at
  on public.class_share_posts (class_id, audience, created_at desc);

-- Attendance autosave activity lookup
create index if not exists idx_student_attendance_class_created_at
  on public.student_attendance (class_id, created_at desc);

-- Grade entry editing / save cycles
create index if not exists idx_student_grades_grade_set_updated_at
  on public.student_grades (grade_set_id, updated_at desc);

-- Optional audit trail for bulk feedback copy/apply actions from grading UI.
create table if not exists public.grade_feedback_copy_events (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  grade_set_id uuid not null references public.grade_sets(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  source_student_id uuid null,
  target_student_ids uuid[] not null default '{}',
  copied_grade_value text null,
  copied_feedback_text text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_grade_feedback_copy_events_class_created_at
  on public.grade_feedback_copy_events (class_id, created_at desc);

alter table public.grade_feedback_copy_events enable row level security;

drop policy if exists grade_feedback_copy_events_select_teacher on public.grade_feedback_copy_events;
create policy grade_feedback_copy_events_select_teacher
on public.grade_feedback_copy_events
for select
to authenticated
using (
  exists (
    select 1
    from public.class_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.class_id = grade_feedback_copy_events.class_id
      and cm.user_id = auth.uid()
      and coalesce(lower(p.subscription_type), '') = 'teacher'
  )
);

drop policy if exists grade_feedback_copy_events_insert_teacher on public.grade_feedback_copy_events;
create policy grade_feedback_copy_events_insert_teacher
on public.grade_feedback_copy_events
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and exists (
    select 1
    from public.class_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.class_id = grade_feedback_copy_events.class_id
      and cm.user_id = auth.uid()
      and coalesce(lower(p.subscription_type), '') = 'teacher'
  )
);

commit;
