-- Fix for RUN_FINALIZE_FAILED when saving tool run output metadata.
-- Error: Could not find the 'artifact_title' column of 'tool_runs'.

begin;

alter table public.tool_runs
  add column if not exists artifact_title text;

commit;

