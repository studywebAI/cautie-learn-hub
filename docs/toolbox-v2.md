# Toolbox v2 Implementation Notes

## What is implemented

- Unified flow execution service: `app/lib/ai/flow-executor.ts`
- Legacy AI handler now uses shared executor: `app/api/ai/handle/route.ts`
- New run orchestration endpoints:
  - `POST /api/tools/v2/runs`
  - `GET /api/tools/v2/runs`
  - `GET /api/tools/v2/runs/:runId`
- New artifact endpoints:
  - `POST /api/tools/v2/artifacts`
  - `GET /api/tools/v2/artifacts`
  - `POST /api/tools/v2/artifacts/:id/transform`
  - `GET /api/tools/v2/artifacts/:id/history`
- Billing and entitlement endpoints:
  - `GET /api/billing/v1/entitlements`
  - `POST /api/billing/v1/meter-events`
  - `GET /api/billing/v1/usage-summary`
- Collaboration endpoints:
  - `POST /api/collab/v1/sessions`
  - `POST /api/collab/v1/comments`
  - `POST /api/collab/v1/suggestions/:id/apply`
- Toolbox UI updates:
  - New Toolbox home dashboard: `app/(main)/tools/page.tsx`
  - Command palette: `app/components/tools/toolbox-command-palette.tsx`
  - Shared workbench shell: `app/components/tools/workbench-shell.tsx`
  - Notes migrated to v2 pipeline and workbench:
    `app/(main)/tools/notes/page.tsx`
  - Quiz and Flashcards generation now use `POST /api/tools/v2/runs`.

## Manual DB step required

Run this file in Supabase SQL Editor:

- `toolbox-v2-manual.sql`

It creates all required Toolbox v2 tables, indexes, triggers, and RLS policies.

## Validation

- `npm run typecheck` passes
- `npm run build` passes
