-- Microsoft read-only integration storage
-- Run in Supabase SQL editor

create table if not exists public.external_account_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('microsoft')),
  provider_account_id text null,
  account_email text null,
  scope text null,
  access_token_encrypted text not null,
  refresh_token_encrypted text null,
  expires_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists idx_external_account_connections_user_provider
on public.external_account_connections(user_id, provider);

alter table public.external_account_connections enable row level security;

drop policy if exists "external_account_connections_owner_all" on public.external_account_connections;
create policy "external_account_connections_owner_all"
on public.external_account_connections
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
