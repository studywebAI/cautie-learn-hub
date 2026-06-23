# TODO

Living dump of everything in the repo tagged as "do later" — real `TODO`/`FIXME` code comments, plus open decisions sitting in other checklist/backlog docs. Append here whenever something new gets deferred instead of done now.

## Quick reminders from user (2026-06-22, clarified 2026-06-23)

- Login settings (separate from Account/Security?) — **not urgent, context unclear, deferred**.
- Voting (Ideas Board redesign) — **deferred to separate session per user**.
- Quiz & Flashcards — **personal note to user, not a task**.
- Notes — **not urgent, deferred**.

## Just deferred (2026-06-22)

- **Removed:** "Home Page Layout" (Grid/List view toggle) from `public/mockups/settings-redesign.html` Personalization tab — not a real feature, dropped from the mockup.
- **Maybe later:** Dashboard personalization (let users customize their dashboard/home layout). Not specced. Revisit only if/when requested again.

## Pending decisions (from `BACKLOG_CHECKLIST.md`)

- **Quiz Duel (1v1)** — built (`app/components/tools/quiz-duel.tsx`, `app/ai/flows/generate-quiz-duel-data.ts`) but not wired into the app anywhere.
  - Option A: launch it — add a "Duel Mode" button in the quiz tool, mount `<QuizDuel />`. Low effort, feature is complete.
  - Option B: delete it — remove component, flow, and `flow-executor.ts` registration. Low effort.
  - Still waiting on user preference.
- **Studyset Materials panel "Add" button** (`app/components/studyset/materials-panel.tsx`) — does nothing, explicit "Coming soon" stub. Needs full upload flow (picker, storage, DB). Out of scope until a later sprint.

## Real `TODO`/`FIXME` code/doc comments found in repo

- `CALDAV_IMPLEMENTATION_STATUS.md:102` — CalDAV passwords "Currently stored in plaintext (TODO)".
- `CALDAV_COMPLETION_REPORT.md:170-171` — TODO: Password Encryption (Supabase pgcrypto), TODO: HTTPS Only enforcement for CalDAV connections.
- `README_CALDAV.md:247` — Passwords stored unencrypted (TODO: add pgcrypto).
- `CALDAV_SETUP.md:150` — Passwords stored in DB (TODO: encrypt in production).
- `CALDAV_SUMMARY.txt:146` — Passwords stored unencrypted (TODO: encrypt in production).
- `CALDAV_TESTING_GUIDE.md:175` — (TODO: Should be encrypted in production).

All six CalDAV TODOs point at the same unresolved task: **CalDAV credentials are stored in plaintext and need pgcrypto encryption + HTTPS enforcement before this is production-safe.**

## Other future-work trackers already in the repo (don't duplicate, just point here)

- `docs/unapplied-future-things.md` — the big one: School Schedule UI (hidden), Ideas Board remaining iteration, Tools settings unification, deferred quiz grading/source-citation architecture (decision pending: A/B/C grading approach), student+teacher analytics revisit, typography sweep status, and the full "Advanced Tool Settings Backlog" spec (Speedrun, AdaptiveTimer, Quiz, Sources, Visuals, Timeline, Flashcards, Notes, Community, Safety/System — all flagged settings not yet built).
- `docs/launch/launch-master-open-items.md`, `docs/launch/launch-closure-tracker.md` — launch readiness tracking.
- `app/PROGRESS.md` — general progress log.
- `docs/launch/code-markers-scan.txt` / `code-markers-summary.txt` — automated scan output (269 hits) of `TODO|FIXME|placeholder|mock|hardcoded|temporary|debug` across the codebase; top offenders: `AssignmentEditor.tsx` (22), `class-settings.tsx` (15), `subjects/route.ts` (12), `grades-tab.tsx` (12). Mostly noise from `mock`/`placeholder`/`debug` keyword matches, not real TODOs — re-run `scripts/scan-launch-markers.mjs` if a clean signal is needed later.

## Completed (2026-06-23)

### Settings redesign mockup (14:30–15:45 UTC)
- Settings page full content rewrite + Help & FAQ / Error Codes split into separate page with right-side sidebar. 
- Mockups: `public/mockups/settings-redesign.html`, `public/mockups/help-faq-error-codes.html`. 
- Approved & merged.

### Error logging/telemetry overhaul (14:30–15:45 UTC)
- Plain-language notifications + error codes (8 predefined + auto-generated unknowns) + central JSONL storage for pattern monitoring.
- New files: `app/lib/error-codes.ts`, `app/lib/error-logger.ts`, `app/api/errors/log/route.ts`, `app/components/ui/app-error-boundary.tsx`, `app/components/support/contact-form.tsx`, `app/api/support/contact/route.ts`, `app/(main)/support/page.tsx`, `docs/ERROR_LOGGING_SYSTEM.md`.
- **Scope clarification (2026-06-23 ~15:30):** No team/admin notifications or external service integrations (Sentry/Slack/email) needed now. System stores logs locally (`.data/errors.jsonl`, `.data/contact-messages.jsonl`) and notifies users only. Team can review via `/api/errors/log/stats` endpoint or direct file inspection. If admin dashboard/team notifications needed later, can be added as follow-up sprint.
- Status: **Complete, pushed to main.**

### Ideas & Feature Requests Board (15:00–16:30 UTC)
- Fully implemented voting system with Supabase backend.
- Database: `ideas_board_schema.sql` with RLS policies + vote constraints.
- API Routes: `app/api/ideas/route.ts`, `app/api/ideas/[id]/vote/route.ts` with proper error handling.
- UI: `app/(main)/ideas/page.tsx` (poll + submit form) + `app/components/ideas-widget.tsx` (compact dashboard widget).
- Optimization: React Context + caching via `app/contexts/IdeasContext.tsx`, `app/components/IdeasProvider.tsx`.
- Commits: `fc7617c`, `96c627a`
- Status: **Complete, pushed to main.**
