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
- [ ] Make "Dashboard customization" actually do something — currently only
      toggles widgets that aren't really used anymore.

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
      paragraphs/chapters" checkbox for the opt-in case.
- [x] Removed the template gallery ("Add template" preset-block picker) from
      the Workspace tab. The separate at-creation preset picker in
      create/edit-assignment-dialog is a different flow and untouched.
- [x] Reorganized Workspace layout: Blocks palette + per-block settings now
      come first in the right rail, AI-assist/copy-from moved to the bottom.
      Main canvas rows are centered (max-w-3xl) with a thin border-b divider
      between rows instead of plain spacing.

## Backend/infra
- [ ] Investigate what's leaking through the Settings "General" section
      related to STT before removing it (see above).

---
*This file exists purely as a shared checklist — safe to delete once everything
above is done or reprioritized.*
