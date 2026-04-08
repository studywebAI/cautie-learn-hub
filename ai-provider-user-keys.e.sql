-- Manual migration: per-user AI provider + encrypted OpenAI key storage
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.user_ai_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider_preference text not null default 'auto'
    check (provider_preference in ('auto', 'gemini', 'openai')),
  encrypted_openai_key text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_ai_settings_provider_idx
  on public.user_ai_settings(provider_preference);

alter table public.user_ai_settings enable row level security;

drop policy if exists "user_ai_settings_select_own" on public.user_ai_settings;
create policy "user_ai_settings_select_own"
  on public.user_ai_settings
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_ai_settings_insert_own" on public.user_ai_settings;
create policy "user_ai_settings_insert_own"
  on public.user_ai_settings
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_ai_settings_update_own" on public.user_ai_settings;
create policy "user_ai_settings_update_own"
  on public.user_ai_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_ai_settings_delete_own" on public.user_ai_settings;
create policy "user_ai_settings_delete_own"
  on public.user_ai_settings
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_ai_settings_set_updated_at on public.user_ai_settings;
create trigger user_ai_settings_set_updated_at
before update on public.user_ai_settings
for each row
execute function public.set_updated_at_timestamp();
