-- Ideas Board admin ops: moderation audit trail + auto-close scheduling support.
-- Editing idea content or resetting votes stays a manual/code-level operation
-- (not exposed as an admin UI feature) — this migration only covers the two
-- pieces that need to run reliably without a human clicking a button:
-- closing expired polls on schedule, and recording what admin actions happened.

ALTER TABLE public.ideas_board_polls
  ALTER COLUMN ends_at SET DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.ideas_board_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid, -- null for system/cron-initiated actions
  action text NOT NULL, -- 'idea_stage_changed', 'poll_created', 'poll_status_changed', 'poll_auto_closed'
  entity_type text NOT NULL CHECK (entity_type IN ('idea', 'poll')),
  entity_id uuid NOT NULL,
  before jsonb,
  after jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ideas_board_audit_log_created_idx
  ON public.ideas_board_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS ideas_board_audit_log_entity_idx
  ON public.ideas_board_audit_log(entity_type, entity_id);

ALTER TABLE public.ideas_board_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ideas_board_audit_log_admin_select ON public.ideas_board_audit_log;
CREATE POLICY ideas_board_audit_log_admin_select
  ON public.ideas_board_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.subscription_type IN ('admin', 'owner', 'creator')
    )
  );

-- Inserts happen via the service-role client from admin API routes and the
-- cron job, both of which already gate on canManagePolls / the cron secret
-- server-side — no separate authenticated insert policy needed.
DROP POLICY IF EXISTS ideas_board_audit_log_service_insert ON public.ideas_board_audit_log;
CREATE POLICY ideas_board_audit_log_service_insert
  ON public.ideas_board_audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);
