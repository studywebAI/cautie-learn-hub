-- Support messages: lightweight "Reach us" submissions from the Help & FAQ page.
-- No email/phone/chatbot routing yet (later work) — just stores the message so
-- it can be triaged manually.

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists idx_support_messages_user_id on public.support_messages(user_id);
create index if not exists idx_support_messages_status on public.support_messages(status);

alter table public.support_messages enable row level security;

drop policy if exists "support_messages_owner_select" on public.support_messages;
create policy "support_messages_owner_select"
on public.support_messages
for select
using (user_id = auth.uid());

drop policy if exists "support_messages_owner_insert" on public.support_messages;
create policy "support_messages_owner_insert"
on public.support_messages
for insert
with check (user_id = auth.uid());
