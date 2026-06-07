# STUDYSET IMPLEMENTATION PLAN

## PHASE 1: PRIMARY FLOW + DASHBOARD

### Files to Create/Modify

#### 1. Update Types (`/studyset/types.ts`)
- [x] Studyset interface
- [ ] Add Tool interface (name, icon, settings)
- [ ] Add MindmapNode interface (for tool visualization)
- [ ] Add ChangeLog interface (timestamp, user, change, before, after)
- [ ] Add AIRecommendation interface (type, title, description, action)

#### 2. Create Primary Flow Component (`/studyset/create/primary-flow.tsx`)
**Structure:**
- Step 1: Name + Calendar (local state for name, selectedDays)
- Step 2: Upload (3 buttons for options, upload form)
- Step 3: Mindmap (visual graph of tools, click handlers)
- Step 4: Generate (submit form, redirect to dashboard)

**Features within flow:**
- Form validation
- File upload handling (with mock for now)
- Navigation between steps (Next/Back buttons)
- Summary before generate

#### 3. Update Dashboard (`/studyset/page.tsx`)
Replace current content with new dashboard structure:
- Sidebar with analytics
- Three-tab view (Dashboard, Today, All)
- Active/Archived studysets
- Planned for Today section

**Components needed:**
- `<SidebarAnalytics/>` — Shows all studysets + metrics
- `<DashboardView/>` — Main view with cards
- `<TodayView/>` — Color-coded today items
- `<AllView/>` — Complete list with filters

#### 4. Studyset Detail Page (`/studyset/[id]/page.tsx`)
- Overview of created studyset
- Show: Name, color, progress, study days
- Tabs for: Overview, Analytics, Settings, History, Study
- Action buttons: Edit, Archive, Delete

#### 5. Analytics Page (`/studyset/[id]/analytics/page.tsx`)
- Retention % (SRS statistics)
- Streak counter
- Weak points (topics <60%)
- Heatmap (activity per day)
- Weekly goal progress
- AI recommendations

#### 6. Settings Page (`/studyset/[id]/edit/page.tsx`)
**Collapsible sections:**
- Basics (name, color, days)
- Grounding toggles
- Output Control sliders/dropdowns
- Tool Configuration
- Organization (folder, tags, pin)
- Export options
- Sharing settings
- Accessibility options

#### 7. History/Changes Page (`/studyset/[id]/history/page.tsx`)
- Timeline of all changes
- Before/after for each edit
- AI-suggested changes with apply/reject buttons
- Rollback to previous version option

#### 8. Study Interface (Already exists: `/studyset/[id]/study/page.tsx`)
- Keep existing SRS interface
- Again/Hard/Good/Easy buttons
- Difficulty indicators
- Session stats

---

## PHASE 2: 25+ UNIQUE FLOWS (After Phase 1 Complete)

Each flow will:
- Have completely different layout/UX paradigm
- Support same feature set as primary flow
- Be multi-page (not single page)
- Have interactive navigation

**Examples of paradigms:**
1. Linear Wizard (step-by-step) — **Already exists**
2. Workbench (sidebar freeform) — **Already exists**
3. Conditional (question routing) — **Already exists**
4. Preset + Sliders (template-based) — **Already exists**
5. Assessment (diagnostic test) — **Already exists**
6. Mindmap (visual node-based) — Primary flow variant
7. Canvas (infinite drag-drop)
8. Terminal/CLI (command-based)
9. Card Deck (flip through cards)
10. Spreadsheet (table-based input)
...and 15+ more with unique layouts

---

## IMPLEMENTATION CHECKLIST

### PHASE 1: PRIMARY FLOW

#### Step 1: Name + Calendar
- [ ] Create input field for studyset name
- [ ] Create calendar component (or checkbox grid for days)
- [ ] Validate name is not empty
- [ ] Store in local state or URL params
- [ ] Show "Next" button to proceed to Step 2

#### Step 2: Upload
- [ ] Create 3 option buttons (Agenda-Toets, Subjects, Files)
- [ ] For Agenda-Toets:
  - [ ] Show test list from mock agenda
  - [ ] Allow selection
  - [ ] Show linked chapters
- [ ] For Subjects:
  - [ ] Dropdown for subject
  - [ ] Dropdown for chapter
  - [ ] Checkboxes for paragraphs
- [ ] For Files:
  - [ ] Drag & drop zone
  - [ ] File type icons
  - [ ] Multiple file support
  - [ ] Show uploaded list
- [ ] "Next" button to Step 3

#### Step 3: Mindmap Tool Settings
- [ ] Create SVG/canvas mindmap visualization
- [ ] Display tools as nodes: Quiz, Flashcards, Notes
- [ ] On click, show settings panel on right side with:
  - [ ] Question types (checkboxes)
  - [ ] Output Control section:
    - [ ] Depth slider (kort ↔ uitgebreid)
    - [ ] Difficulty dropdown (begrip, gemiddeld, examen)
    - [ ] Item count slider (5-50)
    - [ ] Language dropdown
    - [ ] Tone dropdown
    - [ ] Target audience dropdown
    - [ ] Examples toggle
    - [ ] Formality slider
  - [ ] Grounding toggles:
    - [ ] "Alleen mijn bronnen"
    - [ ] Show citations
    - [ ] Confidence indicator
- [ ] "Next" button to Step 4

#### Step 4: Generate & Return to Dashboard
- [ ] Generate button submits form
- [ ] Clears form
- [ ] Redirects to `/studyset` dashboard
- [ ] Shows toast: "Studyset created!"
- [ ] New studyset appears in Active list

### PHASE 1: DASHBOARD

#### Sidebar Analytics
- [ ] Display all studysets from mock data
- [ ] Show metrics: retention %, streak, cards due
- [ ] Show "Changes" section for recent edits
- [ ] Expandable/collapsible

#### Dashboard View
- [ ] "Planned for Today" section (color-coded items)
- [ ] Active studysets cards (name, color, progress, quick actions)
- [ ] Archived studysets (collapsed by default)

#### Today View
- [ ] List all items due today
- [ ] Color-coded by studyset
- [ ] Show progress indicator
- [ ] Link to analytics

#### All View
- [ ] Complete studyset list
- [ ] Filters: Active, Archived, All
- [ ] Sort: Date, Name, Progress
- [ ] Search box

### PHASE 1: DETAIL PAGES

#### Detail Page (`/studyset/[id]`)
- [ ] Tab navigation: Overview, Analytics, Settings, History, Study
- [ ] Overview tab shows summary + status

#### Analytics Page
- [ ] Retention % chart
- [ ] Streak counter
- [ ] Weak points section (topics <60%)
- [ ] Activity heatmap
- [ ] Weekly goals
- [ ] AI recommendations

#### Settings Page
- [ ] Collapsible sections for each feature category
- [ ] All toggles, sliders, dropdowns working
- [ ] Save button persists changes

#### History Page
- [ ] Timeline of changes
- [ ] Show before/after values
- [ ] AI suggestions section
- [ ] Apply/reject buttons for suggestions
- [ ] Rollback option

---

## DATA STRUCTURE (Mock Data)

```typescript
const MOCK_STUDYSET = {
  id: '1',
  userId: 'user1',
  name: 'Biologie H4-H6',
  color: '#9d7eb8',
  studyDays: ['ma', 'di', 'do', 'za'],
  uploadType: 'agenda', // or 'subjects' or 'files'
  uploadedSources: [], // Files/links
  settings: {
    // All options from sections 2-11
  },
  totalCards: 86,
  completedCards: 54,
  currentStreak: 12,
  avgRetention: 82,
  createdAt: Date,
  updatedAt: Date,
  changeLog: [
    { timestamp, user, change, before, after }
  ],
  aiRecommendations: [
    { type, title, description, action }
  ]
}
```

---

## NEXT STEPS (After Phase 1 Done)

1. Commit Phase 1 complete
2. User feedback on primary flow
3. Build Phase 2: 25+ unique flows
4. Each flow as separate component
5. All flows share same feature set
6. Different layout paradigms only

