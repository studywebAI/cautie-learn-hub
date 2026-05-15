# 🎓 Grades Tab - Complete UI Mockups & Flow

## FLOW OVERVIEW
```
Grades Tab Entry
    ↓
┌─────────────────────┐
│  Main Menu          │
│  ✓ New Grade        │
│  ✓ Existing Grades  │
└─────────────────────┘
    ↓
    ├─→ NEW GRADE PATH
    │   ├─ Step 1: Select Class
    │   ├─ Step 2: Configure Settings
    │   ├─ Step 3: Grading Interface
    │   └─ Save & Done
    │
    └─→ EXISTING GRADES PATH
        ├─ List View (Recent/All)
        ├─ Click Grade
        ├─ View/Edit Grade Details
        └─ Grading Interface
```

---

## SCREEN 1: MAIN GRADES TAB (Landing)

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Grades                                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Welcome back, [Teacher Name]                          │
│                                                          │
│  ┌──────────────────┐    ┌──────────────────┐         │
│  │                  │    │                  │         │
│  │  ➕ New Grade    │    │  📋 Existing     │         │
│  │                  │    │     Grades       │         │
│  │  Create a new    │    │                  │         │
│  │  grade set for   │    │  View & manage   │         │
│  │  your class      │    │  your grades     │         │
│  │                  │    │                  │         │
│  └──────────────────┘    └──────────────────┘         │
│                                                          │
│  ─────────────────────────────────────────────────     │
│                                                          │
│  📌 Recent Grades (Last 3)                             │
│  ┌────────────────────────────────────────┐           │
│  │ Biology Test 1        [Kwartaal 1] [5] │           │
│  │ May 15 • Chemistry                      │           │
│  └────────────────────────────────────────┘           │
│  ┌────────────────────────────────────────┐           │
│  │ Math Quiz              [Ongoing]   [10] │           │
│  │ May 12 • Class 3A                       │           │
│  └────────────────────────────────────────┘           │
│  ┌────────────────────────────────────────┐           │
│  │ Essay Writing         [Kwartaal 2]  [8] │           │
│  │ May 8 • English                         │           │
│  └────────────────────────────────────────┘           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Styling Details
- **Card buttons** (New Grade / Existing):
  - Large touch targets (150px × 150px)
  - Icon at top (➕ or 📋)
  - Title: Bold, 16px
  - Subtitle: Gray, 13px
  - Hover: Slight shadow lift, background highlight
  - Background: Surface panel color (dark mode compatible)

- **Recent Grades Cards**:
  - Clean list items
  - Title left, weight right
  - Metadata below: date • subject
  - Status badge: [Kwartaal 1] [Ongoing] in accent color
  - Graded count: [5] students on right
  - Click → Opens grade details

---

## SCREEN 2A: NEW GRADE - STEP 1 (Select Class)

### Modal/Panel Layout
```
┌─────────────────────────────────────────────────────────┐
│ ➕ Create New Grade Set                           [×]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Step 1 of 3: Select Class                              │
│                                                          │
│ Which class is this grade for?                         │
│                                                          │
│ ┌─────────────────────────────────────────┐           │
│ │  Class 3A (Biology)                  › │           │
│ │  📚 25 students                        │           │
│ └─────────────────────────────────────────┘           │
│ ┌─────────────────────────────────────────┐           │
│ │  Class 2B (Chemistry)                › │           │
│ │  📚 22 students                        │           │
│ └─────────────────────────────────────────┘           │
│ ┌─────────────────────────────────────────┐           │
│ │  Class 1C (Physics)                  › │           │
│ │  📚 18 students                        │           │
│ └─────────────────────────────────────────┘           │
│ ┌─────────────────────────────────────────┐           │
│ │  Class 4D (English)                  › │           │
│ │  📚 30 students                        │           │
│ └─────────────────────────────────────────┘           │
│                                                          │
│                              [Back]  [Next →]           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Styling
- Modal: 90% height, max-width 600px, centered
- Class items: Clickable rows, hover background
- Student count icon: 📚 badge
- Arrow indicator (›) shows it's clickable
- Bottom buttons: Back (secondary) | Next (primary, disabled until selection)

---

## SCREEN 2B: NEW GRADE - STEP 2 (Configure Settings)

### Modal/Panel Layout
```
┌─────────────────────────────────────────────────────────┐
│ ➕ Create New Grade Set                           [×]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Step 2 of 3: Configure Grade Settings                  │
│                                                          │
│ Class: Class 3A (Biology) [Change]                     │
│                                                          │
│ ─────────────────────────────────────────────────────   │
│                                                          │
│ 📝 Grade Title *                                        │
│ ┌─────────────────────────────────────────┐           │
│ │ Biology Test 1                          │           │
│ └─────────────────────────────────────────┘           │
│                                                          │
│ 🏷️ Subject/Topic                                       │
│ ┌─────────────────────────────────────────┐           │
│ │ [Select Subject] ▼                      │           │
│ │ ○ Cell Biology                          │           │
│ │ ○ Genetics                              │           │
│ │ ○ Evolution                             │           │
│ │ ○ Ecology                               │           │
│ └─────────────────────────────────────────┘           │
│                                                          │
│ ⚖️ Weight/Points *                                     │
│ ┌─────────────────────────────────────────┐           │
│ │ 5                                       │           │
│ │ (0.1 - 10)                              │           │
│ └─────────────────────────────────────────┘           │
│                                                          │
│ 📅 Frequency                                           │
│ ┌─────────────────────────────────────────┐           │
│ │ [One-time] ▼                            │           │
│ │ ○ One-time                              │           │
│ │ ○ Every Week                            │           │
│ │ ○ Every 2 Weeks                         │           │
│ │ ○ Monthly                               │           │
│ └─────────────────────────────────────────┘           │
│                                                          │
│ 📋 Description (Optional)                              │
│ ┌─────────────────────────────────────────┐           │
│ │ Students answers will be graded based  │           │
│ │ on accuracy and completeness...        │           │
│ │                                         │           │
│ │                                         │           │
│ └─────────────────────────────────────────┘           │
│                                                          │
│                              [Back]  [Next →]           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Styling
- Title field: Large font, clear label
- Subject dropdown: Shows all subjects in class
- Weight field: Number input with range hint
- Frequency: Clear radio options
- Description: Optional textarea
- All fields use icons for quick visual scanning
- Required fields marked with *

### Field Behavior
- **Title**: Required, min 3 chars, max 100
- **Subject**: Optional (can be multi-select)
- **Weight**: Slider (0.1-10) with increment buttons
- **Frequency**: Dropdown showing common intervals
- **Description**: Optional, auto-save

---

## SCREEN 2C: NEW GRADE - STEP 3 (Grading Interface)

### Layout - Main View
```
┌─────────────────────────────────────────────────────────────────┐
│ Biology Test 1  [Edit Settings]                        [Save]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Class: Class 3A (Biology)                                      │
│ Weight: 5 points | Subject: Cell Biology | One-time            │
│                                                                  │
│ ─────────────────────────────────────────────────────────────   │
│                                                                  │
│ 👥 Grade Students (25 total)                                   │
│                                                                  │
│ Search: [🔍 Search students...]                               │
│                                                                  │
│ Filter: [All] [Not Graded] [Graded]                           │
│ Sort: [By Name ▼]                                              │
│                                                                  │
│ ┌──────────────────────────────────────────────────┐          │
│ │ Student Name        Grade    Date      Actions   │          │
│ ├──────────────────────────────────────────────────┤          │
│ │ Alice Johnson       [  5  ]  May 15   [✓][✎][✗]│          │
│ │ Bob Smith           [     ]  -        [✓][✎][ ]│          │
│ │ Carol Davis         [  3  ]  May 14   [✓][✎][✗]│          │
│ │ David Wilson        [  4  ]  May 13   [✓][✎][✗]│          │
│ │ Emma Martinez       [     ]  -        [✓][✎][ ]│          │
│ │ Frank Brown         [  5  ]  May 15   [✓][✎][✗]│          │
│ │ Grace Lee           [  2  ]  May 12   [✓][✎][✗]│          │
│ │ Henry Taylor        [     ]  -        [✓][✎][ ]│          │
│ │ Iris Johnson        [  4  ]  May 15   [✓][✎][✗]│          │
│ │ Jack Miller         [  3  ]  May 14   [✓][✎][✗]│          │
│ │                                                  │          │
│ │ ... (15 more)                                   │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                  │
│ ─────────────────────────────────────────────────────────────   │
│                                                                  │
│ 📊 Summary                                                      │
│ ┌──────────────────────────────────────────────────┐          │
│ │ Graded: 8 / 25        Average Grade: 3.75       │          │
│ │ Progress: ████░░░░░░  32%                       │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                  │
│                                                [Save & Close]   │
└─────────────────────────────────────────────────────────────────┘
```

### Styling
- Header: Grade title, settings link, save button
- Metadata row: Class, weight, subject, frequency
- Search bar: Wide, clear placeholder
- Filter tabs: [All] [Not Graded] [Graded] - clickable
- Student table:
  - Alternating row colors (subtle)
  - Grade input: Centered, highlight on hover
  - Date: Automatically set when graded
  - Actions: Check (confirm), Edit pencil, Delete X
- Summary section: Progress bar, stats

### Grade Input Field Behavior
- Click cell → Input appears
- Type grade 0-5 (or your scale)
- Tab/Enter → Move to next student
- Blank → "Not Graded" state
- Click ✓ button → Mark as confirmed
- Click ✎ → Edit existing grade
- Click ✗ → Delete grade

---

## SCREEN 3: EXISTING GRADES - LIST VIEW

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Existing Grades                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Your Grades (8 total)                                          │
│                                                                  │
│ Filter: [All] [In Progress] [Completed]                        │
│ Sort: [Most Recent ▼]                                          │
│                                                                  │
│ ┌─────────────────────────────────────────────────────┐        │
│ │ Biology Test 1               📊 [8/25 graded]      │        │
│ │ Class 3A • Cell Biology • 5 pts                     │        │
│ │ Started May 15 • Last updated May 15               │        │
│ │ Average: 3.8/5 | Progress: 32%                     │        │
│ └─────────────────────────────────────────────────────┘        │
│                                                                  │
│ ┌─────────────────────────────────────────────────────┐        │
│ │ Math Quiz                    ✅ [22/22 graded]     │        │
│ │ Class 2B • Algebra • 3 pts                          │        │
│ │ Started May 12 • Last updated May 15               │        │
│ │ Average: 4.2/5 | Progress: 100%                    │        │
│ └─────────────────────────────────────────────────────┘        │
│                                                                  │
│ ┌─────────────────────────────────────────────────────┐        │
│ │ Essay Writing               📊 [15/30 graded]      │        │
│ │ Class 4D • Writing Skills • 8 pts                   │        │
│ │ Started May 8 • Last updated May 14                │        │
│ │ Average: 3.5/5 | Progress: 50%                     │        │
│ └─────────────────────────────────────────────────────┘        │
│                                                                  │
│ ┌─────────────────────────────────────────────────────┐        │
│ │ Physics Midterm              ✅ [18/18 graded]     │        │
│ │ Class 1C • Mechanics • 10 pts                       │        │
│ │ Started May 1 • Last updated May 10                │        │
│ │ Average: 4.1/5 | Progress: 100%                    │        │
│ └─────────────────────────────────────────────────────┘        │
│                                                                  │
│ ... (4 more grades)                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Grade Card Styling
- **Background**: Surface panel color
- **Title**: Bold, large font (16px)
- **Class info**: Subject, weight points (smaller text)
- **Timeline**: "Started May 15 • Last updated May 15"
- **Stats**: "Average: X/5 | Progress: Y%"
- **Status badge**: ✅ (Complete) or 📊 (In Progress)
- **Grading count**: "8/25 graded" in accent color
- **Hover**: Slight lift, cursor pointer
- **Click**: Opens grade details/editing screen

---

## SCREEN 4: GRADE DETAILS & EDITING

### When clicking on existing grade, show this:
```
┌─────────────────────────────────────────────────────────────────┐
│ Biology Test 1  [← Back]                         [Edit] [Delete] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 📚 Class: Class 3A (Biology)                                   │
│ 🏷️ Subject: Cell Biology                                       │
│ ⚖️ Weight: 5 points                                            │
│ 📅 Frequency: One-time                                         │
│ 📋 Description: Students answer will be graded...              │
│                                                                  │
│ Started: May 15, 2026 | Last Updated: May 15, 2026            │
│                                                                  │
│ ─────────────────────────────────────────────────────────────   │
│                                                                  │
│ 📊 Grading Progress                                            │
│ ┌─────────────────────────────────────────────────────┐        │
│ │ Graded: 8 / 25 students                             │        │
│ │ ████░░░░░░░░░░░░░░░░░  32%                          │        │
│ │                                                      │        │
│ │ Average Grade: 3.8 / 5                              │        │
│ │ Highest: 5.0 | Lowest: 2.0                          │        │
│ │                                                      │        │
│ │ Distribution:                                        │        │
│ │ ⭐⭐⭐⭐⭐ (5.0): 2 students                        │        │
│ │ ⭐⭐⭐⭐ (4.0): 3 students                           │        │
│ │ ⭐⭐⭐ (3.0): 2 students                             │        │
│ │ ⭐⭐ (2.0): 1 student                                │        │
│ │ Not yet graded: 17 students                         │        │
│ └─────────────────────────────────────────────────────┘        │
│                                                                  │
│ ─────────────────────────────────────────────────────────────   │
│                                                                  │
│ ✍️ Continue Grading: [Open Grading Interface →]               │
│                                                                  │
│ 📥 Import Grades: [Upload CSV] [Paste from Excel]             │
│                                                                  │
│ 📥 Export Results: [Download CSV] [Download PDF]              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Styling
- Header: Title + back button (Back, Edit, Delete actions)
- Metadata section: Clean list of grade properties
- Grading Progress box: 
  - Progress bar visual
  - Distribution chart showing grade spread
  - Grade averages
- Action buttons: Large, clear CTAs
- Export/Import: Bottom section for data management

---

## COLOR PALETTE & TYPOGRAPHY

### Colors
```
Primary: #FF9500 (Orange accent for grades)
Success: #10B981 (Green for completed)
Warning: #F59E0B (Yellow for in-progress)
Error: #EF4444 (Red for issues)
Text: #1F2937 (Dark gray on light) / #F3F4F6 (Light on dark)
Background: #FFFFFF (Light) / #1F2937 (Dark)
Surface: #F9FAFB (Light) / #374151 (Dark)
Border: #E5E7EB (Light) / #4B5563 (Dark)
```

### Typography
```
Headers (Page titles): 32px Bold
Subheaders (Section titles): 24px Semi-Bold
Labels: 14px Semi-Bold
Body text: 14px Regular
Small text (metadata): 12px Regular
Input fields: 14px Regular with 4px border-radius
Buttons: 14px Semi-Bold with 8px padding
```

### Spacing
```
Section gaps: 24px
Component gaps: 16px
Padding (cards): 16px
Padding (buttons): 12px horizontal, 8px vertical
Border radius: 8px (small) / 12px (medium) / 16px (large)
```

---

## INTERACTION PATTERNS

### Grade Input
- **Default state**: Empty cell showing "-"
- **Hover**: Light background highlight
- **Click**: Input field appears (text/number)
- **Focus**: Blue border, blinking cursor
- **Valid entry**: 0-10 (or your scale)
- **Submit**: Tab/Enter/Click elsewhere
- **Confirmation**: ✓ checkmark appears
- **Edit**: Click ✎ icon to modify

### Navigation
- **Back button**: Exits without saving
- **Save button**: Only appears when changes made
- **Tabs**: Underline indicator for active
- **Filters**: Button group, single selection
- **Sort**: Dropdown with arrow indicator

### Empty States
```
No students graded yet
└─ "Start grading by clicking on a student"
└─ [Open grading interface →]

No grades created
└─ "Create your first grade set to get started"
└─ [➕ New Grade]

No search results
└─ "No students found matching 'xyz'"
└─ Try different search terms
```

---

## RESPONSIVE DESIGN

### Mobile (375px - 767px)
- Full-width cards
- Single column layout
- Larger touch targets (48px minimum)
- Grade input on separate row
- Stack all info vertically
- Bottom sheet modals instead of centered

### Tablet (768px - 1024px)
- 2-column layout for grades list
- Table layout for grading with horizontal scroll
- Side-by-side modals if space allows

### Desktop (1025px+)
- Full multi-column layouts
- Wide tables with all columns visible
- Floating action panels
- Drag-to-reorder support

---

## ACCESSIBILITY

- **ARIA labels** on all buttons
- **Keyboard navigation**: Tab through fields, Enter to submit
- **Color contrast**: WCAG AA compliant (4.5:1 ratio)
- **Focus indicators**: Blue outline on keyboard focus
- **Screen reader**: Descriptive button labels
- **Form validation**: Clear error messages
- **Text alternatives**: Icons have text labels

---

## INTERACTION FLOWS

### Flow 1: Create & Grade New Grade Set
```
Click "New Grade"
→ Modal: Select Class
→ Modal: Configure Settings (Title, Weight, Subject, Frequency)
→ Open Grading Interface
→ Click student row → Enter grade → Tab to next
→ Click Save → Confirmation
→ Return to Existing Grades list
```

### Flow 2: View & Continue Grading Existing Grade
```
Click grade card from list
→ See grade details (progress, stats)
→ Click "Continue Grading"
→ Open grading interface
→ Grade remaining students
→ Save
→ Return to details view
```

### Flow 3: Bulk Actions
```
Open grade
→ Click "Import Grades"
→ Upload CSV or paste from Excel
→ Map columns (Student, Grade)
→ Review preview
→ Confirm & Save
```

---

## STATES & STATUS

### Grade Set States
1. **Draft** - Not yet published, students can't see
2. **In Progress** - Published, students can see, not all graded
3. **Completed** - All students graded, finalized

### Individual Grade States
1. **Not Graded** - Empty, waiting for entry
2. **Pending** - Entered but not confirmed
3. **Confirmed** - Graded and saved
4. **Locked** - Published to student, can't edit

---

## KEYBOARD SHORTCUTS (Optional Enhancement)

```
Cmd/Ctrl + N → New Grade
Cmd/Ctrl + F → Filter/Search
Tab → Next grade field
Shift+Tab → Previous grade field
Enter → Confirm grade & move next
Esc → Cancel editing
↑/↓ → Navigate students in list
S → Save
```

---

## FUTURE ENHANCEMENTS (V2)

- Bulk import from external sources (Google Classroom, PowerSchool, etc.)
- Rubric-based grading (create rubrics, apply to grades)
- Peer review workflow (students review each other)
- Comments/feedback per grade (leave detailed notes)
- Grade analytics (trending, predictions)
- Mass actions (bulk grade changes, bulk feedback)
- Custom grading scales (letter grades A-F, percentages, etc.)
- Late submission tracking (red flag for late submits)
- Grade history/audit log (see all changes made)
