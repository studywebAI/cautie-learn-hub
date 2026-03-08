

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

## Status: ✅ COMPLETED

## Kernprincipes
- **Alles zichtbaar** — geen dropdowns, geen hidden settings. Alles is direct klikbaar.
- **Aparte pagina's** — quiz/flashcards/notes blijven eigen routes, maar delen dezelfde nieuwe layout
- **Professioneel** — ElevenLabs-niveau polish, niet amateuristisch

### Fase 1: Nieuwe Layout + Zichtbare Controls ✅
- 2-panel WorkbenchShell met input (links) + settings sidebar (rechts)
- PillSelector radio chips, sliders, PresetManager
- Mobile: slide-over settings panel met gear toggle
- Custom title input per tool
- Export/import round-trip (Markdown, HTML, paste)

### Fase 2: i18n ✅
- Alle tool strings via `getToolStrings(locale)` uit `app/lib/tool-i18n.ts`
- 7 talen: EN, NL, DE, FR, ES, RU, ZH
- Labels, descriptions, buttons, placeholders, error messages

### Fase 3: Toolbox Homepage ✅
- Dashboard met Quick Actions, Continue, Recommended cards
- Teacher recommendation system via announcements
- Usage stats en recent artifacts

### Fase 4: Polish ✅
- `animate-fade-in` page transitions via main layout
- font-weight: 400 on tool page headings (text-lg font-normal)
- Dark mode tokens verified (strict neutral palette, surface layers)
- Mobile responsive WorkbenchShell with slide-over sidebar
