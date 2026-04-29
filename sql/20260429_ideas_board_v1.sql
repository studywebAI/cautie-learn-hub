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

CREATE TABLE IF NOT EXISTS public.ideas_board_votes (
  idea_id uuid NOT NULL REFERENCES public.ideas_board_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);

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
