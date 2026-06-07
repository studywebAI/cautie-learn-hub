# STUDYSET COMPLETE SPECIFICATION & IMPLEMENTATION PLAN

## OVERVIEW
Studyset is the **central feature** of the platform. It's an alternative to agenda for creating and managing study materials with AI-generated quizzes, flashcards, notes, etc.

---

## PRIMARY FLOW (Single Create Flow)

### Step 1: Name + Calendar
- **Input:** Studyset name (text input)
- **Input:** Select study days (calendar/checkboxes: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
- **Output:** Save both, proceed to Step 2

### Step 2: Upload (3 Options)
Choose ONE upload method:

**Option A: Agenda-Toets**
- Sync with agenda
- Display tests/exams with linked chapters/paragraphs
- Auto-populate from exam date

**Option B: Subjects**
- Select subject → chapter → paragraphs
- Create quiz/flashcards/notes based on selection

**Option C: Files/Links/Media**
- All formats: PDF, Word, PPT, text, URL, YouTube, MP3, images
- Drag & drop + bulk upload
- Multiple sources allowed
- OCR for scans/handwritten notes

### Step 3: Mindmap Tool Settings
**Visual layout:** All tools as mindmap nodes
- Quiz
- Flashcards
- Notes
- [Other tools as needed]

**For EACH tool clicked:**
Show specific settings panel with:
- Question types (for quiz/flashcards)
- All Output Control options (see section 3 below)
- Grounding toggles (see section 2 below)
- Editing options (see section 4 below)
- Tool-specific parameters

### Step 4: Generate
- User clicks "Generate" button
- AI creates initial plan based on inputs
- Clear prompt with rules (not random presets)
- Returns to main **Dashboard**

---

## MAIN DASHBOARD (After Creating Studyset)

### Sidebar Analytics Panel (Left side, like teachers have)
- Show all studysets with current metrics
- Analytics per set (retention %, streak, cards due)
- "Changes" section (recent adjustments made)
- Expandable/collapsible

### Main Content Area: Three Views

#### VIEW 1: Dashboard (Default)
**Top section - "Planned for Today"**
- List of items due today
- Color-coded by studyset
- Progress indicator (x of y done)
- Quick link to analytics

**Active Studysets**
- Card layout showing:
  - Studyset name + color
  - Progress bar (% complete)
  - Cards due
  - Last studied
  - Quick action buttons (Study, Analytics, Edit, More)

**Archived Studysets** (below, less prominent)
- Collapsed/minimal display
- Expand to see details

#### VIEW 2: Today
- Full list of all today's items
- **Color-coded by studyset** (studyset 1 = purple, studyset 2 = light blue, etc.)
- For each item show:
  - Color indicator
  - Item preview/title
  - Progress (how far, what's left)
  - Link to full analytics for that studyset

#### VIEW 3: All Studysets
- Complete list of all studysets (active + archived)
- Filters: Active, Archived, Completed
- Sort options: Date created, Name, Progress
- Search functionality

---

## EDITING & MANAGEMENT

### Studyset Detail Page (`/studyset/[id]`)
**Tabs:**
- Overview (shows all current settings, progress)
- Analytics (detailed stats, heatmap, weak points)
- Settings (edit all options)
- History (version history, AI changes log)
- Study (launch study interface with SRS)

### Settings Editor (per studyset)
**Organized sections (collapsible):**
- **Basics:** Name, color, study days, status
- **Grounding:** All toggles from section 2
- **Output Control:** All options from section 3
- **Tools:** Edit which tools are active, tool-specific settings
- **Organization:** Folder, tags, pin status
- **Export:** Available formats
- **Sharing:** Public/private, collaboration settings
- **Accessibility:** Dark mode, text size, offline mode, etc.

### Change History & AI Improvements
- **Change Log:** Track all edits with timestamps
- **Who Changed What:** Show version history
- **AI Suggestions:** System suggests optimizations based on performance
  - "Your retention on quizzes is low, try increasing difficulty"
  - "You're weak on topics X,Y,Z - focus here"
  - "Best study time: 20 min sessions based on your data"
- **Apply/Reject Changes:** User controls what gets applied

---

## 1. UPLOAD OPTIONS (3 Methods)

### Option 1: Agenda-Toets Integration
- Sync with agenda
- Show tests/exams with linked chapters/paragraphs
- Auto-generate studyset from exam date

### Option 2: Subjects/Topics
- Select subject → chapter → paragraphs
- Create quiz/flashcards/notes based on selection
- Similar to Option 1 but manual selection

### Option 3: Basic Upload (Files/Links/Media)
All formats supported:
- PDF, Word, PPT, text
- URL, YouTube links
- MP3/audio files
- Images (PNG, JPG, etc.)
- Screenshots/scans
- Handwritten notes (OCR)
- Drag & drop + bulk upload
- Multiple sources per studyset
- Auto-source finder
- Auto language detection

---

## 2. GROUNDING / ACCURACY

- **"Alleen mijn bronnen"-toggle** — No invented knowledge from outside sources
- **Clickable citations** — Back to exact sentence/page
- **Regenerate single item** — Not whole set
- **Flag/verify** — Mark doubtful output
- **Confidence indicator** — Tool shows certainty level
- **Cross-source check** — Show contradictions between sources

---

## 3. OUTPUT CONTROL

- **Depth/length** — Short overview ↔ detailed
- **Difficulty** — Understanding ↔ exam level
- **Item count** — e.g. 20 cards
- **Output language** — Independent from source
- **Tone/mode** — Tutor, summary, exam trainer
- **Sub-topic focus** — "Only about enzyme kinetics"
- **Target audience/level** — Secondary, university, professional
- **Examples on/off** — With or without worked examples
- **Formality/style** — Concise vs explanatory

---

## 4. EDITING / OWNERSHIP

- **Edit each item** — Card, question, note-line
- **Add own items** — Manually alongside AI
- **Delete/reorder/split/merge** items
- **Multimedia in items** — Image, audio, LaTeX formulas
- **Image occlusion** — Hide part of image
- **Version history/undo** — Back to previous version
- **Bulk-edit** — Multiple items at once

---

## 5. SPACED REPETITION / STUDY

- **SRS** — Again/Hard/Good/Easy
- **Weak points tracking** — Focus on what you got wrong
- **Daily limit** — New + repeat cards cap
- **Custom/filtered study** — By tag, difficulty, interval, leeches
- **Exam/test mode** — Timed, final score
- **Leitner/shuffle** — Order options
- **Reminders/planning** — When to repeat
- **Reset progress** — Start set over

---

## 6. ORGANIZATION

- **Folders + tags** — By subject/topic
- **Search** — Through everything
- **Projects/notebooks** — Per course
- **Favorites/pin** — Quick access
- **Filters & sort** — By date, type, status
- **Archive** — Hide old sets

---

## 7. EXPORT / INTEGRATION

- **Anki export** (+ AnkiConnect)
- **Quizlet/CSV/PDF/print**
- **Markdown/Notion/Google Docs**
- **Shareable link/embed**
- **Calendar sync** — Repeat moments in agenda

---

## 8. SHARING / COLLABORATION

- **Public/private sharing** — Set or notebook
- **Real-time collaboration** — Study group
- **Copy/fork** — Take someone else's set
- **Rights** — View vs edit
- **Community library** — Search public sets

---

## 9. PROGRESS / ANALYTICS

- **Streaks + achievements** — Build habits
- **Statistics** — Retention %, accuracy, time
- **Error overview** — Your specific mistakes
- **Heatmap/calendar** — Activity per day
- **Set goals** — Per day/week

---

## 10. ACCESSIBILITY / PERSONALIZATION

- **Text-to-speech/audio** — Listen on the go
- **Own pace** — ADHD/dyslexia friendly
- **Dark mode, text size, dyslexia font**
- **Ad-free**
- **Keyboard shortcuts** — Fast review
- **Offline mode** — Study without internet

---

## 11. ACCOUNT / SYSTEM

- **Cross-platform sync** — Desktop/web/mobile
- **Full mobile app** — Same features as desktop
- **Clear limits** — Transparent sources/uploads
- **Usable free tier**
- **Privacy** — Data not for training + FERPA/DUA for schools
- **Auto-save + cloud backup**
- **Multiple interface languages**

---

## CREATING A STUDYSET - MULTI-PAGE FLOW

### Step 1: Basics
- **Name** — Studyset title
- **Study days** — Select which days you can study (Monday, Tuesday, etc.)
  - ⚠️ NO fixed times (everyone has own pace)

### Step 2: Upload
Choose ONE of 3 upload methods:
1. Agenda-toets (sync with exam)
2. Subjects (pick chapter/paragraphs)
3. Files/links/media (drag & drop all formats)

Multiple sources allowed per set

### Step 3: Tool Selection & Configuration (Mindmap-style)
Visual layout with **tools as a mindmap**:
- Quiz
- Flashcards
- Notes
- Other tools...

**For each tool clicked:**
- Specific settings (questions types, options from section 3: Output Control)
- Question type selection
- Difficulty, tone, examples, etc.

### Step 4: Generate
- Click "Generate" → AI creates plan
- Based on clear prompt with rules
- Optimal output, not random presets
- User can edit entire plan before confirming

### Step 5: Review & Edit
- Preview generated items
- Edit, add, delete, reorder
- Confirm creation

---

## USING A STUDYSET - MAIN INTERFACE

### Sidebar Analytics (like teachers have)
- Show all active studysets
- Current analytics for each
- "Changes" section (adjustments made)

### Main View: Active/Archived
- **Active studysets** — List with stats
- **Archived studysets** — Below, less prominent

### Today Tab
- List of all today's items
- **Color-coded by studyset** (e.g. studyset 1 = purple, studyset 2 = light blue)
- Show:
  - Color indicator
  - Progress (how far, what's left)
  - Link to analytics for that set

### Analytics Tab (per studyset)
- Retention %, streaks, stats
- Weak points
- Heatmap/calendar activity
- Goals, recommendations
- Changes made + reasons

### Settings Tab (per studyset)
- All options from sections 2-11 above
- Organized by category
- Edit anytime

---

## FINDING STUDYSETS

### Dashboard
- **Homework block** — Shows due items
- **To Study block** — Studysets to review (auto-planned in agenda)

### Recents Page
- All studysets you've created
- Folder view
- Filters
- Search

### In Agenda
- Click exam → Create studyset directly

---

## 25 UNIQUE FLOWS (LAYOUTS)

Each flow must:
- Have fundamentally DIFFERENT layout/structure (not just colors)
- Support ALL features from sections 1-11
- Have multiple pages (not single page)
- Be interactive (clickable, navigable)
- Unique UX paradigm each

Examples of different paradigms:
1. Linear wizard (step-by-step)
2. Workbench (sidebar navigation, freeform order)
3. Conditional (question-based routing)
4. Preset + sliders (template selection + customize)
5. Assessment (diagnostic test)
6. Mindmap/graph (visual node-based)
7. Canvas (infinite canvas, drag items)
8. Terminal/CLI (command-based)
9. Card flow (deck of cards, flip through)
10. Spreadsheet (table-based input)
11. Conversational (chatbot-style Q&A)
12. ...15 more unique paradigms

---

## CHECKLIST STATUS

### ✅ Conceptually Complete
- Feature list defined
- User flow mapped
- Analytics structure clear
- Integration points identified

### ⚠️ To Implement
- [ ] Create 25 unique flow components (React)
- [ ] Dashboard with sidebar analytics
- [ ] Today view (color-coded, clickable)
- [ ] Studyset detail page
- [ ] Analytics page per studyset
- [ ] Settings page per studyset
- [ ] Recents page with filters
- [ ] Create flow pages (25 separate implementations)
- [ ] Study interface (SRS, navigation)
- [ ] Export functionality
- [ ] Sharing/collaboration features
- [ ] Mobile layouts
- [ ] Backend API integration (currently mock data)
- [ ] Image occlusion editor
- [ ] Bulk-edit interface
- [ ] Live recording + transcription
- [ ] Agenda integration
- [ ] Community library search

