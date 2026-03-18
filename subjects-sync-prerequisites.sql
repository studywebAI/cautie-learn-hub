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

-- 3) Helpful indexes for sync endpoint queries.
create index if not exists idx_subjects_user_id on public.subjects(user_id);
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

create index if not exists idx_session_logs_user_subject_started
on public.session_logs(user_id, subject_id, started_at desc);
