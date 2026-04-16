-- 2026-04-16
-- Class Ops hardening:
-- 1) Ensure attendance note path is fully removed.
-- 2) Backfill audit log metadata with normalized log_code/log_category values.
-- Idempotent migration.

begin;

-- Attendance note path cleanup (safe if already removed)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'student_attendance'
      and column_name = 'note'
  ) then
    execute 'update public.student_attendance set note = null where note is not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'student_attendance'
      and column_name = 'noted_by'
  ) then
    execute 'update public.student_attendance set noted_by = null where noted_by is not null';
  end if;
end $$;

alter table if exists public.student_attendance
  drop column if exists noted_by;

alter table if exists public.student_attendance
  drop column if exists note;

-- Backfill log metadata for attendance + rename actions.
update public.audit_logs
set metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object('log_code', 'EVT-ATT-001', 'log_category', 'events')
where action = 'attendance_state_changed'
  and class_id is not null;

update public.audit_logs
set metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object('log_code', 'EVT-ATT-002', 'log_category', 'events')
where action = 'attendance_event_homework_incomplete'
  and class_id is not null;

update public.audit_logs
set metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object('log_code', 'EVT-ATT-003', 'log_category', 'events')
where action = 'attendance_event_late'
  and class_id is not null;

update public.audit_logs
set metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object('log_code', 'EVT-CUS-001', 'log_category', 'custom_events')
where action = 'attendance_event_custom'
  and class_id is not null;

update public.audit_logs
set metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object('log_code', 'ROS-MEM-001', 'log_category', 'roster')
where action = 'member_rename'
  and class_id is not null;

-- Fallback category for any uncategorized class audit logs.
update public.audit_logs
set metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object('log_category', 'academic')
where class_id is not null
  and coalesce(metadata, '{}'::jsonb) ? 'log_category' = false;

-- Helpful indexes for class-scoped logs and code lookups.
create index if not exists idx_audit_logs_class_created_desc
  on public.audit_logs (class_id, created_at desc);

create index if not exists idx_audit_logs_log_code
  on public.audit_logs ((metadata ->> 'log_code'))
  where class_id is not null;

create index if not exists idx_audit_logs_log_category
  on public.audit_logs ((metadata ->> 'log_category'))
  where class_id is not null;

commit;
