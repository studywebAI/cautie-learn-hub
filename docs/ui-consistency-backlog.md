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
- [ ] Remove the standalone "+ Toetsen-hoofdstuk" button — a Toetsen chapter
      should just always exist by default instead of being manually added.
- [ ] Chapter drag-reorder: drop the explicit reorder icon/drag handle: just
      press-and-hold ~3s on a chapter row to enter reorder mode instead.

## Sidebar
- [ ] Active sidebar item background + all sidebar text colors: go a bit
      *darker* (not the blue/gray tint that still shows up sometimes — track
      down and remove remaining instances of that old tint).
- [ ] Replace the round avatar-with-crown-icon at top of sidebar with a
      rectangular bar showing the account name instead of a circle.
- [ ] Notifications and "send message" icons must always stay visible in the
      sidebar (don't let them get cut in any future cleanup).
- [ ] Make "Dashboard customization" actually do something — currently only
      toggles widgets that aren't really used anymore.

## Settings page
- [ ] Move "Requires first" (paragraph prerequisite) out of default paragraph
      creation — make it a setting on the assignment itself (or a specific
      per-paragraph setting), not a default option shown when creating a new
      paragraph.
- [ ] Help & FAQ should be its own dedicated page/tab, not a section inside
      Settings.
- [ ] Remove "General" section from Settings UI *and* its backend entirely —
      unused, and apparently leaking whatever's used for STT (speech-to-text)
      config. Needs investigation before deleting anything backend-side.
- [ ] (Noted for later, not now) Classes will eventually be removed from the
      product entirely — revisit Settings/other areas after that lands.

## i18n
- [ ] Stop hardcoding Dutch (or English) anywhere going forward — everything
      built from now on must read the language from Settings and render in
      that language, not be hardcoded.

## Assignment editor (Workspace tab)
- [ ] AI chatbox should have access to the current assignment's content, and
      to previous paragraphs'/chapters' content *only when explicitly asked*
      (not by default).
- [ ] Remove the template gallery entirely — "ze doen niks" (they don't do
      anything / aren't useful).
- [ ] Reorganize Workspace layout: automation-related stuff toward the
      bottom, blocks list centered/main area, with a thin divider line
      between block rows instead of plain white with no border.

## Backend/infra
- [ ] Investigate what's leaking through the Settings "General" section
      related to STT before removing it (see above).

---
*This file exists purely as a shared checklist — safe to delete once everything
above is done or reprioritized.*
