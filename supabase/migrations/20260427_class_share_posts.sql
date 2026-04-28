-- Class Share Posts
-- Teacher can post to either teacher-only or all-students audience.
-- Class members can read posts that match their permission level.

create table if not exists public.class_share_posts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  audience text not null default 'teacher' check (audience in ('teacher', 'all')),
  body_text text not null default '',
  attachment_label text null,
  source_type text null,
  source_ref_id text null,
  source_href text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);a

create index if not exists idx_class_share_posts_class_created_at
  on public.class_share_posts (class_id, created_at desc);

create index if not exists idx_class_share_posts_created_by
  on public.class_share_posts (created_by);

alter table public.class_share_posts enable row level security;

drop policy if exists class_share_posts_select on public.class_share_posts;
create policy class_share_posts_select
on public.class_share_posts
for select
to authenticated
using (
  exists (
    select 1
    from public.class_members cm
    where cm.class_id = class_share_posts.class_id
      and cm.user_id = auth.uid()
  )
  and (
    class_share_posts.audience = 'all'
    or exists (
      select 1
      from public.class_members cm2
      join public.profiles p on p.id = cm2.user_id
      where cm2.class_id = class_share_posts.class_id
        and cm2.user_id = auth.uid()
        and coalesce(lower(p.subscription_type), '') = 'teacher'
    )
  )
);

drop policy if exists class_share_posts_insert on public.class_share_posts;
create policy class_share_posts_insert
on public.class_share_posts
for insert
to authenticated
with check (
  class_share_posts.created_by = auth.uid()
  and exists (
    select 1
    from public.class_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.class_id = class_share_posts.class_id
      and cm.user_id = auth.uid()
      and coalesce(lower(p.subscription_type), '') = 'teacher'
  )
);

drop policy if exists class_share_posts_update on public.class_share_posts;
create policy class_share_posts_update
on public.class_share_posts
for update
to authenticated
using (
  class_share_posts.created_by = auth.uid()
)
with check (
  class_share_posts.created_by = auth.uid()
);

drop policy if exists class_share_posts_delete on public.class_share_posts;
create policy class_share_posts_delete
on public.class_share_posts
for delete
to authenticated
using (
  class_share_posts.created_by = auth.uid()
);
