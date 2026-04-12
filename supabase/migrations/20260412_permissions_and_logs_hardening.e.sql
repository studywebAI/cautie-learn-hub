-- 2026-04-12
-- Permissions + performance hardening for class tabs and assignment runtime.
-- Idempotent: safe to run multiple times.

begin;

-- ---------------------------------------------------------------------------
-- class_members.role hardening (some older environments dropped this column)
-- ---------------------------------------------------------------------------
alter table if exists public.class_members
  add column if not exists role text;

update public.class_members
set role = coalesce(nullif(trim(role), ''), 'student')
where role is null or trim(role) = '';

alter table if exists public.class_members
  alter column role set default 'student';

alter table if exists public.class_members
  alter column role set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'class_members_role_check'
      and conrelid = 'public.class_members'::regclass
  ) then
    alter table public.class_members
      add constraint class_members_role_check
      check (role in ('student', 'teacher', 'owner', 'admin', 'creator', 'ta'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Indexes for class tab queries + assignment runtime
-- ---------------------------------------------------------------------------
create index if not exists idx_class_members_class_user
  on public.class_members (class_id, user_id);

create index if not exists idx_class_members_class_role_user
  on public.class_members (class_id, role, user_id);

create index if not exists idx_audit_logs_class_created_at
  on public.audit_logs (class_id, created_at desc);

create index if not exists idx_student_attendance_class_student_created_at
  on public.student_attendance (class_id, student_id, created_at desc);

create index if not exists idx_grade_sets_class_created_at
  on public.grade_sets (class_id, created_at desc);

create index if not exists idx_blocks_assignment_position
  on public.blocks (assignment_id, position);

create index if not exists idx_student_answers_assignment_student_block
  on public.student_answers (assignment_id, student_id, block_id);

commit;

