# Launch Master Open Items

Last updated: 2026-04-19
Source: Full chat backlog + repository marker scan
Goal: Complete all non-placeholder launch blockers to a production standard.

## Status
- Phase 1 (Stability): Completed
- Remaining: Phases 2-8

## A. Agenda System (Phase 2)
- [ ] Rebuild teacher agenda layout per requested structure (clean top actions, no legacy boxes, consistent spacing)
- [ ] Remove remaining unnecessary helper text/legacy cards in agenda
- [ ] Days must be white and visually consistent across themes
- [ ] Replace boxy event items with slimmer row/card style
- [ ] Restore left color bar per event type (homework/test/big test/other)
- [ ] Event types reduced and normalized: homework, test, big test, other
- [ ] Remove event type badge block in detail pane (keep cleaner semantic layout)
- [ ] Right-side selected-item panel: single coherent block layout
- [ ] Replace back-to-agenda text button with simple close (X)
- [ ] Add teacher edit mode for selected item (edit/delete/hide resources)
- [ ] Resource links in item should route directly and feel instant
- [ ] Week header controls: proper prev/next placement, no border-heavy containers
- [ ] Week day labels full names (Thursday etc.), date number styled subtly
- [ ] Remove class dropdown duplication when class selector already present in top row
- [ ] Subject picker redesign:
  - [ ] open overlay of subjects
  - [ ] then chapter
  - [ ] then paragraph
  - [ ] then assignment
  - [ ] allow add at each level
  - [ ] allow multiple selections
- [ ] Recents selection behavior in agenda source picker:
  - [ ] select closes menu
  - [ ] stays selected
  - [ ] multiple selection supported
- [ ] Remove stale success toasts for chapter/paragraph creation where user asked to avoid noise
- [ ] Reduce creation delay UX: immediate visual insertion with backend sync

## B. Group / Attendance / Logs (Phase 2 continuation)
- [ ] Keep student list as vertical bars (not cards), with clean compact signals
- [ ] Keep quick actions on row: add event, add note, more
- [ ] Student panel as control hub with real navigations:
  - [ ] Grades
  - [ ] Subjects
  - [ ] Completion
  - [ ] Attendance
  - [ ] Files
  - [ ] Notes
  - [ ] Assign Homework
- [ ] Ensure each panel action opens truly functional target page (no visual stale content)
- [ ] Attendance custom event workflow fully polished (custom message replacing phone-related option)
- [ ] Student-specific recent activities populated from attendance/events/notes
- [ ] Logs tab supports strict per-student filtering and deep-linking from group panel
- [ ] Teacher-centric metrics/content in tabs (remove low-value placeholders)

## C. Class Tabs + Class Management UX
- [ ] Final audit of class tabs to ensure only required tabs are visible and all are functional
- [ ] Remove legacy/obsolete tabs and old pathways completely
- [ ] New class creation overlay final polish:
  - [ ] consistent site typography
  - [ ] no old font remnants
  - [ ] loading/progress state while creating
  - [ ] no class-not-found flash
  - [ ] no redirect to deleted pages

## D. Setup / Onboarding Completion
- [ ] Dynamic heading text must reflect exact current step (language/role/auth/appearance/display name)
- [ ] Auto-next on select for all selection steps
- [ ] Option boxes visible across all themes with consistent contrast
- [ ] Auth controls shown only on auth step
- [ ] RTL language animation direction verified globally for setup transitions
- [ ] Guest display name should always show if entered (no "..." fallback)

## E. Recents + Integrations Behavior
- [ ] Recents should be default visible section (not hidden under "other")
- [ ] Clarify and enforce recents source model (local app recents vs Microsoft recents)
- [ ] Prevent Microsoft not-connected errors from surfacing when recents should not depend on Microsoft
- [ ] Remove obsolete Microsoft dependency from flows where not intended
- [ ] Keep Microsoft picker auth fully inside picker UX (no disruptive new-tab flow), if technically possible in current auth model
- [ ] Microsoft picker visual redesign to clean app style (minimal, theme-consistent)

## F. Tools + Link Ingestion (Phase 3)
- [ ] Fix link flow that infinite-loads
- [ ] Fix false duplicate detection message and remove that legacy message style
- [ ] Pre-extract links before generation flow where architecture allows (single run orchestration)
- [ ] Implement source-type aware extraction strategy:
  - [ ] YouTube captions/transcript handling
  - [ ] Random article extraction handling
- [ ] Verify flashcards/multiple-choice mode functionality
- [ ] Study mode correctness: remove quiz-like behavior from classic flashcard mode
- [ ] Add dedicated multiple-choice flashcard mode UI behavior requested

## G. AI Provider Failover + Security (Phase 4)
- [ ] Auto failover Gemini -> OpenAI based on error class
- [ ] Persist provider error logs in secure table/path
- [ ] Add user settings for provider + API key
- [ ] Keep secure default platform key path
- [ ] Ensure user keys are user-scoped and unreadable by admins/app operators in normal flows
- [ ] Token/max context switching behavior across providers

## H. Settings / IA / Sidebar / Role UX (Phase 5)
- [ ] Full-page settings redesign with return button and full-height layout
- [ ] Personalization tab at top, general below
- [ ] Move language into personalization
- [ ] Remove accessibility tab
- [ ] Subscription tab simplified to upgrade CTA
- [ ] Remove integrations section if disabled
- [ ] Remove community tab for now
- [ ] Student sidebar:
  - [ ] remove top-level school/tools buttons where requested
  - [ ] stack required items directly in sidebar

## I. Theme & Visual System (Phase 6)
- [ ] Enforce primary/secondary usage rules across components
- [ ] Remove outlines where requested (especially agenda and related controls)
- [ ] Replace border-heavy layout with spacing/background separation
- [ ] Sand dune theme cleanup: remove orange accents and rename to sand
- [ ] Audit button/background color consistency across whole site
- [ ] Produce snapshot of current colors and post-change colors for revertability

## J. Translation Completeness
- [ ] Ensure all non-user-generated UI strings are dictionary-based
- [ ] Remove remaining hardcoded English in pages/components/notifications
- [ ] Ensure language switch applies consistently without mixed-language remnants

## K. Assignment System Full Completion (Phase 7)
- [ ] Implement full assignment-level settings requested (time, attempts, access, feedback, grading, anti-cheat, autosave/resume/instructions)
- [ ] Implement full block-level settings requested per type (open, MCQ, numeric, matching, media)
- [ ] Implement advanced features where approved for initial launch scope:
  - [ ] question pools
  - [ ] analytics per question
  - [ ] review mode
  - [ ] adaptive logic (if included in launch scope)
- [ ] Ensure all data is real server-backed (no placeholder metrics)

## L. SQL / Data / Migrations (Phase 8)
- [ ] Consolidate all required migrations into clean idempotent files
- [x] Exclude old emergency/debug/temporary SQL from launch runbook
- [x] Produce exact ordered SQL run-list for launch environment
- [x] Add verification checklist per migration and per feature area

## M. Repository Marker Findings (action required)
- [ ] Review and clean files flagged in docs/launch/code-markers-scan.txt
- [x] Highest-priority flagged areas:
  - [x] root-level SQL files containing temporary/debug RLS logic
  - [x] placeholder mentions in dictionaries and UI text
  - [x] tool placeholder examples in app/lib/tools/source-placeholder-examples.ts
  - [x] docs/spec files still describing placeholder/prototype behavior

## Notes
- This file is the execution source of truth for remaining launch work.
- No item is considered complete until UI + API + persistence + validation are done.


