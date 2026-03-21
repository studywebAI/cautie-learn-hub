-- Manage settings + class tab telemetry support
-- Run in Supabase SQL editor

create table if not exists public.class_preferences (
  class_id uuid primary key references public.classes(id) on delete cascade,
  default_subject_view text not null default 'mine' check (default_subject_view in ('mine', 'all')),
  grades_default_scale text not null default 'both' check (grades_default_scale in ('a_f', 'one_to_ten', 'both')),
  grades_show_class_average boolean not null default true,
  attendance_require_confirmation boolean not null default true,
  invite_allow_teacher_invites boolean not null default true,
  updated_by uuid null references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.class_preferences enable row level security;

drop policy if exists "class_preferences_select_members" on public.class_preferences;
create policy "class_preferences_select_members"
on public.class_preferences
for select
using (
  exists (
    select 1
    from public.class_members cm
    where cm.class_id = class_preferences.class_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "class_preferences_write_teachers" on public.class_preferences;
create policy "class_preferences_write_teachers"
on public.class_preferences
for all
using (
  exists (
    select 1
    from public.class_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.class_id = class_preferences.class_id
      and cm.user_id = auth.uid()
      and p.subscription_type = 'teacher'
  )
)
with check (
  exists (
    select 1
    from public.class_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.class_id = class_preferences.class_id
      and cm.user_id = auth.uid()
      and p.subscription_type = 'teacher'
  )
);

create index if not exists idx_audit_logs_class_entity_created_at
on public.audit_logs(class_id, entity_type, created_at desc);

