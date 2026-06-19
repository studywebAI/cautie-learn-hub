# Studyset — Feature Checklist (real implementation, not mockups)

Single source of truth for what gets built into the **real** flow at
`app/(main)/tools/studyset/**`, matching the existing theme (surface
tokens, `#6b7c4e` brand green, lucide icons, `PageSection`, `CARD`/
`SECTION_HEADING` patterns — colors/theme never change per page).

Legend: `[x]` done & shipped · `[~]` partially there, needs work · `[ ]` to build

---

## PAGE 1 — Studyset home / dashboard (`/tools/studyset`)

- [x] List of created studysets (real API via `/api/studysets`)
- [x] Split list into **Active** (prominent) and **Archived** (collapsible, muted, behind a toggle) — shipped
- [x] **"Today" block**: every task due today across *all* studysets in one list,
      color-coded per studyset (left border + icon chip in the studyset's color),
      progress bar, "X tasks left today", Start button + analytics shortcut — shipped
- [x] "New studyset" entry point
- [x] Empty state (on-theme)

## PAGE 2 — Create flow (wizard inside `/tools/studyset`)

Restructured this round into **4 steps**: Basics (incl. agenda/curriculum link) →
Calendar → Sources → Tools. The user explicitly pushed back on the first cut (the
3-option chooser felt "thrown into" the Sources step) and asked for: title-then-agenda
up front, a clean quiz-style input step, and a real tools+question-types step — so the
wizard was reordered to match that shape exactly, on real data throughout:

- [x] Step 1 — **Basics**: name, then **link to your agenda or curriculum** (moved
      up front, right under the name field — exactly "first title, then agenda"):
  - [x] **From your agenda** (`AgendaTemplatePicker`, real `/api/agenda/feed`): shows
        the user's actual upcoming tests/assignments (title, class, subject, due date)
        — picking one seeds focus notes AND carries the real subject + exam date onto
        the studyset itself (`subject`/`exam_date` columns, not just `source_bundle`)
  - [x] **Pick a subject & chapter** (`SubjectTopicPicker`, real `/api/subjects` →
        `.../chapters` → `.../paragraphs`): cascading picker with optional multi-select
        paragraphs (max 6); seeds focus notes like "Focus on Biology → Chapter 4: Cell
        division. Specifically: §2 Mitosis, §3 Meiosis."
  - [x] **Just my own materials**: explicit "skip this, I'll add things in Sources"
        choice — keeps the picker honest about what happens next instead of overlapping
        with the upload step
  - [x] A persistent "Linked to: …" chip (with Remove) shows the active link right
        where it was set — so the connection between "this is for Friday's test" and
        "here are my notes" stays visible without cluttering later steps
  - *Note: still no deep content-extraction from assignments/blocks — that data is
    question/exercise content, not lecture material, so seeding real subject/chapter/
    paragraph context (which the AI can genuinely act on) remains the honest choice.*
  - then icon/color (unchanged)
- [x] Step 2 — **Calendar**: pick study days, unchanged (never times — pace is personal)
- [x] Step 3 — **Sources**: cleaned back down to a focused, quiz-style input step —
      notes / paste / file upload / OneDrive, with a one-line "we filled in notes from
      {link}" hint instead of a chooser block competing for space
- [x] Step 4 — **Tools** (NEW — the deferred "tool mindmap" step, now real):
  - [x] Tool-mix picker (`TOOL_DEFINITIONS`): Notes / Flashcards / Quiz / Concept map,
        using the *exact same icons & labels* the plan view already uses (`toolMeta` on
        the detail page: quiz=Brain, flashcards=Layers, wordweb=Map, notes=FileText) so
        a pick here looks identical to seeing it later in the actual plan
  - [x] **Quiz question types**: appears only once Quiz is in the mix — Multiple Choice /
        True-False / Fill-in-the-Blank / Short Answer / Matching / Cloze (a curated subset
        of the quiz tool's own `QUIZ_TYPE_DEFINITIONS`, scaled to what a mixed plan needs)
  - [x] **Genuinely wired to generation, not cosmetic**: picks are compiled into a plain-
        language instruction ("Lean the day-by-day mix toward: Quiz, Flashcards… Whenever
        a day includes a quiz, favor: Multiple Choice, True/False…") sent as `tool_notes`
        to `POST /api/studysets/[id]/generate`, which folds it into the planner prompt's
        `additionalNotes` — the AI actually reads and biases toward these picks. Also
        persisted at `source_bundle.preferences` and re-derived on the server
        (`composeToolNotesFromPreferences`) so a future regenerate still honors them.
- [x] Step: **Generate** — `createStudyset()` calls `POST /api/studysets/[id]/generate`
      right after creation, now carrying the real tool/question-type preferences above
- [x] After generation → redirects into the dashboard / detail page showing the new studyset

## PAGE 3 — Studyset detail (`/tools/studyset/[studysetId]`)

- [x] Readiness ring, sessions done, weak topics stat boxes
- [x] Exam countdown
- [x] AI brief banner (real adaptive-engine data) — shipped this session
- [x] AI recommendations list w/ Start + Apply/Dismiss (real `studyset_intervention_queue`) — shipped this session
- [x] Today's plan + full roadmap (today/full toggle)
- [x] Performance chart (score trend)
- [x] Materials panel (sources, select/exclude)
- [x] Share popover + delete dialog
- [x] **"Changes" entry point**: history icon in the header now links to the new
      `/tools/studyset/[id]/changes` page — shipped this session
- [x] Settings entry point — gear icon in the header now links to the new settings page — shipped
- [x] **Bug fix**: delete button called `DELETE /api/studysets/[id]` which 405'd (the handler lived
      at the wrong path `/api/studysets/[id]/DELETE/route.ts` and used a non-existent `owner_id`
      column). Moved a correct `DELETE` (+ added `PATCH`) onto the right route using `user_id` — shipped

## PAGE 4 — Analytics (`/tools/studyset/[studysetId]/analytics`)

- [x] Score trend chart, mastery topics, completion stats (real, on-theme)
- [ ] Streaks + achievements
- [ ] Error/mistake overview (your specific misses)
- [ ] Activity heatmap/calendar
- [ ] Goal setting (per day/week)
- [ ] "Why we show you this" explanations tied to AI recommendations/changes

## PAGE 5 — Settings / edit a studyset (`/tools/studyset/[id]/settings`) — shipped (foundation)

Real page, real persistence, on-theme. Built this round:

- [x] Rename, re-icon, re-color (writes to `source_bundle.meta` via new `PATCH /api/studysets/[id]`)
- [x] Change study days/calendar (writes to `source_bundle.schedule.selected_dates`, recomputes `target_days`)
- [x] Study preferences: shuffle order, daily reminders, daily task cap, pin-to-top
      (new `studyset_user_preferences` table + migration `20260607_studyset_user_preferences.sql`,
      rewired the broken `[id]/preferences` route from `owner_id`→`user_id` to a clean GET/PATCH)
- [x] Organization: folder field (persists via preferences; tags column ready for a future tag UI)
- [x] Status: archive / restore toggle (PATCH `status`)
- [x] Danger zone: delete (soft-archive) with confirmation dialog — reuses the fixed DELETE endpoint
- [ ] **Sources**: select/exclude per source, focus-on-part — *still lives on the studyset detail
      page via `MaterialsPanel`; settings page links out to it rather than duplicating it*
- [ ] **Grounding**: "only my sources" toggle, citations, confidence indicator, cross-source check
- [ ] **Output control**: depth, difficulty, item count, output language, tone/mode,
      sub-topic focus, audience/level, examples on/off, formality
- [ ] **SRS**: algorithm choice, custom/filtered study, exam mode, Leitner, reset progress
- [ ] Tags (column exists in the new preferences table; needs a chip-input UI)
- [ ] **Export**: Anki/AnkiConnect, Quizlet/CSV/PDF/print, Markdown/Notion/Docs, embed, calendar sync
- [ ] **Accessibility**: TTS/audio overview, dark mode, text size, dyslexia font, offline mode

## PAGE 6 — Changes / history (`/tools/studyset/[id]/changes`) — shipped (foundation)

Real page, real data, on-theme. Built this round:

- [x] Manual change log: queries the real `audit_logs` table (already written to by the
      `studyset_created`/`studyset_updated`/`studyset_archived` audit entries from the
      create/PATCH/DELETE handlers), rendered as human text — "Renamed from X to Y",
      "Study days changed from N to M days", "Archived this studyset", etc.
      Enriched the `PATCH /api/studysets/[id]` handler to log a field-level `changes`
      diff (`{ field: { from, to } }`) instead of just a list of touched field names,
      so the log can describe *exactly* what moved.
- [x] AI-driven auto-optimization log: every `studyset_intervention_queue` row (pending,
      applied/"done" and dismissed) shown with its `kind` (focus/retry/challenge — same
      `recommendationMeta` styling as the detail page) and its `reason` under "Why:" —
      this is the AI explanation trail the user explicitly asked for
- [x] Apply / reject pending AI suggestions inline — reuses the existing
      `PATCH /api/studysets/interventions/[id]` endpoint and the same icon-button pattern
      as the detail page's recommendation list
- [x] New `GET /api/studysets/[id]/changes` route merges both real sources into one
      chronological timeline (manual entries tagged "You", AI entries tagged "Cautie AI")
- [ ] Rollback to a previous version — *not built; would need versioned snapshots of
      `source_bundle`/plan, which is a bigger structural change than "small steps" allows
      for now. Left as a future gap.*

---

## Cross-cutting feature categories (apply to studyset AND other tools where applicable)

> Each category below lists what the user explicitly asked for. Items already covered by the
> real backend/UI (studyset or shared) are marked `[x]`; gaps are `[ ]`.

### Source / upload
- [x] Multiple formats handled by extract-text (PDF, Word, images, text…)
- [x] Multiple sources per project, select/exclude (Materials panel)
- [ ] Live recording + transcription (lecture capture in-app)
- [ ] Focus-on-part (specific chapter/page range)
- [ ] OCR for photos/scans/handwriting (beyond plain text extraction)
- [ ] Drag & drop + bulk upload UX polish
- [ ] Auto source-finder (tool suggests relevant sources)
- [ ] Source-language auto-detection

### Grounding / accuracy
- [ ] "Only my sources" toggle (no outside knowledge)
- [ ] Clickable citations back to exact sentence/page
- [ ] Regenerate a single item (not the whole set)
- [ ] Flag / verify dubious output
- [ ] Confidence indicator
- [ ] Cross-source contradiction check

### Output control
- [ ] Depth/length, difficulty, item count, output language, tone/mode,
      sub-topic focus, audience/level, examples on/off, formality — as **reusable settings**
      surfaced consistently in studyset AND other tools (quiz/flashcards/notes/etc.)

### Editing / ownership
- [x] Edit/complete plan tasks (toggle done)
- [ ] Edit each generated item directly (card/question/note line)
- [ ] Add own items manually alongside AI ones
- [ ] Delete/reorder/split/merge items
- [ ] Multimedia in items (image/audio/LaTeX), image occlusion
- [ ] Version history / undo, bulk-edit

### Spaced repetition / studying
- [~] Adaptive plan generation + daily tasks exist
- [ ] SRS Again/Hard/Good/Easy review flow
- [ ] Daily new+review cap as a user setting
- [ ] Custom/filtered study (tag, difficulty, interval, leeches)
- [ ] Exam/test mode (timed, final score)
- [ ] Leitner/shuffle ordering, reminders/scheduling, reset progress

### Organization
- [ ] Folders + tags
- [ ] Cross-studyset search
- [ ] Projects/notebooks per course
- [ ] Favorites/pin
- [ ] Filters & sort (date, type, status)
- [ ] Archive (ties into PAGE 1 active/archived split)

### Export / integration
- [ ] Anki (+AnkiConnect), Quizlet/CSV/PDF/print, Markdown/Notion/Google Docs
- [ ] Shareable link/embed (share page exists — embed doesn't)
- [ ] Calendar sync for review moments

### Sharing / collaboration
- [x] Public/private share link (exists)
- [ ] Real-time collaboration (study groups)
- [ ] Copy/fork someone else's set
- [ ] View vs. edit permissions
- [ ] Community library / public set search

### Progress / analytics
- [x] Score trend, completion %, mastery topics (exists)
- [ ] Streaks + achievements
- [ ] Mistake overview
- [ ] Activity heatmap/calendar
- [ ] Goal setting

### Accessibility / personalization
- [ ] Text-to-speech / audio overview
- [ ] Own-pace mode (ADHD/dyslexia friendly)
- [ ] Dark mode, text size, dyslexia font
- [ ] Ad-free, keyboard shortcuts, offline mode

### Account / system
- [x] Cross-platform via web (Supabase-backed, syncs)
- [ ] Clear/transparent source & upload limits
- [ ] Usable free tier messaging
- [ ] Privacy/FERPA messaging
- [x] Auto-save + cloud backup (Supabase)
- [ ] Multi-language interface

---

## PAGE 7 — Discovery: finding studysets elsewhere

- [ ] Agenda: create a studyset directly from a toets (linked chapter/paragraphs → class template)
- [ ] Agenda: filters/folders surfacing studysets
- [ ] Recents: folder view + filters for studysets
- [ ] Dashboard: "Homework" + "To study" blocks (auto-populated from studyset plans, scheduled into agenda)

---

## Build order (small, verifiable steps — no mid-task updates per request)

1. ~~AI brief + AI recommendations on detail page~~ ✅ shipped
2. ~~Dashboard: Active/Archived split + color-coded "Today" block (PAGE 1)~~ ✅ shipped
3. ~~Settings/edit page for a studyset (PAGE 5 — foundation for everything else editable)~~ ✅ shipped
   — also fixed a real bug along the way: the delete button 405'd because its handler lived at
   `/api/studysets/[id]/DELETE/route.ts` (wrong path, wrong `owner_id` column); moved it onto a
   proper `DELETE`/`PATCH` pair on `/api/studysets/[id]/route.ts`. Also removed ~10 fully orphaned,
   broken WIP files (dead wizard components under `components/studyset/{steps,workflow-selector.tsx,
   studyset-creator-redesigned.tsx}` and dead/broken routes `[id]/agenda`, `[id]/settings`,
   `[id]/generate-workflow`, `optimize`, `runtime-health`, `import`, `workflow` — all unused,
   all referencing a non-existent `owner_id` column) so the codebase only contains the one real flow.
4. ~~Changes/history page, wired to the real intervention queue + real audit-log change history (PAGE 6)~~ ✅ shipped
   — new `/tools/studyset/[id]/changes` page + `GET /api/studysets/[id]/changes` route blending
   `audit_logs` (manual edits, now with field-level `{from,to}` diffs) and
   `studyset_intervention_queue` (AI suggestions incl. apply/dismiss) into one on-theme timeline;
   added a "Changes" header button (History icon) next to Analytics/Settings on the detail page.
5. ~~Create-flow restructure: agenda link, sources, and a real Tools step (PAGE 2)~~ ✅ shipped
   — First pass added the agenda/subject pickers as a chooser bolted onto the Sources
   step; user feedback was that it "felt thrown in" and described the shape they
   actually wanted: *title → agenda, then a clean quiz-style input step, then a
   dedicated tools+question-types step*. Reworked the wizard to exactly that 4-step
   shape — **Basics → Calendar → Sources → Tools**:
   - Moved the agenda/curriculum chooser (`AgendaTemplatePicker` + `SubjectTopicPicker`,
     real `/api/agenda/feed` and `/api/subjects` data) up into **Basics**, directly under
     the name field — "first title, then agenda" — and renamed its third option to
     "Just my own materials" so it reads as a starting-point choice, not an action.
   - Stripped the **Sources** step back down to a focused notes/paste/upload/OneDrive
     flow (the chooser no longer competes for space there) — much closer to quiz's
     clean, single-purpose input phase.
   - Built the previously-deferred **Tools step** for real: a tool-mindmap picker
     (`TOOL_DEFINITIONS`, reusing the exact icons/labels the plan view already shows
     via `toolMeta`) plus a **Quiz question-types** picker that appears once Quiz is
     selected (curated subset of the quiz tool's `QUIZ_TYPE_DEFINITIONS`). These picks
     are genuinely wired through — compiled into a `tool_notes` instruction, sent to
     `POST /api/studysets/[id]/generate`, folded into the planner prompt's
     `additionalNotes` (`generate-studyset-custom-plan.ts` already renders that field),
     AND persisted at `source_bundle.preferences` + re-derived server-side
     (`composeToolNotesFromPreferences`) so a future regenerate keeps honoring them —
     not a cosmetic picker that gets thrown away after submit.
6. Analytics additions: streaks, heatmap, mistakes, goals (PAGE 4)
7. Cross-cutting settings (output control, grounding, SRS, organization, export) surfaced
   consistently in studyset + other tools
