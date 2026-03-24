-- Unified teacher agenda items + links + audit events
-- v1 includes:
-- 1) class_agenda_items (source of truth)
-- 2) class_agenda_item_links (optional links to assignments/tools/materials/studysets/etc.)
-- 3) class_agenda_events (non-blocking audit trail)
-- 4) backfill of scheduled assignments into agenda items

create extension if not exists pgcrypto;

create table if not exists public.class_agenda_items (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid null references public.subjects(id) on delete set null,
  title text not null,
  description text null,
  item_type text not null default 'assignment',
  starts_at timestamptz null,
  due_at timestamptz null,
  visibility_state text not null default 'visible',
  publish_at timestamptz null,
  created_by uuid not null references auth.users(id) on delete cascade,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_agenda_items_visibility_check check (visibility_state in ('visible', 'hidden', 'scheduled'))
);

create index if not exists idx_class_agenda_items_class_due on public.class_agenda_items(class_id, due_at);
create index if not exists idx_class_agenda_items_class_starts on public.class_agenda_items(class_id, starts_at);
create index if not exists idx_class_agenda_items_visibility on public.class_agenda_items(visibility_state, publish_at);

create table if not exists public.class_agenda_item_links (
  id uuid primary key default gen_random_uuid(),
  agenda_item_id uuid not null references public.class_agenda_items(id) on delete cascade,
  link_type text not null,
  link_ref_id text null,
  label text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_class_agenda_item_links_item on public.class_agenda_item_links(agenda_item_id, position);
create index if not exists idx_class_agenda_item_links_type on public.class_agenda_item_links(link_type);

create table if not exists public.class_agenda_events (
  id uuid primary key default gen_random_uuid(),
  agenda_item_id uuid null references public.class_agenda_items(id) on delete set null,
  class_id uuid not null references public.classes(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_class_agenda_events_class_created on public.class_agenda_events(class_id, created_at desc);
create index if not exists idx_class_agenda_events_item_created on public.class_agenda_events(agenda_item_id, created_at desc);

alter table public.class_agenda_items enable row level security;
alter table public.class_agenda_item_links enable row level security;
alter table public.class_agenda_events enable row level security;

drop policy if exists "agenda_items_select_members" on public.class_agenda_items;
create policy "agenda_items_select_members"
  on public.class_agenda_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.class_members cm
      where cm.class_id = class_agenda_items.class_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "agenda_items_insert_teachers" on public.class_agenda_items;
create policy "agenda_items_insert_teachers"
  on public.class_agenda_items
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.class_members cm
      join public.profiles p on p.id = cm.user_id
      where cm.class_id = class_agenda_items.class_id
        and cm.user_id = auth.uid()
        and p.subscription_type = 'teacher'
    )
  );

drop policy if exists "agenda_items_update_teachers" on public.class_agenda_items;
create policy "agenda_items_update_teachers"
  on public.class_agenda_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.class_members cm
      join public.profiles p on p.id = cm.user_id
      where cm.class_id = class_agenda_items.class_id
        and cm.user_id = auth.uid()
        and p.subscription_type = 'teacher'
    )
  )
  with check (
    exists (
      select 1
      from public.class_members cm
      join public.profiles p on p.id = cm.user_id
      where cm.class_id = class_agenda_items.class_id
        and cm.user_id = auth.uid()
        and p.subscription_type = 'teacher'
    )
  );

drop policy if exists "agenda_items_delete_teachers" on public.class_agenda_items;
create policy "agenda_items_delete_teachers"
  on public.class_agenda_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.class_members cm
      join public.profiles p on p.id = cm.user_id
      where cm.class_id = class_agenda_items.class_id
        and cm.user_id = auth.uid()
        and p.subscription_type = 'teacher'
    )
  );

drop policy if exists "agenda_links_select_members" on public.class_agenda_item_links;
create policy "agenda_links_select_members"
  on public.class_agenda_item_links
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.class_agenda_items ai
      join public.class_members cm on cm.class_id = ai.class_id
      where ai.id = class_agenda_item_links.agenda_item_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "agenda_links_write_teachers" on public.class_agenda_item_links;
create policy "agenda_links_write_teachers"
  on public.class_agenda_item_links
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.class_agenda_items ai
      join public.class_members cm on cm.class_id = ai.class_id and cm.user_id = auth.uid()
      join public.profiles p on p.id = cm.user_id
      where ai.id = class_agenda_item_links.agenda_item_id
        and p.subscription_type = 'teacher'
    )
  )
  with check (
    exists (
      select 1
      from public.class_agenda_items ai
      join public.class_members cm on cm.class_id = ai.class_id and cm.user_id = auth.uid()
      join public.profiles p on p.id = cm.user_id
      where ai.id = class_agenda_item_links.agenda_item_id
        and p.subscription_type = 'teacher'
    )
  );

drop policy if exists "agenda_events_select_members" on public.class_agenda_events;
create policy "agenda_events_select_members"
  on public.class_agenda_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.class_members cm
      where cm.class_id = class_agenda_events.class_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "agenda_events_insert_teachers" on public.class_agenda_events;
create policy "agenda_events_insert_teachers"
  on public.class_agenda_events
  for insert
  to authenticated
  with check (
    actor_user_id = auth.uid()
    and exists (
      select 1
      from public.class_members cm
      join public.profiles p on p.id = cm.user_id
      where cm.class_id = class_agenda_events.class_id
        and cm.user_id = auth.uid()
        and p.subscription_type = 'teacher'
    )
  );

-- Keep updated_at in sync.
create or replace function public.touch_class_agenda_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_class_agenda_items_updated_at on public.class_agenda_items;
create trigger trg_touch_class_agenda_items_updated_at
before update on public.class_agenda_items
for each row
execute function public.touch_class_agenda_items_updated_at();

-- Extend class preferences with agenda defaults.
alter table public.class_preferences
  add column if not exists agenda_default_visibility text not null default 'visible',
  add column if not exists agenda_default_item_type text not null default 'assignment',
  add column if not exists agenda_show_schedule_overlay boolean not null default true;

-- Backfill scheduled assignments as agenda items.
-- Safe because we skip rows already linked.
with scheduled_assignments as (
  select
    a.id as assignment_id,
    a.id as agenda_item_id,
    a.class_id,
    coalesce(
      ch.subject_id,
      case
        when s.class_id is not null then s.id
        else null
      end
    ) as subject_id,
    coalesce(a.title, 'Untitled Assignment') as title,
    a.description,
    coalesce(a.scheduled_start_at, a.due_date::timestamptz) as starts_at,
    coalesce(a.scheduled_end_at, a.due_date::timestamptz) as due_at,
    (
      select cm.user_id
      from public.class_members cm
      join public.profiles p on p.id = cm.user_id and p.subscription_type = 'teacher'
      where cm.class_id = a.class_id
      order by cm.created_at asc
      limit 1
    ) as actor_id
  from public.assignments a
  left join public.paragraphs p on p.id = a.paragraph_id
  left join public.chapters ch on ch.id = p.chapter_id
  left join public.subjects s on s.id = ch.subject_id
  where (a.scheduled_start_at is not null or a.scheduled_end_at is not null or a.due_date is not null)
), to_insert as (
  select *
  from scheduled_assignments sa
  where sa.actor_id is not null
    and not exists (
      select 1
      from public.class_agenda_item_links l
      where l.link_type = 'assignment'
        and l.link_ref_id = sa.assignment_id::text
    )
)
insert into public.class_agenda_items (
  id,
  class_id,
  subject_id,
  title,
  description,
  item_type,
  starts_at,
  due_at,
  visibility_state,
  created_by,
  updated_by
)
select
  ti.agenda_item_id,
  ti.class_id,
  ti.subject_id,
  ti.title,
  ti.description,
  'assignment',
  ti.starts_at,
  ti.due_at,
  'visible',
  ti.actor_id,
  ti.actor_id
from to_insert ti;

insert into public.class_agenda_item_links (
  agenda_item_id,
  link_type,
  link_ref_id,
  label,
  metadata_json,
  position
)
select
  ti.agenda_item_id,
  'assignment',
  ti.assignment_id::text,
  'Assignment',
  '{}'::jsonb,
  0
from (
  select
    a.id as assignment_id,
    a.id as agenda_item_id,
    a.class_id,
    coalesce(
      ch.subject_id,
      case
        when s.class_id is not null then s.id
        else null
      end
    ) as subject_id,
    coalesce(a.title, 'Untitled Assignment') as title,
    a.description,
    coalesce(a.scheduled_start_at, a.due_date::timestamptz) as starts_at,
    coalesce(a.scheduled_end_at, a.due_date::timestamptz) as due_at,
    (
      select cm.user_id
      from public.class_members cm
      join public.profiles p on p.id = cm.user_id and p.subscription_type = 'teacher'
      where cm.class_id = a.class_id
      order by cm.created_at asc
      limit 1
    ) as actor_id
  from public.assignments a
  left join public.paragraphs p on p.id = a.paragraph_id
  left join public.chapters ch on ch.id = p.chapter_id
  left join public.subjects s on s.id = ch.subject_id
  where (a.scheduled_start_at is not null or a.scheduled_end_at is not null or a.due_date is not null)
) ti
where ti.actor_id is not null
  and not exists (
    select 1
    from public.class_agenda_item_links l
    where l.link_type = 'assignment'
      and l.link_ref_id = ti.assignment_id::text
  );
