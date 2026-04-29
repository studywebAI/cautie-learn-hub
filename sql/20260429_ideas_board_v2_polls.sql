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

CREATE INDEX IF NOT EXISTS ideas_board_poll_options_poll_idx
  ON public.ideas_board_poll_options(poll_id, position);

CREATE TABLE IF NOT EXISTS public.ideas_board_poll_votes (
  poll_id uuid NOT NULL REFERENCES public.ideas_board_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.ideas_board_poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);

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
