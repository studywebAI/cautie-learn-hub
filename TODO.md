# TODO

Living dump of everything in the repo tagged as "do later" — real `TODO`/`FIXME` code comments, plus open decisions sitting in other checklist/backlog docs. Append here whenever something new gets deferred instead of done now.

## Quick reminders from user (2026-06-22, unprocessed — revisit and clarify)

- Login settings (separate from Account/Security?) — not yet scoped.
- Voting — likely Ideas Board voting flow, see `docs/unapplied-future-things.md` §2.
- Quiz & Flashcards — something planned for "overmorgen" (day after tomorrow).
- Notes — flagged, not yet scoped.

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

## Completed (2026-06-23, 15:00–16:30)

### Ideas & Feature Requests Board — DONE ✅

Fully implemented voting system with Supabase backend:

**Database (2026-06-23 15:05):**
- `ideas_board_schema.sql` — PostgreSQL schema with ideas + votes tables
- RLS policies for secure user-owned votes
- UNIQUE constraint prevents duplicate votes per user per idea
- Indexes for performance

**API Routes (2026-06-23 15:15):**
- `app/api/ideas/route.ts` — GET (list active ideas with vote counts) + POST (create new idea)
- `app/api/ideas/[id]/vote/route.ts` — GET (check if user voted) + POST (cast vote)
- Proper error handling (409 Conflict on duplicate vote, 401 Unauthorized)

**UI Components (2026-06-23 15:20):**
- `app/(main)/ideas/page.tsx` — Full Ideas Board page with:
  - Poll section: 3-4 top ideas with progress bars
  - Submit form: title + description inputs
  - "We already implemented" section for completed ideas (status: 'completed')
- `app/components/ideas-widget.tsx` — Compact dashboard widget:
  - Top 2 ideas with vote percentages
  - Quick submit input for fast idea entry
  - "Go to ideas board →" link

**Optimization (2026-06-23 16:00):**
- `app/contexts/IdeasContext.tsx` — React Context for shared data
- `app/components/IdeasProvider.tsx` — Server component wrapper with caching
- Both page & widget now use `useIdeas()` hook → **single API call, no duplicates**
- Refactored layout to wrap with IdeasProviderWrapper

**Commits:**
1. `fc7617c` — Implement Ideas & Feature Requests board with Supabase (2026-06-23 15:35)
2. `96c627a` — Refactor Ideas Board to use shared context (2026-06-23 16:05)

## In-progress (this session)

- Settings page full content rewrite + Help & FAQ / Error Codes split into a separate page with right-side sidebar — mockups built (`public/mockups/settings-redesign.html`, `public/mockups/help-faq-error-codes.html`), under user review now.
- Error logging/telemetry overhaul (plain-language notifications + error codes + central storage for pattern monitoring) and the support-contact-with-auto-attached-error-code pipeline — scoped for after mockup approval, not started.
