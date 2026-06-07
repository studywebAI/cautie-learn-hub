# Studyset — Complete Implementation Checklist

**Status:** Planning → Implementation
**Owner:** Studyset Module
**Priority:** CRITICAL — this is the central feature of Cautie

---

## 📋 PART 1: DASHBOARD & SIDEBAR (Analytics View)

### Sidebar Analytics
- [ ] **Analytics sidebar** (docenten-stijl, nu ook voor studenten)
  - [ ] Stats cards: totale kaarten, gem. retentie, actieve sets, gearchiveerd
  - [ ] Study streak & achievements
  - [ ] Quick filters & search

### Active/Archived Studysets List
- [ ] **Active Studysets** (prominent)
  - [ ] Card layout: naam, vak, kaarten, retentie%, streak
  - [ ] Hover effects & transitions
  - [ ] Link naar analytics per set
  
- [ ] **Archived Studysets** (minder prominent)
  - [ ] Collapsed/expandable section
  - [ ] Restore option

### Today View (Kleurgecodeerd)
- [ ] **Today Section** (priority)
  - [ ] Kleurgecodeerde borders per studyset (lila, blauw, geel, groen, etc.)
  - [ ] Per item: voortgang-balk + "X/Y kaarten"
  - [ ] "Nog X kaarten" indicator
  - [ ] Quick "Start" button
  - [ ] Link naar analytics
  - [ ] "Klaar!" message als alles done

### Dashboard Blocks
- [ ] **Huiswerk (Homework) block** — taken van andere tools
- [ ] **To Study block** — studysets gepland in agenda
  - [ ] Auto-synced met agenda scheduling

---

## 📝 PART 2: CREATE FLOW — State by State

### State 1: Naam + Calendar
- [ ] **Form fields:**
  - [ ] Naam input (text)
  - [ ] Vak selector (dropdown: Biologie, Frans, Wiskunde, Geschiedenis, etc.)
  - [ ] Studiedagen picker (checkboxes: Ma-Zo)
  - [ ] Examendatum (optional date picker)
  - [ ] Progress bar (State 1/5)

### State 2: Upload (3 Opties)

#### Option A: Agenda-Toets (Class Template)
- [ ] Toets dropdown (van agenda)
- [ ] Auto-linked hoofdstuk/paragrafen
- [ ] Import button

#### Option B: Subject/Hoofdstuk/Paragrafen
- [ ] Vak selector
- [ ] Hoofdstuk multi-select
- [ ] Paragrafen multi-select
- [ ] Preview van geselecteerde stof

#### Option C: Custom Upload
- [ ] **File upload** (PDF, Word, PPT, TXT)
- [ ] **Photo upload** (met OCR-optie)
- [ ] **Link input** (URL, YouTube, share-a-page)
- [ ] **Audio upload** (MP3, WAV, etc.)
- [ ] **Live recording** (microfoon + transcriptie)
- [ ] **Drag & drop** bulk upload
- [ ] **Multiple sources** tegelijk
- [ ] **Source manager:**
  - [ ] Toggle per source (aan/uit)
  - [ ] Focus op deel (hoofdstuk/paginabereik)
  - [ ] Auto language detection

---

## ⚙️ PART 3: State 3 — Settings & Tool Mindmap

### Grounding / Accuraatheid
- [ ] **"Alleen mijn bronnen"** toggle (aan/uit)
- [ ] **Citaties tonen** (toggle)
  - [ ] Klikbare links naar exacte zin/pagina
- [ ] **Confidence indicator** (% zekerheid per item)
- [ ] **Regenereer één item** (niet hele set)
- [ ] **Flag/Verify** (mark twijfelachtige output)
- [ ] **Cross-source check** (tegenstrijdigheden tonen)

### Output-Controle
- [ ] **Diepte/lengte slider** (kort → uitgebreid)
- [ ] **Moeilijkheidsgraad picker** (basis → examen)
- [ ] **Aantal items input** (bijv. "20 kaarten")
- [ ] **Output taal** (los van brontaal)
- [ ] **Toon/Modus selector** (tutor / samenvatting / examen-trainer)
- [ ] **Doelgroep/Niveau** (middelbaar / uni / professioneel)
- [ ] **Voorbeelden toggle** (aan/uit)
- [ ] **Formaliteit slider** (beknopt ↔ uitleggerig)

### Tool Mindmap (NEW!)
- [ ] **Tool selector grid:**
  - [ ] Quiz icon (clickable)
  - [ ] Flashcards icon
  - [ ] Notes icon
  - [ ] Video Summarizer icon
  - [ ] Mind Map icon
  - [ ] Whiteboard icon
  - [ ] + meer tools

- [ ] **Per-tool settings panel:**
  - [ ] When clicking a tool, show its specific settings
  - [ ] **Quiz-specific:**
    - [ ] Question types (MC, open, T/F, matching)
    - [ ] Timed yes/no
    - [ ] Difficulty
  - [ ] **Flashcards-specific:**
    - [ ] Image occlusion yes/no
    - [ ] SRS algorithm (SM-2, lightweight)
  - [ ] **Notes-specific:**
    - [ ] Format (markdown, outline, Cornell)
    - [ ] Length preference
  - [ ] Back to mindmap (not linear)

---

## 🎯 PART 4: State 4 — Generate & Plan

### Generate Step
- [ ] **AI generates plan** based on:
  - [ ] All source material
  - [ ] Settings from State 3
  - [ ] Tool selections
  - [ ] Explicit detailed prompt (rules, quality gates)
  
- [ ] **Output:** Structured plan
  - [ ] List of tasks (Quiz: "Celbiologie 1-10", Flashcard: "Structuren", etc.)
  - [ ] Order & timing
  - [ ] Which tool for which topic
  - [ ] Estimated completion time

### Plan Review & Edit
- [ ] **Plan preview card-based view**
  - [ ] Drag-drop reorder tasks
  - [ ] Edit individual task names
  - [ ] Delete/duplicate tasks
  - [ ] Add manual tasks
  - [ ] Pin priority tasks

---

## 📚 PART 5: Bewerken / Eigenaarschap

### After Creation — Edit Interface
- [ ] **Per-item editing:**
  - [ ] Inline edit (double-click card)
  - [ ] Modal edit (more options)
  - [ ] Delete item
  - [ ] Duplicate item
  - [ ] Split/merge items

- [ ] **Multimedia in items:**
  - [ ] Add images
  - [ ] Add audio
  - [ ] Add formulas (LaTeX)
  - [ ] Image occlusion editor (part of image hidden as study task)

- [ ] **Versiegeschiedenis / Undo:**
  - [ ] Show version history timeline
  - [ ] Restore to previous version
  - [ ] Undo/redo buttons
  - [ ] Compare versions

- [ ] **Bulk operations:**
  - [ ] Select multiple items
  - [ ] Change settings (difficulty, tags, etc.)
  - [ ] Bulk delete
  - [ ] Bulk move to folder

---

## 🔄 PART 6: SRS / Spaced Repetition

### Study Session Interface
- [ ] **SRS buttons:** Again / Hard / Good / Easy
- [ ] **Weak points tracking:**
  - [ ] Items you failed appear more often
  - [ ] Highlight weak topics in list
  - [ ] "Focus on weak points" filter

- [ ] **Day limit:**
  - [ ] New cards/day cap
  - [ ] Review cards/day cap
  - [ ] Progress bar towards today's goal

- [ ] **Custom/Filtered study:**
  - [ ] Filter by tag, difficulty, interval
  - [ ] Study only weak items
  - [ ] Exam mode (timed, no hints)

- [ ] **Reminders & planning:**
  - [ ] Next review date
  - [ ] Daily notifications
  - [ ] Calendar integration

- [ ] **Reset voortgang** option

---

## 📂 PART 7: Organisatie

### Folder/Tag System
- [ ] **Mappen (Folders):**
  - [ ] Create folder
  - [ ] Move studyset to folder
  - [ ] Nested folders
  - [ ] Rename/delete folder

- [ ] **Tags:**
  - [ ] Add tags per studyset
  - [ ] Multi-select tag filter
  - [ ] Tag colors

- [ ] **Search:**
  - [ ] Full-text search
  - [ ] Filter by folder, tag, status
  - [ ] Sort by date, name, retention

- [ ] **Favorieten / Pin:**
  - [ ] Pin to top
  - [ ] Quick access list

- [ ] **Filters & sortering:**
  - [ ] By date, type, retention%, status
  - [ ] A-Z sorting
  - [ ] Recently modified

- [ ] **Archiveren:**
  - [ ] Archive/unarchive toggle
  - [ ] Bulk archive

---

## 📤 PART 8: Export / Integratie

### Export Formats
- [ ] **Anki export** (.apkg format)
- [ ] **AnkiConnect** (direct sync to Anki app)
- [ ] **CSV export** (spreadsheet-compatible)
- [ ] **PDF export** (printable)
- [ ] **Markdown export**
- [ ] **Notion export** (importable to Notion)
- [ ] **Google Docs export**

### Sharing & Integration
- [ ] **Deelbare link** (shareable URL)
- [ ] **Embed link** (for wiki/LMS)
- [ ] **Kalender-sync** (review reminders in agenda)

---

## 🤝 PART 9: Delen / Samenwerken

### Visibility & Sharing
- [ ] **Publiek/Privé toggle**
  - [ ] Private (only me)
  - [ ] Public (anyone with link)
  - [ ] Shared with specific users

### Collaboration
- [ ] **Real-time co-editing:**
  - [ ] Live cursors
  - [ ] Sync edits
  - [ ] Comment/annotation system

- [ ] **Permissions:**
  - [ ] View only
  - [ ] Edit
  - [ ] Owner

### Community & Discovery
- [ ] **Fork/Copy** (make your own version)
- [ ] **Community library browser**
  - [ ] Trending studysets
  - [ ] Filter by subject
  - [ ] Star/like system

---

## 📊 PART 10: Analytics / Voortgang

### Studyset-Level Analytics
- [ ] **Streaks & achievements**
  - [ ] Current streak (🔥 counter)
  - [ ] Longest streak
  - [ ] Badges earned

- [ ] **Statistieken:**
  - [ ] Overall retention %
  - [ ] Accuracy %
  - [ ] Time spent
  - [ ] Cards studied today/week/month
  - [ ] Average response time

- [ ] **Weak point overview:**
  - [ ] List of items with low retention
  - [ ] Most failed items
  - [ ] Items to review today

- [ ] **Heatmap/Kalender:**
  - [ ] Activity per day (heatmap grid)
  - [ ] Streak visualization
  - [ ] Study consistency graph

- [ ] **Doelen (Goals):**
  - [ ] Set daily goal (X cards)
  - [ ] Weekly/monthly goals
  - [ ] Progress towards goals
  - [ ] Celebrate milestones

---

## ♿ PART 11: Accessibility / Personalisatie

### Audio & Accessibility
- [ ] **Text-to-speech:**
  - [ ] Read card aloud
  - [ ] Speed control
  - [ ] Language selection

- [ ] **Dark mode toggle** (system-wide)
- [ ] **Lettergrootte picker** (klein/normaal/groot)
- [ ] **Dyslexie-friendly font option** (OpenDyslexic)

### Usage & Habits
- [ ] **Eigen tempo** (ADHD/dyslexie-vriendelijk)
  - [ ] No time limits (unless exam mode)
  - [ ] Flexible pacing
  - [ ] Pause/resume anytime

### Offline & Keyboard
- [ ] **Offline modus:** Download set, study without internet
- [ ] **Toetsenbord shortcuts:**
  - [ ] Spacebar = show answer
  - [ ] A/H/G/E = Again/Hard/Good/Easy
  - [ ] Cmd+S = save
  - [ ] Cmd+K = search

- [ ] **Ad-free** (no distractions)

---

## 👤 PART 12: Account / Systeem

### Cross-Platform
- [ ] **Desktop/Web/Mobile sync**
  - [ ] Cloud sync (real-time)
  - [ ] Auto-save every 30s
  - [ ] Conflict resolution

- [ ] **Mobiele app** (if applicable)
  - [ ] Same features as web
  - [ ] Offline study
  - [ ] Push notifications

### Transparency & Privacy
- [ ] **Usage limits display:**
  - [ ] Sources/month quota
  - [ ] Exports/month quota
  - [ ] Clear pricing tier

- [ ] **Gratis tier** (generous)
- [ ] **Privacy policy:**
  - [ ] Data NOT used for AI training
  - [ ] FERPA/DUA compliance
  - [ ] Export your data option

- [ ] **Auto-backup** (daily)
- [ ] **Account recovery** (lost password, etc.)
- [ ] **Meerdere talen** (interface language: NL, EN, etc.)

---

## 🎨 PART 13: Multiple Unique Flows (5+ Required)

**Each flow must:**
- ✅ Have UNIQUE layout/journey (not just color change)
- ✅ Contain ALL 11 feature categories
- ✅ Be research-based (inspired by real products)
- ✅ NOT be repetitive
- ✅ Same huisstijl (#6b7c4e, no color variations)
- ✅ Different pages/screens (not single page)
- ✅ Doorklikbaar/interactive between pages

### Flow 1: Linear Wizard (DEFAULT)
- [ ] State 1 → 2 → 3 → 4 → 5 (sequential)
- [ ] Progress bar
- [ ] All features visible per state

### Flow 2: Werkbench/Sidebar
- [ ] Fixed sidebar navigation
- [ ] Canvas main area
- [ ] Click sections in any order
- [ ] Real-time preview
- [ ] Different layout for each section

### Flow 3: Conditional/Questionnaire
- [ ] Question-based routing
- [ ] Answers determine next questions
- [ ] AI auto-config based on answers
- [ ] No traditional "steps"
- [ ] Smart defaults

### Flow 4: Preset + Sliders
- [ ] Pre-built presets (Balanced, Heavy Quiz, Visual, Intensive)
- [ ] Live sliders for each setting
- [ ] Real-time preview of impact
- [ ] Tool ratio visualization

### Flow 5: AI Assessment
- [ ] 5-question diagnostic quiz
- [ ] AI determines level
- [ ] Auto-builds studyset (zero config)
- [ ] Shows reasoning

### Flow 6-7+: Additional Unique Flows (as many as can be built without repetition)

---

## 🔗 PART 14: Making & Finding Studysets

### Finding Studysets
- [ ] **Recents page** (mit-like list)
  - [ ] Folder-view
  - [ ] Filters (vak, status, date)
  - [ ] Search
  - [ ] Sort options

- [ ] **Agenda integration:**
  - [ ] Click toetsdatum → create studyset directly
  - [ ] Auto-link to exam date
  - [ ] Show linked studysets in agenda

- [ ] **Dashboard blocks:**
  - [ ] "Huiswerk" block (homework from other tools)
  - [ ] "To Study" block (auto-scheduled studysets)

### Settings & Changes
- [ ] **Studyset settings page:**
  - [ ] Edit all settings (after creation)
  - [ ] "Changes" section (AI-suggested optimizations)
  - [ ] Accept/reject changes

- [ ] **Analytics & optimization:**
  - [ ] See weak points
  - [ ] AI recommends: more review, different tool, etc.
  - [ ] Auto-adjust based on performance
  - [ ] Explanation of changes made

---

## 🚀 IMPLEMENTATION ORDER

**Phase 1 (MVP):**
1. Dashboard + Sidebar (Analytics)
2. State 1-2 of Linear Wizard
3. Grounding + Output controls

**Phase 2:**
4. State 3-5 of Linear Wizard
5. Tool mindmap (State 3)
6. SRS study interface

**Phase 3:**
7. Edit/versiegeschiedenis
8. Export (basic: CSV, PDF)
9. Sharing (basic: link)

**Phase 4:**
10. Organisatie (folders, tags)
11. Analytics dashboard
12. Recents + agenda integration

**Phase 5:**
13. Flows 2-5 (alternate creation flows)
14. Advanced features (collab, community, etc.)
15. Accessibility & mobile

---

**Last Updated:** 2026-06-07
**Total Features:** 150+
**Status:** Ready for implementation ✅
