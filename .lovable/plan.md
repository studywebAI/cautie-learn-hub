

# Assignment Editor Enhancement Plan

This plan addresses all requested features: fill-in-blank visual improvement, block icons (lock/checkmark), assignment settings overlay, visibility/answers controls, ordering block improvements, and AI grading presets.

---

## Phase 1: Block Fixes and Visual Improvements

### 1.1 Fill-in-Blank Visual Enhancement
**Current state**: Shows `___` which is converted from `...`
**Change to**: A clean, long underscore visual using CSS styling

- Replace `___` text display with a styled inline element
- Use CSS border-bottom to create a single continuous underline input
- Students type directly on the underline field
- Show numbered blank indicators for teachers (1), (2), etc.

```text
Before: My shoes ___ 100 euros.
After:  My shoes [_______________] 100 euros.
                    (1)
        Blank 1 = cost
```

### 1.2 Block Selection Fix
Already implemented edge-only selection (12px threshold) - verify this is working correctly.

### 1.3 Ordering Block Improvements
- Teachers input items in the correct order (A, B, C, D...)
- The order they type them in = the correct order
- Add drag handles or arrows to reorder items
- Add delete button per item (like multiple choice has)

---

## Phase 2: Lock and Checkmark Icons per Block

### 2.1 Icon Layout
When a block is selected, show icons below the block outline:
```text
+------------------------+
|      Block Content     |
+------------------------+
  [ Lock ]  [ Check ]  [ AI Settings ]
```

### 2.2 Lock Icon Behavior
- **Unlocked state**: Lighter text/outline, answer can be changed
- **Locked state**: 
  - Closed lock icon
  - Normal text/outline color  
  - Current answer becomes the "correct answer"
  - Students can still change their answers (but score may change)
  - Teachers cannot edit the question until unlocked

### 2.3 Checkmark Icon Behavior
- Only visible when `answers_enabled` is ON for the assignment
- Clicking shows correct/incorrect feedback for that block
- Green highlight for correct, red for incorrect

---

## Phase 3: Assignment Settings Overlay

### 3.1 Settings Menu (Small Overlay)
Accessible from:
1. Gear icon in assignment list (paragraph page)
2. Gear icon in assignment editor toolbar

Settings include:
- **Visible/Invisible toggle**: Controls if students can see the assignment
- **Answers On/Off toggle**: Controls if students can check their answers

### 3.2 Visual Indicators in Assignment List
Each assignment shows:
- Eye icon (visible) or Eye-off icon (hidden)
- Check icon (answers on) or X icon (answers off)
- Clicking either icon opens the settings overlay

### 3.3 Database Change
Need to add `is_visible` column to assignments table (boolean, default true).

---

## Phase 4: AI Grading Presets

### 4.1 AI Grading Settings Icon (per block)
Third icon shown for teachers - opens preset configuration panel.

### 4.2 Preset System
- Sliders and toggles for grading strictness
- Text field to explain grading criteria
- Save as preset (name it)
- Edit/delete existing presets
- Set a default preset for all blocks
- Per-block override option

### 4.3 Settings stored per account
Presets saved to user's account (likely in user_preferences or new presets table).

### 4.4 AI Grading Toggle
- Default: ON
- Can be turned off globally or per-block
- Uses existing `ai-grading-assistant.tsx` infrastructure

---

## Technical Implementation Details

### Files to Modify

| File | Changes |
|------|---------|
| `app/components/AssignmentEditor.tsx` | Fill-in-blank styling, lock/check icons, AI settings icon, toolbar gear icon |
| `app/(main)/subjects/.../paragraphs/[paragraphId]/page.tsx` | Add visibility/answers icons per assignment, settings overlay |
| `app/api/.../assignments/[assignmentId]/route.ts` | Add PATCH for updating visibility/answers_enabled |
| `app/lib/supabase/database.types.ts` | Add is_visible type |
| `app/components/grading/ai-grading-assistant.tsx` | Integrate with preset system |

### New Files to Create

| File | Purpose |
|------|---------|
| `app/components/AssignmentSettingsOverlay.tsx` | Reusable settings overlay component |
| `app/components/AIGradingPresets.tsx` | Preset management UI |
| `app/api/users/grading-presets/route.ts` | API for saving/loading presets |

### Database Migration
```sql
ALTER TABLE assignments 
ADD COLUMN is_visible boolean DEFAULT true;
```

---

## Implementation Order

1. **Fill-in-blank styling** - Visual CSS change with inline editable underline
2. **Ordering block delete buttons** - Add remove functionality like multiple choice
3. **Lock/checkmark icons** - Add to block UI with state management
4. **Assignment settings overlay** - Create reusable component
5. **Visibility icons in list** - Add to paragraph page
6. **Database migration** - Add is_visible column
7. **AI grading presets** - Create preset management system

---

## Build Issue Note

This is a **Next.js project**, not a Vite project. The warnings about missing `vite.config.ts`, `index.html`, and `build:dev` script are incorrect for this project type. The project uses `next.config.ts` and builds with `next build`. These warnings can be safely ignored for deployment on Vercel or similar Next.js hosting platforms.

