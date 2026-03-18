-- Subjects sync prerequisites for fast checksum-based refresh.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

-- 1) Ensure updated_at exists on core subject graph tables.
alter table if exists public.subjects add column if not exists updated_at timestamptz default now();
alter table if exists public.class_subjects add column if not exists updated_at timestamptz default now();
alter table if exists public.chapters add column if not exists updated_at timestamptz default now();
alter table if exists public.paragraphs add column if not exists updated_at timestamptz default now();
alter table if exists public.assignments add column if not exists updated_at timestamptz default now();

-- 2) Generic trigger function to keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_subjects_updated_at on public.subjects;
create trigger trg_subjects_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

drop trigger if exists trg_class_subjects_updated_at on public.class_subjects;
create trigger trg_class_subjects_updated_at
before update on public.class_subjects
for each row execute function public.set_updated_at();

drop trigger if exists trg_chapters_updated_at on public.chapters;
create trigger trg_chapters_updated_at
before update on public.chapters
for each row execute function public.set_updated_at();

drop trigger if exists trg_paragraphs_updated_at on public.paragraphs;
create trigger trg_paragraphs_updated_at
before update on public.paragraphs
for each row execute function public.set_updated_at();

drop trigger if exists trg_assignments_updated_at on public.assignments;
create trigger trg_assignments_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

-- 3) Helpful indexes for sync endpoint queries (schema-safe for renamed columns).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subjects' and column_name = 'user_id'
  ) then
    execute 'create index if not exists idx_subjects_user_id on public.subjects(user_id)';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subjects' and column_name = 'owner_id'
  ) then
    execute 'create index if not exists idx_subjects_owner_id on public.subjects(owner_id)';
  end if;
end $$;

create index if not exists idx_subjects_class_id on public.subjects(class_id);
create index if not exists idx_subjects_updated_at on public.subjects(updated_at);
create index if not exists idx_class_subjects_class_subject on public.class_subjects(class_id, subject_id);
create index if not exists idx_class_subjects_updated_at on public.class_subjects(updated_at);
create index if not exists idx_chapters_subject_id on public.chapters(subject_id);
create index if not exists idx_chapters_updated_at on public.chapters(updated_at);
create index if not exists idx_paragraphs_chapter_id on public.paragraphs(chapter_id);
create index if not exists idx_paragraphs_updated_at on public.paragraphs(updated_at);
create index if not exists idx_assignments_paragraph_id on public.assignments(paragraph_id);
create index if not exists idx_assignments_updated_at on public.assignments(updated_at);

do $$
declare
  has_user_id boolean;
  has_student_id boolean;
  has_subject_id boolean;
  has_paragraph_id boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'session_logs' and column_name = 'user_id'
  ) into has_user_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'session_logs' and column_name = 'student_id'
  ) into has_student_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'session_logs' and column_name = 'subject_id'
  ) into has_subject_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'session_logs' and column_name = 'paragraph_id'
  ) into has_paragraph_id;

  if has_user_id and has_subject_id then
    execute 'create index if not exists idx_session_logs_user_subject_started on public.session_logs(user_id, subject_id, started_at desc)';
  elsif has_student_id and has_paragraph_id then
    execute 'create index if not exists idx_session_logs_student_paragraph_started on public.session_logs(student_id, paragraph_id, started_at desc)';
  elsif has_student_id then
    execute 'create index if not exists idx_session_logs_student_started on public.session_logs(student_id, started_at desc)';
  elsif has_user_id then
    execute 'create index if not exists idx_session_logs_user_started on public.session_logs(user_id, started_at desc)';
  end if;
end $$;
