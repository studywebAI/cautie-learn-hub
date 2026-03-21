-- Manage settings + class tab telemetry support
-- Run in Supabase SQL editor

create table if not exists public.class_preferences (
  class_id uuid primary key references public.classes(id) on delete cascade,
  default_subject_view text not null default 'mine' check (default_subject_view in ('mine', 'all')),
  grades_default_scale text not null default 'both' check (grades_default_scale in ('a_f', 'one_to_ten', 'both')),
  grades_show_class_average boolean not null default true,
  attendance_require_confirmation boolean not null default true,
  invite_allow_teacher_invites boolean not null default true,
  school_schedule_enabled boolean not null default false,
  school_schedule_visible_to_students boolean not null default true,
  updated_by uuid null references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.class_preferences add column if not exists school_schedule_enabled boolean not null default false;
alter table public.class_preferences add column if not exists school_schedule_visible_to_students boolean not null default true;

create table if not exists public.class_teacher_invite_codes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  code text not null unique,
  issued_by uuid not null references public.profiles(id) on delete cascade,
  issued_to_email text null,
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'revoked')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by uuid null references public.profiles(id),
  used_at timestamptz null
);

create table if not exists public.class_teacher_join_requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  requester_email text null,
  invited_by_user_id uuid null references public.profiles(id),
  invite_code_id uuid null references public.class_teacher_invite_codes(id),
  subject_title text null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolved_by uuid null references public.profiles(id)
);

alter table public.class_preferences enable row level security;
alter table public.class_teacher_invite_codes enable row level security;
alter table public.class_teacher_join_requests enable row level security;

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

drop policy if exists "teacher_invite_codes_select_teachers" on public.class_teacher_invite_codes;
create policy "teacher_invite_codes_select_teachers"
on public.class_teacher_invite_codes
for select
using (
  exists (
    select 1
    from public.class_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.class_id = class_teacher_invite_codes.class_id
      and cm.user_id = auth.uid()
      and p.subscription_type = 'teacher'
  )
);

drop policy if exists "teacher_invite_codes_insert_teachers" on public.class_teacher_invite_codes;
create policy "teacher_invite_codes_insert_teachers"
on public.class_teacher_invite_codes
for insert
with check (
  exists (
    select 1
    from public.class_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.class_id = class_teacher_invite_codes.class_id
      and cm.user_id = auth.uid()
      and p.subscription_type = 'teacher'
  )
  and issued_by = auth.uid()
);

drop policy if exists "teacher_invite_codes_revoke_teachers" on public.class_teacher_invite_codes;
create policy "teacher_invite_codes_revoke_teachers"
on public.class_teacher_invite_codes
for update
using (
  exists (
    select 1
    from public.class_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.class_id = class_teacher_invite_codes.class_id
      and cm.user_id = auth.uid()
      and p.subscription_type = 'teacher'
  )
)
with check (
  exists (
    select 1
    from public.class_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.class_id = class_teacher_invite_codes.class_id
      and cm.user_id = auth.uid()
      and p.subscription_type = 'teacher'
  )
);

drop policy if exists "teacher_invite_codes_consume_authenticated" on public.class_teacher_invite_codes;
create policy "teacher_invite_codes_consume_authenticated"
on public.class_teacher_invite_codes
for update
using (
  auth.uid() is not null
  and status = 'active'
  and used_by is null
  and expires_at > now()
)
with check (
  used_by = auth.uid()
  and status = 'used'
  and used_at is not null
);

drop policy if exists "teacher_join_requests_select_members" on public.class_teacher_join_requests;
create policy "teacher_join_requests_select_members"
on public.class_teacher_join_requests
for select
using (
  exists (
    select 1
    from public.class_members cm
    where cm.class_id = class_teacher_join_requests.class_id
      and cm.user_id = auth.uid()
  )
  or requester_user_id = auth.uid()
);

drop policy if exists "teacher_join_requests_insert_requester" on public.class_teacher_join_requests;
create policy "teacher_join_requests_insert_requester"
on public.class_teacher_join_requests
for insert
with check (requester_user_id = auth.uid());

drop policy if exists "teacher_join_requests_update_teachers" on public.class_teacher_join_requests;
create policy "teacher_join_requests_update_teachers"
on public.class_teacher_join_requests
for update
using (
  exists (
    select 1
    from public.class_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.class_id = class_teacher_join_requests.class_id
      and cm.user_id = auth.uid()
      and p.subscription_type = 'teacher'
  )
)
with check (
  exists (
    select 1
    from public.class_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.class_id = class_teacher_join_requests.class_id
      and cm.user_id = auth.uid()
      and p.subscription_type = 'teacher'
  )
);

create index if not exists idx_audit_logs_class_entity_created_at
on public.audit_logs(class_id, entity_type, created_at desc);

create index if not exists idx_teacher_join_requests_class_status
on public.class_teacher_join_requests(class_id, status, requested_at desc);

create unique index if not exists idx_teacher_join_requests_one_pending_per_user
on public.class_teacher_join_requests(class_id, requester_user_id)
where status = 'pending';

create index if not exists idx_teacher_invite_codes_class_status
on public.class_teacher_invite_codes(class_id, status, issued_at desc);

create index if not exists idx_teacher_invite_codes_code
on public.class_teacher_invite_codes(code);
