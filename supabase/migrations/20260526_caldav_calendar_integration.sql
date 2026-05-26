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
