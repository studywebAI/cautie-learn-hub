# Launch Closure Tracker

Last updated: 2026-04-19
Scope sources:
- `docs/launch/launch-master-open-items.md`
- `docs/product-ia-preload-redesign-plan.md`
- `product-ia-preload-redesign-plan.md`
- `subjects-card-layout-plan.md`
- `subjects-hierarchy-implementation-plan.md`

## Current Truth
- `launch-master-open-items.md`: 106 open checklist items remain, 8 closed.
- The full launch master is **not** 100% complete yet.

## Completed in latest closure run (2026-04-19)
- Added deterministic marker scanning pipeline:
  - `scripts/scan-launch-markers.mjs`
  - `npm run launch:scan-markers`
  - regenerates `docs/launch/code-markers-scan.txt` + `docs/launch/code-markers-summary.txt` (current hits: 265)
- Added launch SQL runbook generator and artifacts:
  - `scripts/generate-launch-sql-runbook.mjs`
  - `npm run launch:sql-runbook`
  - `docs/launch/sql-launch-runbook.md`
  - `docs/launch/sql-launch-run-order.txt`
  - `docs/launch/sql-launch-excluded.txt`
- Added RLS hardening migration for critical tables after legacy debug history:
  - `supabase/migrations/20260419_rls_hardening_post_legacy.sql`
- Removed placeholder example file path and renamed to prompt examples:
  - removed: `app/lib/tools/source-placeholder-examples.ts`
  - added: `app/lib/tools/source-prompt-examples.ts`
- Updated dictionary wording across all supported locales to remove "coming soon"/temporary wording for touched keys.
- Validation gates:
  - `npm run typecheck` passed.
  - `npx eslint app/lib/tools/source-prompt-examples.ts` passed.

## Remaining launch-master domains
1. Agenda system redesign/completion (Phase 2A)
2. Remaining Group/Attendance/Logs expansion items beyond closed Class Ops core
3. Class tabs + class management UX polish
4. Setup/onboarding completion
5. Recents + integrations behavior hardening
6. Tools + link ingestion completion
7. AI provider failover + key management/security
8. Settings/sidebar/role IA completion
9. Theme/visual system full audit and cleanup
10. Translation completeness across all surfaces
11. Assignment advanced scope not yet closed in open-items list
12. SQL migration consolidation to remove superseded duplicates and provide one clean bootstrap path
13. Marker cleanup for docs/spec prototype language still present

## Execution mode
- Follow: `docs/agent/no-pause-execution-protocol.md`
- Delivery pattern: uninterrupted vertical slices with runtime proof before moving to next slice.

