

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

## Inspiratie
ElevenLabs-achtig: clean, professioneel, ruimtelijk. Geen Cards-in-Cards. Geen native selects. Geen hardcoded taal.

## Problemen (huidige staat)
1. **3-kolommen layout is zinloos** — center panel is leeg tot generatie, verspilde ruimte
2. **Native `<select>` elementen** — zien er amateuristisch uit
3. **Hardcoded NL strings** — "Upload bestand", "Ctrl/Cmd + Enter om te genereren" etc. moeten via i18n dictionary
4. **Modes voelen slecht** — te veel tabs, onduidelijke hiërarchie, verwarrende opties
5. **WorkbenchShell is een rigid 3-column grid** — werkt niet voor de use case
6. **Toolbox homepage is een saaie card-lijst** — geen engagement

## Redesign Fases

### Fase 1: Nieuwe Tool Layout (ElevenLabs-stijl)
- [ ] **Nieuw WorkbenchShell** → 2-panel layout: groot input area (70%) + settings sidebar (30%)
- [ ] **Kill center panel** — output komt pas na generatie als full-screen takeover
- [ ] **Textarea als hero** — groot, schoon, minimaal. Drag-drop zone voor files
- [ ] **Generate knop** — prominent onderaan de textarea, niet in de sidebar
- [ ] **Settings sidebar** — clean panel met shadcn Select components ipv native selects
- [ ] **Geen Card-in-Card nesting** — vlakke layout, subtiele borders

### Fase 2: Settings UX Overhaul
- [ ] **Vervang alle native `<select>`** → shadcn `<Select>`
- [ ] **Mode selector** — pill-style toggle of segmented control
- [ ] **Simplify modes** — reduce complexity, clearer hierarchy
- [ ] **Number input** → slider of stepper
- [ ] **Responsive** — sidebar collapst naar bottom sheet op mobile

### Fase 3: i18n Fix
- [ ] Alle hardcoded strings → dictionary keys
- [ ] Placeholder tekst, labels, tooltips, toasts via `useDictionary()`
- [ ] Dictionary entries voor alle 7 talen

### Fase 4: Toolbox Homepage
- [ ] Simpeler, cleaner design
- [ ] Quick-access grid met tool icons
- [ ] Recent activity als subtiele lijst

### Fase 5: Polish
- [ ] framer-motion animaties
- [ ] Consistent typography (font-weight: 400)
- [ ] Dark mode check

## Design Tokens
- Geen bold text (font-weight: 400)
- Rounded buttons (border-radius: full)
- Ocean theme: #0077b6, olive, #c5b299
- Light: white bg, black text | Dark: dark bg, white text
- Font: Geist/Inter/Helvetica
