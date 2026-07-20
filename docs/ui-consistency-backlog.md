# UI/UX backlog — from 2026-07-16 mega-message

Not started unless marked `[x]`. Working through in order once the
critical bug (below) is resolved, unless told otherwise.

## Critical — blocking, needs evidence first
- [ ] File/media upload broken ("kan geen files uploaden of andere media")
- [ ] "Changes could not be saved to server" appearing constantly
- [ ] Sidebar collapse animation / general animations "fucking laggy"

## Navigation / topbar
- [x] Chapter and paragraph detail pages had their own ad-hoc "Subjects /
      Chapter / Paragraph" breadcrumb text + tiny "<- back" link sitting
      above PageHeader instead of feeding into it. Folded into
      PageHeader's title/subtitle/actions, scoped only to those two pages
      (Grades detail already had an equivalent path-style subtitle).
- [x] Subject/chapter/paragraph navigation: replaced the tiny plain-text
      back links with real back buttons in the topbar, consistent font
      sizing via PageHeader.
- [x] Chapter cover icons: each chapter now gets a distinct icon + tint
      (rotating set, keyed by chapter number) instead of a blank gray box;
      Toetsen chapter always gets a fixed checklist icon.
- [x] Remove the standalone "+ Toetsen-hoofdstuk" button — a Toetsen chapter
      now always exists by default (auto-created on subject creation, and
      self-healed in for existing subjects on next chapter-list fetch).
- [x] Chapter drag-reorder: replaced the always-visible GripVertical handle
      with a ~3s press-and-hold on the chapter row that enters a reorder
      mode (up/down arrows per chapter, "Done" to exit).

## Sidebar
- [x] Active sidebar item background + all sidebar text colors: darkened;
      removed a stray blue hue (220) on dark-theme sidebar-foreground that
      didn't match the light theme's neutral gray.
- [x] Replace the round avatar-with-crown-icon at top of sidebar with a
      rectangular bar showing the account name instead of a circle.
- [x] Notifications icon (bell) moved from dashboard-only into the persistent
      topbar so it's always visible everywhere, not just on "/". "Send
      message" stays page-scoped (teacher dashboard) since it needs a
      classId — no single global class context to hang it on.
- [x] "Dashboard customization" now also gates Today's Plan, Recent Grades
      (student) and To Grade (teacher) — previously always-on and outside
      the customize menu entirely, while the menu only covered a narrower,
      partly-stale widget set.

## Settings page
- [x] Move "Requires first" (paragraph prerequisite) out of default paragraph
      creation — now set afterward via a settings icon on each paragraph row
      (teacher only), backed by a new PATCH /paragraphs/[paragraphId].
- [x] Help & FAQ is now its own dedicated page at /help.
- [x] "General" section removed from Settings UI. Investigated first: STT
      strategy is real, consumed by /api/tools/transcribe — not dead code or
      a leak — so instead of deleting the backend, region/schooling moved
      into Personalization and AI/STT controls moved into Account under an
      "Advanced" subsection.
- [ ] (Noted for later, not now) Classes will eventually be removed from the
      product entirely — revisit Settings/other areas after that lands.

## i18n
- [ ] Stop hardcoding Dutch (or English) anywhere going forward — everything
      built from now on must read the language from Settings and render in
      that language, not be hardcoded. (Ongoing discipline, not a one-time
      fix — new code added this session follows the isDutch/tr() pattern.)

## Assignment editor (Workspace tab)
- [x] AI chatbox already only saw the current assignment's own content by
      default. Added an explicit, off-by-default "Also use previous
      paragraphs/chapters" checkbox for the opt-in case. Later renamed to
      "Memory enabled" (2026-07-20) — clearer label for the same toggle.
- [ ] **Later: gate "Memory enabled" behind premium.** (2026-07-20) Currently
      free/unlimited for everyone. When a premium tier exists, this toggle
      should require it — needs a paywall/upsell state on the checkbox
      itself, not just a silent capability check.
- [x] Removed the template gallery ("Add template" preset-block picker) from
      the Workspace tab. The separate at-creation preset picker in
      create/edit-assignment-dialog is a different flow and untouched.
- [x] Reorganized Workspace layout: Blocks palette + per-block settings now
      come first in the right rail, AI-assist/copy-from moved to the bottom.
      Main canvas rows are centered (max-w-3xl) with a thin border-b divider
      between rows instead of plain spacing.

## Backend/infra
- [x] Investigated the Settings "General" section — see Settings page section
      above, not a leak.
- [x] Investigated the critical upload/save-failure bugs (2026-07-17 logs):
      `supabase migration list --linked` shows 16 local migrations missing
      from remote's history (ideas board, studyset/calendar features,
      scheduled_study_items, subjects archive/folders/prerequisites, etc.) —
      explains the `/api/scheduled-items/check` 500 and probably the
      paragraph-prerequisite feature not persisting. Separately, no migration
      anywhere creates the `content-uploads` storage bucket `/api/upload`
      writes to, and `supabase storage ls --linked` returns zero buckets on
      the linked project — direct cause of every "Upload failed" toast.
      Bundled both into `supabase/RUN_ME_pending_migrations.sql` for manual
      review/run (did not touch production directly). Also stopped
      `/api/upload` from swallowing the real Supabase error message.
- [ ] There was also a `PUT .../blocks/[blockId]` 403 ("Block does not
      belong to this assignment") in the same log capture — separate from
      the migration/bucket issue, possibly a stale block-id race during
      autosave right after a block is created. Not yet root-caused; revisit
      once the migration bundle is applied and see if it still reproduces.

## Future: classes → subjects/groups restructuring (not started, big)
2026-07-17 braindump, verbatim intent — classes will eventually be removed
as a first-class concept. The direction: a teacher creates a *subject*,
students join it, and that becomes the group (no separate "class" object).
Everything currently keyed off `class_id` (subjects, agenda items, etc.)
needs to move onto the new subject-as-group model. Class-related UI will
mostly get reorganized into tabs on the subject, but that's later.
Specific tab-by-tab plan as described:
- **Attendance**: becomes its own tab, ordered under Grades and above
  Analytics.
- **Messenger**: removed entirely — teachers can still message students
  (existing targeted-message system), but "we are not a messaging platform,
  we're a study platform."
- **Schedule & Calendar**: merge into Agenda. Agenda gets a "Configure"
  button for setting up the school schedule. "Calendar" is currently a
  placeholder tab that (as far as known) does nothing — verify before
  removing, but it's slated to merge into Agenda too.
- **Logs**: move under Help & FAQ as "My logs".
- **Help & FAQ**: full redesign into three parts:
  1. *Reach us* — a message box to leave a message (later: email/phone and
     an AI chatbot).
  2. *Help & FAQ* — categories + a smart search that matches on associated
     concepts, not just literal words (e.g. "wifi" surfacing a connectivity
     article). Articles list concrete issues, each with its own fix
     explanation in a dedicated paragraph when clicked. Also needs the
     usual how-to articles (e.g. "how do I create a class") that aren't
     issue/fix format, just a guide.
  3. *My logs* (moved from its current tab, see above).
  User offered: if I build this article-heavy structure, a cheaper model
  could be used for generating the step-by-step "how to fix" content later
  to save tokens versus a more expensive model.
- **Class selector dropdown**: flagged as broken across the board (design,
  color usage, overlap, too many classes shown, wrong classes) — but the
  real fix is replacing it with a subject/group picker once the above
  migration happens, not a cosmetic patch on the current classes model.

---
*This file exists purely as a shared checklist — safe to delete once everything
above is done or reprioritized.*
