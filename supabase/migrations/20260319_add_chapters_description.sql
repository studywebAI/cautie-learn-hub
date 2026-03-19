-- Add chapters.description if missing
-- Safe to run multiple times

alter table public.chapters
  add column if not exists description text;

comment on column public.chapters.description is 'Optional chapter description shown in subject overview';

-- Optional: normalize existing rows to empty text if you prefer non-null UX.
-- Keeping nullable by default to avoid changing existing behavior.
-- update public.chapters set description = '' where description is null;
