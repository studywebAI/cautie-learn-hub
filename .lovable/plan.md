

# Implementation Plan: Phase 2-4 Assignment Editor Enhancements

## Status: ✅ COMPLETED

All phases have been implemented.

---

## Phase 2: Lock and Checkmark Icons per Block ✅

### Implemented Features:
- `locked` and `showFeedback` properties added to block data structure
- Lock icon toggles block answer as "correct" - when locked, question cannot be edited
- Checkmark icon shows correct/incorrect feedback (only visible when `answers_enabled` is ON)
- Visual styling: locked blocks show "Locked" badge and have primary border color
- Unlocked blocks have slightly reduced opacity

### Files Modified:
- `app/components/AssignmentEditor.tsx` - Added lock/check/AI icons below selected blocks

---

## Phase 3: Assignment Settings Overlay ✅

### Implemented Features:
- Created `AssignmentSettingsOverlay.tsx` component with visibility/answers toggles
- Added gear icon to editor toolbar for assignment settings
- Added Eye/EyeOff icons to assignment list (paragraph page)
- Added Check/X icons to show answers status
- Clicking icons opens settings popover

### Database Migration:
```sql
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;
```
Added to `supabase/schema_migration.sql`

### API Changes:
- Added PATCH endpoint to `app/api/assignments/[assignmentId]/route.ts` for updating visibility/answers

### Files Created:
- `app/components/AssignmentSettingsOverlay.tsx`

### Files Modified:
- `app/(main)/subjects/[subjectId]/chapters/[chapterId]/paragraphs/[paragraphId]/page.tsx`
- `app/api/assignments/[assignmentId]/route.ts`
- `supabase/schema_migration.sql`

---

## Phase 4: AI Grading Presets ✅

### Implemented Features:
- Created `AIGradingPresets.tsx` component with full preset management
- Preset settings include: strictness slider (1-10), partial credit, spelling/grammar matters, case sensitive, custom instructions
- Per-block override capability
- Save/edit/delete presets
- Set default preset
- AI grading toggle (on/off)
- Sparkles icon on open_question blocks to access AI settings

### Preset Data Structure:
```typescript
interface GradingPreset {
  id: string;
  name: string;
  is_default: boolean;
  settings: {
    strictness: number; // 1-10
    partial_credit: boolean;
    spelling_matters: boolean;
    grammar_matters: boolean;
    case_sensitive: boolean;
    custom_instructions: string;
    ai_enabled: boolean;
  };
}
```

### Files Created:
- `app/components/AIGradingPresets.tsx`

### Files Modified:
- `app/components/AssignmentEditor.tsx` - Integrated AI settings icon per block

---

## Technical Notes

### Build System
This is a Next.js project. The warnings about `vite.config.ts`, `index.html`, and `build:dev` are incorrect and should be ignored. The project builds with `next build`.

### Lock State Logic
- When locked: `block.locked = true`
- Current answers become correct answers
- Students can still modify their answers (score updates)
- Teachers cannot edit question until unlocked (edit button disabled)

### Visibility Logic
- `is_visible = false`: Assignment hidden from students
- Teachers always see all assignments (with "hidden" indicator - opacity reduced, dashed border)

---
---

# Tools Redesign Plan

## Status: 🔄 IN PROGRESS

## Kernprincipes
- **Alles zichtbaar** — geen dropdowns, geen hidden settings. Alles is direct klikbaar.
- **Aparte pagina's** — quiz/flashcards/notes blijven eigen routes, maar delen dezelfde nieuwe layout
- **Professioneel** — ElevenLabs-niveau polish, niet amateuristisch

## Problemen (huidige staat)
1. 3-kolommen layout — center panel is nutteloos, verspilde ruimte
2. Native `<select>` elementen — lelijk, amateuristisch
3. Hardcoded NL strings — moet via i18n dictionary
4. Te veel verborgen opties — dropdowns, tabs-in-tabs, onduidelijke hiërarchie
5. WorkbenchShell is een rigid grid — werkt niet

## Redesign

### Fase 1: Nieuwe Layout + Zichtbare Controls
**Layout: 2-panel — input (left/main) + settings sidebar (right, altijd open)**

```
┌──────────────────────────────┬─────────────────┐
│                              │  Mode            │
│   [drag-drop + textarea]     │  ● Practice      │
│                              │  ○ Exam          │
│   Groot, clean, focus        │  ○ Adaptive      │
│                              │                  │
│                              │  Difficulty       │
│                              │  ● Balanced       │
│                              │  ○ Ramp           │
│                              │  ○ Hard           │
│                              │                  │
│                              │  Questions: ──●── │
│                              │              12   │
│                              │                  │
│   ┌──────────────────────┐   │  [Transform ▸]   │
│   │  ✨ Generate Quiz    │   │  [History]       │
│   └──────────────────────┘   │                  │
└──────────────────────────────┴─────────────────┘
```

**Controls:**
- **Mode** → radio-group pills (vertical list, zichtbaar, één klik)
- **Difficulty** → radio-group pills
- **Count** → slider met nummer label (geen input field)
- **Generate** → grote prominente knop onder textarea
- **Geen** Card-in-Card, geen nested borders, geen shadows
- **Sidebar** scrollt als er te veel opties zijn, maar alles is direct zichtbaar
- **File upload** → drag-drop zone geïntegreerd in textarea area

### Fase 2: i18n
- Alle strings via `useDictionary()`
- 7 talen

### Fase 3: Toolbox Homepage
- Cleaner grid, minder ruis

### Fase 4: Polish
- framer-motion page transitions
- font-weight: 400 everywhere
- Dark mode tokens check
