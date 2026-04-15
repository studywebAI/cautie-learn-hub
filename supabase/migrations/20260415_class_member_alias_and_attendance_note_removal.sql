-- 2026-04-15
-- Class-scoped member aliases + attendance note removal.
-- Idempotent migration.

begin;

alter table if exists public.class_members
  add column if not exists display_name text;

alter table if exists public.class_members
  drop constraint if exists class_members_display_name_length_check;

alter table if exists public.class_members
  add constraint class_members_display_name_length_check
  check (display_name is null or char_length(display_name) <= 100);

create index if not exists idx_class_members_class_display_name
  on public.class_members (class_id, display_name)
  where display_name is not null;

update public.student_attendance
set note = null,
    noted_by = null
where note is not null or noted_by is not null;

alter table if exists public.student_attendance
  drop column if exists noted_by;

alter table if exists public.student_attendance
  drop column if exists note;

commit;
