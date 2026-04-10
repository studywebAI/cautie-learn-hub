create table if not exists public.ai_error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid null references public.tool_runs(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  flow_name text not null,
  provider_preference text not null check (provider_preference in ('auto','gemini','openai')),
  provider_attempted text not null check (provider_attempted in ('gemini','openai')),
  stage text not null check (stage in ('primary_error','fallback_error','run_failed')),
  fallback_attempted boolean not null default false,
  fallback_succeeded boolean not null default false,
  error_code text null,
  error_message text not null,
  fingerprint text not null
);

create index if not exists ai_error_logs_created_at_idx on public.ai_error_logs (created_at desc);
create index if not exists ai_error_logs_user_created_idx on public.ai_error_logs (user_id, created_at desc);
create index if not exists ai_error_logs_fingerprint_idx on public.ai_error_logs (fingerprint);

alter table public.ai_error_logs enable row level security;

drop policy if exists "ai_error_logs_insert_own" on public.ai_error_logs;
create policy "ai_error_logs_insert_own"
on public.ai_error_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "ai_error_logs_select_own" on public.ai_error_logs;
create policy "ai_error_logs_select_own"
on public.ai_error_logs
for select
to authenticated
using (auth.uid() = user_id);
