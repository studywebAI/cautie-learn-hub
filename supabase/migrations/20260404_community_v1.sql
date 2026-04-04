-- Community MVP:
-- - Users can publish selected tool artifacts
-- - Feed supports trending/new/most-liked
-- - Likes are tracked per user

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  artifact_id uuid NOT NULL,
  tool_id text NOT NULL,
  title text NOT NULL,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  subject text,
  difficulty text,
  language text,
  visibility text NOT NULL DEFAULT 'public',
  status text NOT NULL DEFAULT 'published',
  like_count integer NOT NULL DEFAULT 0,
  save_count integer NOT NULL DEFAULT 0,
  play_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_posts_visibility_check CHECK (visibility IN ('public')),
  CONSTRAINT community_posts_status_check CHECK (status IN ('published', 'hidden'))
);

CREATE UNIQUE INDEX IF NOT EXISTS community_posts_user_artifact_uidx
  ON public.community_posts(user_id, artifact_id);

CREATE INDEX IF NOT EXISTS community_posts_status_published_idx
  ON public.community_posts(status, published_at DESC);

CREATE INDEX IF NOT EXISTS community_posts_tool_idx
  ON public.community_posts(tool_id);

CREATE INDEX IF NOT EXISTS community_posts_subject_idx
  ON public.community_posts(subject);

CREATE INDEX IF NOT EXISTS community_posts_language_idx
  ON public.community_posts(language);

CREATE INDEX IF NOT EXISTS community_posts_like_count_idx
  ON public.community_posts(like_count DESC);

CREATE TABLE IF NOT EXISTS public.community_post_likes (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id),
  CONSTRAINT community_post_likes_post_fk
    FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS community_post_likes_user_idx
  ON public.community_post_likes(user_id, created_at DESC);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_posts_select_published ON public.community_posts;
CREATE POLICY community_posts_select_published
  ON public.community_posts
  FOR SELECT
  USING (status = 'published' AND visibility = 'public');

DROP POLICY IF EXISTS community_posts_insert_own ON public.community_posts;
CREATE POLICY community_posts_insert_own
  ON public.community_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS community_posts_update_own ON public.community_posts;
CREATE POLICY community_posts_update_own
  ON public.community_posts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS community_posts_delete_own ON public.community_posts;
CREATE POLICY community_posts_delete_own
  ON public.community_posts
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS community_post_likes_select_all ON public.community_post_likes;
CREATE POLICY community_post_likes_select_all
  ON public.community_post_likes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS community_post_likes_insert_own ON public.community_post_likes;
CREATE POLICY community_post_likes_insert_own
  ON public.community_post_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS community_post_likes_delete_own ON public.community_post_likes;
CREATE POLICY community_post_likes_delete_own
  ON public.community_post_likes
  FOR DELETE
  USING (auth.uid() = user_id);
