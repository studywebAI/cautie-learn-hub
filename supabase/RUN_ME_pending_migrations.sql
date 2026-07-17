-- ==============================================
-- Pending production migrations bundle
-- Generated 2026-07-17 -- run manually in the Supabase SQL editor
-- ==============================================
-- These 16 migrations exist locally but supabase migration list --linked
-- shows them missing from the remote's migration history. Applying them
-- fixes: GET /api/scheduled-items/check (500, missing table), the paragraph
-- prerequisite feature (missing column), and a few other schema gaps.
-- All statements are idempotent (IF NOT EXISTS / DROP...IF EXISTS then
-- CREATE), safe to run even if a few already partially exist.
-- A storage-bucket section for /api/upload is appended at the end --
-- that one is NOT tracked as a migration anywhere and is the most
-- likely cause of the upload 500s.

-- ===== 20260429_ideas_board_v1.sql =====
-- Ideas Board v1
-- Community feature request intake + lightweight poll voting

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ideas_board_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  is_poll_seed boolean NOT NULL DEFAULT false,
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ideas_board_status_check CHECK (status IN ('open', 'planned', 'in_progress', 'shipped', 'archived'))
);
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.ideas_board_items ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.ideas_board_items ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.ideas_board_items ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.ideas_board_items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.ideas_board_items ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.ideas_board_items ADD COLUMN IF NOT EXISTS is_poll_seed boolean;
ALTER TABLE public.ideas_board_items ADD COLUMN IF NOT EXISTS vote_count integer;
ALTER TABLE public.ideas_board_items ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.ideas_board_items ADD COLUMN IF NOT EXISTS updated_at timestamptz;


CREATE TABLE IF NOT EXISTS public.ideas_board_votes (
  idea_id uuid NOT NULL REFERENCES public.ideas_board_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.ideas_board_votes ADD COLUMN IF NOT EXISTS idea_id uuid;
ALTER TABLE public.ideas_board_votes ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.ideas_board_votes ADD COLUMN IF NOT EXISTS created_at timestamptz;


CREATE INDEX IF NOT EXISTS ideas_board_items_status_idx
  ON public.ideas_board_items(status, vote_count DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS ideas_board_votes_user_idx
  ON public.ideas_board_votes(user_id, created_at DESC);

ALTER TABLE public.ideas_board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas_board_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ideas_board_items_select_all ON public.ideas_board_items;
CREATE POLICY ideas_board_items_select_all
  ON public.ideas_board_items
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS ideas_board_items_insert_own ON public.ideas_board_items;
CREATE POLICY ideas_board_items_insert_own
  ON public.ideas_board_items
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS ideas_board_items_update_owner ON public.ideas_board_items;
CREATE POLICY ideas_board_items_update_owner
  ON public.ideas_board_items
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS ideas_board_votes_select_all ON public.ideas_board_votes;
CREATE POLICY ideas_board_votes_select_all
  ON public.ideas_board_votes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS ideas_board_votes_insert_own ON public.ideas_board_votes;
CREATE POLICY ideas_board_votes_insert_own
  ON public.ideas_board_votes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ideas_board_votes_delete_own ON public.ideas_board_votes;
CREATE POLICY ideas_board_votes_delete_own
  ON public.ideas_board_votes
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_ideas_board_vote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ideas_board_items
    SET vote_count = vote_count + 1, updated_at = now()
    WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ideas_board_items
    SET vote_count = GREATEST(vote_count - 1, 0), updated_at = now()
    WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ideas_board_vote_count_trigger ON public.ideas_board_votes;
CREATE TRIGGER ideas_board_vote_count_trigger
AFTER INSERT OR DELETE ON public.ideas_board_votes
FOR EACH ROW
EXECUTE FUNCTION public.sync_ideas_board_vote_count();

-- Seed 3 poll ideas requested for initial community voting
INSERT INTO public.ideas_board_items (created_by, title, description, status, is_poll_seed)
SELECT
  p.id,
  seed.title,
  seed.description,
  'open',
  true
FROM (
  VALUES
    (
      'Voice-first study mode',
      'Allow microphone input/output for tool generation and study interactions instead of text-only workflows.'
    ),
    (
      'Source-backed deep questions',
      'Generate deeper follow-up questions that cite source snippets and adapt to what a student already knows.'
    ),
    (
      'Auto timelines and diagrams',
      'Create premium visual outputs like timeline animations and custom concept diagrams from course materials.'
    )
) AS seed(title, description)
JOIN LATERAL (
  SELECT id
  FROM public.profiles
  ORDER BY id
  LIMIT 1
) p ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ideas_board_items i
  WHERE i.title = seed.title
);

-- ===== 20260429_ideas_board_v2_polls.sql =====
-- Ideas Board v2
-- Adds admin triage flow + monthly polls

ALTER TABLE public.ideas_board_items
  ADD COLUMN IF NOT EXISTS lifecycle_stage text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS promoted_to_candidate_by uuid,
  ADD COLUMN IF NOT EXISTS promoted_to_candidate_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ideas_board_items_lifecycle_stage_check'
  ) THEN
    ALTER TABLE public.ideas_board_items
      ADD CONSTRAINT ideas_board_items_lifecycle_stage_check
      CHECK (lifecycle_stage IN ('submitted', 'candidate', 'planned', 'rejected', 'shipped'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ideas_board_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  month_key text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ideas_board_polls_status_check CHECK (status IN ('draft', 'open', 'closed', 'archived'))
);
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.ideas_board_polls ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.ideas_board_polls ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.ideas_board_polls ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.ideas_board_polls ADD COLUMN IF NOT EXISTS month_key text;
ALTER TABLE public.ideas_board_polls ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.ideas_board_polls ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.ideas_board_polls ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.ideas_board_polls ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.ideas_board_polls ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.ideas_board_polls ADD COLUMN IF NOT EXISTS updated_at timestamptz;


CREATE UNIQUE INDEX IF NOT EXISTS ideas_board_polls_month_key_uidx
  ON public.ideas_board_polls(month_key);

CREATE TABLE IF NOT EXISTS public.ideas_board_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.ideas_board_polls(id) ON DELETE CASCADE,
  idea_id uuid REFERENCES public.ideas_board_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  vote_count integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.ideas_board_poll_options ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.ideas_board_poll_options ADD COLUMN IF NOT EXISTS poll_id uuid;
ALTER TABLE public.ideas_board_poll_options ADD COLUMN IF NOT EXISTS idea_id uuid;
ALTER TABLE public.ideas_board_poll_options ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.ideas_board_poll_options ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.ideas_board_poll_options ADD COLUMN IF NOT EXISTS vote_count integer;
ALTER TABLE public.ideas_board_poll_options ADD COLUMN IF NOT EXISTS position integer;
ALTER TABLE public.ideas_board_poll_options ADD COLUMN IF NOT EXISTS created_at timestamptz;


CREATE INDEX IF NOT EXISTS ideas_board_poll_options_poll_idx
  ON public.ideas_board_poll_options(poll_id, position);

CREATE TABLE IF NOT EXISTS public.ideas_board_poll_votes (
  poll_id uuid NOT NULL REFERENCES public.ideas_board_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.ideas_board_poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.ideas_board_poll_votes ADD COLUMN IF NOT EXISTS poll_id uuid;
ALTER TABLE public.ideas_board_poll_votes ADD COLUMN IF NOT EXISTS option_id uuid;
ALTER TABLE public.ideas_board_poll_votes ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.ideas_board_poll_votes ADD COLUMN IF NOT EXISTS created_at timestamptz;


CREATE INDEX IF NOT EXISTS ideas_board_poll_votes_option_idx
  ON public.ideas_board_poll_votes(option_id);

ALTER TABLE public.ideas_board_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas_board_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas_board_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ideas_board_polls_select_all ON public.ideas_board_polls;
CREATE POLICY ideas_board_polls_select_all
  ON public.ideas_board_polls
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS ideas_board_polls_admin_insert ON public.ideas_board_polls;
CREATE POLICY ideas_board_polls_admin_insert
  ON public.ideas_board_polls
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.subscription_type IN ('admin', 'owner', 'creator')
    )
  );

DROP POLICY IF EXISTS ideas_board_polls_admin_update ON public.ideas_board_polls;
CREATE POLICY ideas_board_polls_admin_update
  ON public.ideas_board_polls
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.subscription_type IN ('admin', 'owner', 'creator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.subscription_type IN ('admin', 'owner', 'creator')
    )
  );

DROP POLICY IF EXISTS ideas_board_poll_options_select_all ON public.ideas_board_poll_options;
CREATE POLICY ideas_board_poll_options_select_all
  ON public.ideas_board_poll_options
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS ideas_board_poll_options_admin_insert ON public.ideas_board_poll_options;
CREATE POLICY ideas_board_poll_options_admin_insert
  ON public.ideas_board_poll_options
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.subscription_type IN ('admin', 'owner', 'creator')
    )
  );

DROP POLICY IF EXISTS ideas_board_poll_votes_select_all ON public.ideas_board_poll_votes;
CREATE POLICY ideas_board_poll_votes_select_all
  ON public.ideas_board_poll_votes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS ideas_board_poll_votes_insert_own ON public.ideas_board_poll_votes;
CREATE POLICY ideas_board_poll_votes_insert_own
  ON public.ideas_board_poll_votes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.ideas_board_polls poll
      WHERE poll.id = poll_id
        AND poll.status = 'open'
    )
  );

DROP POLICY IF EXISTS ideas_board_items_admin_promote_update ON public.ideas_board_items;
CREATE POLICY ideas_board_items_admin_promote_update
  ON public.ideas_board_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.subscription_type IN ('admin', 'owner', 'creator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.subscription_type IN ('admin', 'owner', 'creator')
    )
  );

CREATE OR REPLACE FUNCTION public.sync_ideas_board_poll_option_vote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ideas_board_poll_options
    SET vote_count = vote_count + 1
    WHERE id = NEW.option_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ideas_board_poll_options
    SET vote_count = GREATEST(vote_count - 1, 0)
    WHERE id = OLD.option_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ideas_board_poll_option_vote_count_trigger ON public.ideas_board_poll_votes;
CREATE TRIGGER ideas_board_poll_option_vote_count_trigger
AFTER INSERT OR DELETE ON public.ideas_board_poll_votes
FOR EACH ROW
EXECUTE FUNCTION public.sync_ideas_board_poll_option_vote_count();

-- ===== 20260510_add_artifact_title_to_tool_runs.sql =====
-- Fix for RUN_FINALIZE_FAILED when saving tool run output metadata.
-- Error: Could not find the 'artifact_title' column of 'tool_runs'.

begin;

alter table public.tool_runs
  add column if not exists artifact_title text;

commit;


-- ===== 20260513_studyset_workflow_settings.sql =====
-- StudySet workflow settings and plan storage
-- Idempotent migration

create table if not exists public.studyset_workflow_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  studyset_id uuid not null references public.studysets(id) on delete cascade,
  workflow_type text not null check (workflow_type in ('balanced', 'test_prep', 'visual', 'deep_diver', 'quick_learner')),
  knowledge_level text not null check (knowledge_level in ('nothing', 'some', 'medium', 'advanced')),
  study_days text[] not null,
  workflow_setting text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studyset_id)
);
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.studyset_workflow_settings ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.studyset_workflow_settings ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.studyset_workflow_settings ADD COLUMN IF NOT EXISTS studyset_id uuid;
ALTER TABLE public.studyset_workflow_settings ADD COLUMN IF NOT EXISTS workflow_type text;
ALTER TABLE public.studyset_workflow_settings ADD COLUMN IF NOT EXISTS knowledge_level text;
ALTER TABLE public.studyset_workflow_settings ADD COLUMN IF NOT EXISTS study_days text[];
ALTER TABLE public.studyset_workflow_settings ADD COLUMN IF NOT EXISTS workflow_setting text;
ALTER TABLE public.studyset_workflow_settings ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.studyset_workflow_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz;


create table if not exists public.studyset_generated_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  studyset_id uuid not null references public.studysets(id) on delete cascade,
  plan_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studyset_id)
);
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.studyset_generated_plans ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.studyset_generated_plans ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.studyset_generated_plans ADD COLUMN IF NOT EXISTS studyset_id uuid;
ALTER TABLE public.studyset_generated_plans ADD COLUMN IF NOT EXISTS plan_data jsonb;
ALTER TABLE public.studyset_generated_plans ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.studyset_generated_plans ADD COLUMN IF NOT EXISTS updated_at timestamptz;


create index if not exists idx_studyset_workflow_settings_user_studyset
on public.studyset_workflow_settings(user_id, studyset_id);

create index if not exists idx_studyset_generated_plans_user_studyset
on public.studyset_generated_plans(user_id, studyset_id);

alter table public.studyset_workflow_settings enable row level security;
alter table public.studyset_generated_plans enable row level security;

drop policy if exists "studyset_workflow_settings_owner_all" on public.studyset_workflow_settings;
create policy "studyset_workflow_settings_owner_all"
on public.studyset_workflow_settings
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "studyset_generated_plans_owner_all" on public.studyset_generated_plans;
create policy "studyset_generated_plans_owner_all"
on public.studyset_generated_plans
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ===== 20260526_caldav_calendar_integration.sql =====
-- CalDAV Calendar Integration
-- Support for Apple iCloud, Google Calendar, Outlook, and custom CalDAV servers
-- Enables bi-directional sync without API keys - just user credentials

create table if not exists public.calendar_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('apple', 'google', 'outlook', 'caldav')),
  username text not null,
  password text not null,
  caldav_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz
);
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.calendar_accounts ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.calendar_accounts ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.calendar_accounts ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.calendar_accounts ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.calendar_accounts ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE public.calendar_accounts ADD COLUMN IF NOT EXISTS caldav_url text;
ALTER TABLE public.calendar_accounts ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.calendar_accounts ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE public.calendar_accounts ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;


-- Unique constraint to prevent duplicate connections to the same calendar
create unique index if not exists idx_calendar_accounts_user_provider_username
on public.calendar_accounts(user_id, provider, username)
where provider != 'caldav';

-- For CalDAV custom servers, allow multiple URLs
create unique index if not exists idx_calendar_accounts_caldav_user_url
on public.calendar_accounts(user_id, caldav_url)
where provider = 'caldav';

-- Index for efficient lookup by user
create index if not exists idx_calendar_accounts_user_id
on public.calendar_accounts(user_id);

-- Enable RLS
alter table public.calendar_accounts enable row level security;

-- Policy: Users can only access their own calendar accounts
drop policy if exists "calendar_accounts_owner_all" on public.calendar_accounts;
create policy "calendar_accounts_owner_all"
on public.calendar_accounts
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ===== 20260606_studyset_and_calendar_features.sql =====
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
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.class_calendar_events ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.class_calendar_events ADD COLUMN IF NOT EXISTS class_id uuid;
ALTER TABLE public.class_calendar_events ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.class_calendar_events ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.class_calendar_events ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.class_calendar_events ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE public.class_calendar_events ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.class_calendar_events ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.class_calendar_events ADD COLUMN IF NOT EXISTS all_day boolean;
ALTER TABLE public.class_calendar_events ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.class_calendar_events ADD COLUMN IF NOT EXISTS updated_at timestamptz;


alter table public.class_calendar_events enable row level security;

-- Teachers can do everything with their own class events
drop policy if exists "class_calendar_events_teacher_all" on public.class_calendar_events;
create policy "class_calendar_events_teacher_all"
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
drop policy if exists "class_calendar_events_student_read" on public.class_calendar_events;
create policy "class_calendar_events_student_read"
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
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.studyset_materials ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.studyset_materials ADD COLUMN IF NOT EXISTS studyset_id uuid;
ALTER TABLE public.studyset_materials ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.studyset_materials ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE public.studyset_materials ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.studyset_materials ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.studyset_materials ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.studyset_materials ADD COLUMN IF NOT EXISTS file_size integer;
ALTER TABLE public.studyset_materials ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE public.studyset_materials ADD COLUMN IF NOT EXISTS extraction_status text;
ALTER TABLE public.studyset_materials ADD COLUMN IF NOT EXISTS created_at timestamptz;


alter table public.studyset_materials enable row level security;

drop policy if exists "studyset_materials_owner" on public.studyset_materials;
create policy "studyset_materials_owner"
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
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.calendar_tokens ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.calendar_tokens ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.calendar_tokens ADD COLUMN IF NOT EXISTS token text;
ALTER TABLE public.calendar_tokens ADD COLUMN IF NOT EXISTS created_at timestamptz;


alter table public.calendar_tokens enable row level security;

drop policy if exists "calendar_tokens_owner" on public.calendar_tokens;
create policy "calendar_tokens_owner"
  on public.calendar_tokens
  for all
  using (user_id = auth.uid());

create unique index if not exists idx_calendar_tokens_user_id on public.calendar_tokens(user_id);

-- ===== 20260607_studyset_user_preferences.sql =====
-- StudySet per-user preferences (organization, study-flow personalization)
-- Idempotent migration

create table if not exists public.studyset_user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  studyset_id uuid not null references public.studysets(id) on delete cascade,
  random_order boolean not null default false,
  daily_reminders boolean not null default true,
  daily_task_limit integer,
  theme text not null default 'auto' check (theme in ('auto', 'light', 'dark')),
  pinned boolean not null default false,
  folder text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studyset_id, user_id)
);
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.studyset_user_preferences ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.studyset_user_preferences ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.studyset_user_preferences ADD COLUMN IF NOT EXISTS studyset_id uuid;
ALTER TABLE public.studyset_user_preferences ADD COLUMN IF NOT EXISTS random_order boolean;
ALTER TABLE public.studyset_user_preferences ADD COLUMN IF NOT EXISTS daily_reminders boolean;
ALTER TABLE public.studyset_user_preferences ADD COLUMN IF NOT EXISTS daily_task_limit integer;
ALTER TABLE public.studyset_user_preferences ADD COLUMN IF NOT EXISTS theme text;
ALTER TABLE public.studyset_user_preferences ADD COLUMN IF NOT EXISTS pinned boolean;
ALTER TABLE public.studyset_user_preferences ADD COLUMN IF NOT EXISTS folder text;
ALTER TABLE public.studyset_user_preferences ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE public.studyset_user_preferences ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.studyset_user_preferences ADD COLUMN IF NOT EXISTS updated_at timestamptz;


create index if not exists idx_studyset_user_preferences_user
on public.studyset_user_preferences(user_id, updated_at desc);

create index if not exists idx_studyset_user_preferences_pinned
on public.studyset_user_preferences(user_id, pinned) where pinned = true;

alter table public.studyset_user_preferences enable row level security;

drop policy if exists "studyset_user_preferences_owner_all" on public.studyset_user_preferences;
create policy "studyset_user_preferences_owner_all"
on public.studyset_user_preferences
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ===== 20260621_profile_identity_and_support_code.sql =====
-- Adds a per-user support-identification code and a global, teacher-lockable
-- display name, so support can look a user up by email in the Supabase table
-- editor and see a short code, and a teacher's rename of a student becomes a
-- single global override the student can no longer self-revert.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS support_code text,
  ADD COLUMN IF NOT EXISTS name_locked_by_teacher boolean NOT NULL DEFAULT false;

-- 6-character code, letters/numbers only, excluding 0 and O to avoid visual
-- confusion when read aloud or typed in by support.
CREATE OR REPLACE FUNCTION public.generate_support_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  candidate text;
BEGIN
  LOOP
    SELECT string_agg(substr(chars, (random() * length(chars))::int + 1, 1), '')
    INTO candidate
    FROM generate_series(1, 6);

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE support_code = candidate) THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

-- Backfill existing profiles one at a time so each gets a distinct code.
DO $$
DECLARE
  profile_id uuid;
BEGIN
  FOR profile_id IN SELECT id FROM public.profiles WHERE support_code IS NULL LOOP
    UPDATE public.profiles SET support_code = public.generate_support_code() WHERE id = profile_id;
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ALTER COLUMN support_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_support_code_unique'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_support_code_unique UNIQUE (support_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_support_code ON public.profiles(support_code);
CREATE INDEX IF NOT EXISTS idx_profiles_email_lookup ON public.profiles(email);

-- Generate the support code (and seed display_name from signup metadata)
-- for every newly created user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, display_name, avatar_url,
    subscription_type, subscription_tier, theme, language,
    high_contrast, dyslexia_font, reduced_motion, support_code
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'student', 'free', 'light', 'en',
    false, false, false,
    public.generate_support_code()
  );
  RETURN new;
END;
$$;

-- A teacher-driven rename (set via the admin/service-role client) locks the
-- name; once locked, the student can no longer change display_name on their
-- own profile row. auth.uid() is null under the service-role key, so the
-- teacher-rename endpoint is unaffected by this guard.
CREATE OR REPLACE FUNCTION public.enforce_display_name_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.name_locked_by_teacher
     AND auth.uid() = OLD.id
     AND NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    NEW.display_name := OLD.display_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_display_name_lock ON public.profiles;
CREATE TRIGGER trg_enforce_display_name_lock
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_display_name_lock();

COMMIT;

-- ===== 20260621_scheduled_study_items.sql =====
-- Student-scheduled study sessions (quiz/flashcards/notes/wordweb) for later,
-- with reminder notifications and dashboard/agenda visibility.

create table if not exists public.scheduled_study_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool text not null check (tool in ('quiz', 'flashcards', 'notes', 'wordweb')),
  title text not null,
  source_text text null,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'notified', 'completed', 'dismissed')),
  notified_at timestamptz null,
  created_at timestamptz not null default now()
);
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.scheduled_study_items ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.scheduled_study_items ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.scheduled_study_items ADD COLUMN IF NOT EXISTS tool text;
ALTER TABLE public.scheduled_study_items ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.scheduled_study_items ADD COLUMN IF NOT EXISTS source_text text;
ALTER TABLE public.scheduled_study_items ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE public.scheduled_study_items ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.scheduled_study_items ADD COLUMN IF NOT EXISTS notified_at timestamptz;
ALTER TABLE public.scheduled_study_items ADD COLUMN IF NOT EXISTS created_at timestamptz;


alter table public.scheduled_study_items enable row level security;

drop policy if exists "scheduled_study_items_owner_all" on public.scheduled_study_items;
create policy "scheduled_study_items_owner_all"
on public.scheduled_study_items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_scheduled_study_items_user_time
on public.scheduled_study_items(user_id, scheduled_for);

create index if not exists idx_scheduled_study_items_status_time
on public.scheduled_study_items(status, scheduled_for);

-- ===== 20260626_caldav_password_encryption.sql =====
-- CalDAV Password Encryption with pgcrypto
-- Enable pgcrypto extension for password encryption/decryption
-- Supports AES-256 encryption at rest

-- Enable pgcrypto extension if not already enabled
create extension if not exists pgcrypto;

-- Create a secure encryption key (stored as environment variable in production)
-- In Supabase, this is managed via vault or environment secrets
-- For now, we'll use a default key that should be rotated in production

-- RPC Function: Encrypt password using pgcrypto
-- Drop first: CREATE OR REPLACE fails if a prior version has a differently
-- named parameter (hit this on 2026-07-17: remote had "encrypted" instead
-- of "password"/"encrypted_password").
drop function if exists encrypt_password(text);
create or replace function encrypt_password(password text)
returns text as $$
declare
  encrypted_data text;
  encryption_key text;
begin
  -- Use a hardcoded key for now; in production, retrieve from secrets
  -- This should be rotated and stored securely
  encryption_key := coalesce(
    current_setting('app.encryption_key', true),
    'default-insecure-key-change-in-production'
  );

  -- Encrypt using AES-256-GCM (authenticated encryption)
  encrypted_data := encode(
    encrypt(password::bytea, encryption_key::bytea, 'aes'),
    'base64'
  );

  return encrypted_data;
end;
$$ language plpgsql security definer;

-- RPC Function: Decrypt password using pgcrypto
drop function if exists decrypt_password(text);
create or replace function decrypt_password(encrypted_password text)
returns text as $$
declare
  decrypted_data text;
  encryption_key text;
begin
  -- Use the same key as encryption
  encryption_key := coalesce(
    current_setting('app.encryption_key', true),
    'default-insecure-key-change-in-production'
  );

  -- Decrypt from base64 to original text
  decrypted_data := decrypt(
    decode(encrypted_password, 'base64'),
    encryption_key::bytea,
    'aes'
  )::text;

  return decrypted_data;
exception when others then
  raise exception 'Password decryption failed: %', sqlerrm;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users only
grant execute on function encrypt_password(text) to authenticated;
grant execute on function decrypt_password(text) to authenticated;

-- Update existing calendar_accounts table comment to note encryption
comment on table public.calendar_accounts is 'Stores encrypted CalDAV credentials per user. Passwords are encrypted at rest using pgcrypto AES-256.';
comment on column public.calendar_accounts.password is 'Encrypted password stored as base64. Decrypt only when needed for authentication.';

-- ===== 20260626_personal_tasks.sql =====
-- Personal Tasks table for student agenda items
-- Stores personal study tasks, deadlines, and reminders created by students

create table if not exists public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  date text, -- YYYY-MM-DD format for agenda display
  due_date text, -- YYYY-MM-DD format
  subject text,
  priority text check (priority in ('low', 'medium', 'high')),
  estimated_duration integer, -- minutes
  tags text[] default '{}', -- Array of tags
  dependencies uuid[] default '{}', -- Array of task IDs this task depends on
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  recurrence jsonb, -- For recurring tasks
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS date text;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS due_date text;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS priority text;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS estimated_duration integer;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS dependencies uuid[];
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS recurrence jsonb;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS updated_at timestamptz;


-- Index for efficient lookup by user
create index if not exists idx_personal_tasks_user_id on public.personal_tasks(user_id);

-- Index for date-based queries (agenda view)
create index if not exists idx_personal_tasks_date on public.personal_tasks(user_id, date);

-- Index for status queries
create index if not exists idx_personal_tasks_status on public.personal_tasks(user_id, status);

-- Enable RLS
alter table public.personal_tasks enable row level security;

-- Policy: Users can only access their own tasks
drop policy if exists "personal_tasks_owner_all" on public.personal_tasks;
create policy "personal_tasks_owner_all"
on public.personal_tasks
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Update timestamp trigger (optional, for updated_at column)
create or replace function public.update_personal_tasks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_personal_tasks_updated_at on public.personal_tasks;
create trigger update_personal_tasks_updated_at
  before update on public.personal_tasks
  for each row
  execute function public.update_personal_tasks_updated_at();

-- ===== 20260626_remove_weekend_tasks.sql =====
-- Remove weekend support from personal tasks
-- Move any existing Saturday/Sunday tasks to the following Monday

-- Create a function to get next Monday for a given date
drop function if exists get_next_weekday(date, integer);
create or replace function get_next_weekday(input_date date, target_day integer)
returns date as $$
declare
  current_day integer;
  days_to_add integer;
begin
  current_day := extract(dow from input_date)::integer;
  -- Convert PostgreSQL dow (0=Sunday, 1=Monday, ..., 6=Saturday) to ISO (1=Monday, ..., 7=Sunday)
  -- For Saturday (6), add 2 days to get to Monday
  -- For Sunday (0), add 1 day to get to Monday
  if current_day = 6 then
    days_to_add := 2;
  elsif current_day = 0 then
    days_to_add := 1;
  else
    days_to_add := 0;
  end if;

  return input_date + make_interval(days => days_to_add);
end;
$$ language plpgsql;

-- Update any personal_tasks on weekends to Monday.
-- "date"/due_date type is drift-prone on this database (hit both a missing
-- column and a text-vs-timestamptz mismatch already) -- detect the actual
-- type per column and cast the write side accordingly instead of assuming text.
DO $$
DECLARE
  date_is_text boolean;
  due_date_is_text boolean;
BEGIN
  SELECT (data_type = 'text') INTO date_is_text
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'personal_tasks' AND column_name = 'date';

  SELECT (data_type = 'text') INTO due_date_is_text
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'personal_tasks' AND column_name = 'due_date';

  IF date_is_text THEN
    UPDATE public.personal_tasks
    SET "date" = get_next_weekday("date"::date, 1)::text
    WHERE "date" IS NOT NULL AND extract(dow from "date"::date)::integer IN (0, 6);
  ELSE
    UPDATE public.personal_tasks
    SET "date" = get_next_weekday("date"::date, 1)
    WHERE "date" IS NOT NULL AND extract(dow from "date"::date)::integer IN (0, 6);
  END IF;

  IF due_date_is_text THEN
    UPDATE public.personal_tasks
    SET due_date = get_next_weekday(due_date::date, 1)::text
    WHERE due_date IS NOT NULL AND extract(dow from due_date::date)::integer IN (0, 6);
  ELSE
    UPDATE public.personal_tasks
    SET due_date = get_next_weekday(due_date::date, 1)
    WHERE due_date IS NOT NULL AND extract(dow from due_date::date)::integer IN (0, 6);
  END IF;
END $$;

-- Add a constraint to prevent weekend dates in future inserts/updates
-- (This is enforced at the application level, not in the database)

-- Drop the helper function as it's no longer needed
drop function if exists get_next_weekday(date, integer);

-- ===== 20260714_link_grade_sets_to_assignments.sql =====
-- =============================================
-- Link grade_sets to the assignment (test) they came from
-- Date: 2026-07-14
-- Context: docs/grades-feature-brainstorm.md, section J (point 14)
-- =============================================

BEGIN;

-- A grade set can now originate from a test/assignment instead of always
-- being created by hand. Nullable + ON DELETE SET NULL so manually-created
-- grade sets (oral exams etc.) keep working exactly as before.
ALTER TABLE public.grade_sets
  ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL;

-- One grade set per test: the "get or create" flow that auto-creates a
-- grade_sets row when the first attempt comes in must be idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_grade_sets_assignment_id_unique
  ON public.grade_sets(assignment_id)
  WHERE assignment_id IS NOT NULL;

-- Two separate release actions (nakijkresultaten vs. cijfer), decided in
-- docs/grades-feature-brainstorm.md section H point 4/9.
ALTER TABLE public.grade_sets
  ADD COLUMN IF NOT EXISTS answers_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS grade_released_at timestamptz;

COMMENT ON COLUMN public.grade_sets.assignment_id IS 'Test/assignment this grade set was auto-created from, if any. Null for manually-created grade sets.';
COMMENT ON COLUMN public.grade_sets.answers_released_at IS 'When the teacher released per-question correct/incorrect results to students. Independent from grade_released_at.';
COMMENT ON COLUMN public.grade_sets.grade_released_at IS 'When the teacher released the final grade to students. Independent from answers_released_at.';

-- grade_sets.status has no CHECK constraint (plain text), so the new
-- 'grading' state (nakijken in progress, before a grade exists) needs no
-- schema change — just documenting the now-wider set of values here.
COMMENT ON COLUMN public.grade_sets.status IS 'draft, grading, published (see docs/grades-feature-brainstorm.md)';

COMMIT;

-- ===== 20260715_add_tests_chapter_flag.sql =====
-- =============================================
-- Toetsen-hoofdstuk: marks a chapter as a subject's dedicated tests chapter
-- Date: 2026-07-15
-- Context: docs/subjects-feature-brainstorm.md section A/G (toetsen-hoofdstuk)
-- =============================================

BEGIN;

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS is_tests_chapter boolean NOT NULL DEFAULT false;

-- At most one tests chapter per subject.
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_tests_chapter_unique
  ON public.chapters(subject_id)
  WHERE is_tests_chapter = true;

COMMENT ON COLUMN public.chapters.is_tests_chapter IS
  'Marks this chapter as the subject''s dedicated tests chapter (docs/subjects-feature-brainstorm.md). At most one per subject, enforced by idx_chapters_tests_chapter_unique.';

COMMIT;

-- ===== 20260716_add_file_block_type.sql =====
-- =============================================
-- Allow 'file' as a blocks.type value
-- Date: 2026-07-16
-- Context: docs/subjects-feature-brainstorm.md section C10 — downloadable
-- materials (worksheets, slides, docs) as a block type in the assignment
-- editor, same treatment as the existing image/video blocks.
-- =============================================

BEGIN;

ALTER TABLE public.blocks
DROP CONSTRAINT IF EXISTS blocks_type_check;

ALTER TABLE public.blocks
ADD CONSTRAINT blocks_type_check
CHECK (type IN (
  'text', 'image', 'video', 'file', 'multiple_choice', 'open_question',
  'fill_in_blank', 'drag_drop', 'matching', 'ordering', 'media_embed',
  'divider', 'rich_text', 'executable_code', 'code', 'list',
  'quote', 'layout', 'complex'
));

COMMIT;

-- ===== 20260717_subjects_archive_folders_prerequisites.sql =====
-- =============================================
-- Subjects: archiving, folders, and paragraph prerequisites
-- Date: 2026-07-17
-- Context: docs/subjects-feature-brainstorm.md section B8/B9, D15
-- =============================================

BEGIN;

-- B8: archive a subject (finished course/school year) instead of it
-- cluttering the list forever.
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- B9: group subjects into folders (per school year / subject group etc.)
CREATE TABLE IF NOT EXISTS public.subject_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subject_folders_name_len_chk CHECK (char_length(btrim(name)) BETWEEN 1 AND 80)
);
-- Backfill columns in case this table already existed with a different/partial schema
ALTER TABLE public.subject_folders ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.subject_folders ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.subject_folders ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.subject_folders ADD COLUMN IF NOT EXISTS created_at timestamptz;


ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.subject_folders(id) ON DELETE SET NULL;

ALTER TABLE public.subject_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_folders_select" ON public.subject_folders;
DROP POLICY IF EXISTS "subject_folders_insert" ON public.subject_folders;
DROP POLICY IF EXISTS "subject_folders_update" ON public.subject_folders;
DROP POLICY IF EXISTS "subject_folders_delete" ON public.subject_folders;

-- Folders are a personal teacher-organization tool — scoped to their own.
CREATE POLICY "subject_folders_select" ON public.subject_folders
  FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "subject_folders_insert" ON public.subject_folders
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "subject_folders_update" ON public.subject_folders
  FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "subject_folders_delete" ON public.subject_folders
  FOR DELETE USING (created_by = auth.uid());

-- D15: a paragraph can require another paragraph to be finished first.
ALTER TABLE public.paragraphs
  ADD COLUMN IF NOT EXISTS prerequisite_paragraph_id uuid REFERENCES public.paragraphs(id) ON DELETE SET NULL;

COMMIT;

-- =============================================
-- Storage: content-uploads bucket for /api/upload
-- Not tracked as a migration anywhere in the repo -- `supabase storage ls
-- --linked` returns zero buckets on the linked project, which is the
-- direct cause of every "Upload failed" toast (app/api/upload/route.ts
-- uploads to a bucket named 'content-uploads' that doesn't exist yet).
-- Files are stored at content-uploads/{auth.uid()}/{timestamp}.{ext} --
-- policies below scope read/write to that per-user folder.
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('content-uploads', 'content-uploads', true, 10485760)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "content_uploads_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "content_uploads_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "content_uploads_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "content_uploads_public_read" ON storage.objects;

CREATE POLICY "content_uploads_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'content-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "content_uploads_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'content-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "content_uploads_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'content-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Bucket is public (matches getPublicUrl() usage in app/api/upload/route.ts,
-- which assumes anyone with the URL can view uploaded images/files).
CREATE POLICY "content_uploads_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'content-uploads');

