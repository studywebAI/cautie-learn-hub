# UI/UX backlog — from 2026-07-16 mega-message

Not started unless marked `[x]`. Working through in order once the
critical bug (below) is resolved, unless told otherwise.

## Critical — blocking, needs evidence first
- [ ] File/media upload broken ("kan geen files uploaden of andere media")
- [ ] "Changes could not be saved to server" appearing constantly
- [ ] Sidebar collapse animation / general animations "fucking laggy"

## Navigation / topbar
- [ ] Breadcrumb path ("Subjects / watsubject / Chapters") should only show on
      Subjects-tree pages (subject → chapter) — and separately on Grades/Agenda
      item detail pages. Not everywhere.
- [ ] Subject/chapter/paragraph page navigation is unclear — inconsistent fonts/
      sizes, "back" link is tiny plain text instead of using the topbar
      consistently with a title/path.
- [ ] Chapter page inside a subject: default cover icons for chapters 1/2/3/4
      etc. instead of a blank gray box — reuse whatever "clear icon" pattern
      exists elsewhere.
- [x] Remove the standalone "+ Toetsen-hoofdstuk" button — a Toetsen chapter
      now always exists by default (auto-created on subject creation, and
      self-healed in for existing subjects on next chapter-list fetch).
- [ ] Chapter drag-reorder: drop the explicit reorder icon/drag handle: just
      press-and-hold ~3s on a chapter row to enter reorder mode instead.

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
- [ ] Reorganize Workspace layout: automation-related stuff toward the
      bottom, blocks list centered/main area, with a thin divider line
      between block rows instead of plain white with no border.

## Backend/infra
- [ ] Investigate what's leaking through the Settings "General" section
      related to STT before removing it (see above).

---
*This file exists purely as a shared checklist — safe to delete once everything
above is done or reprioritized.*
