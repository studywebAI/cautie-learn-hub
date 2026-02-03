

# Implementation Plan: Phase 2-4 Assignment Editor Enhancements

## Summary

Implementing lock/checkmark icons per block, assignment settings overlay with visibility/answers controls, and AI grading presets system.

---

## Phase 2: Lock and Checkmark Icons per Block

### 2.1 Block State Changes

**Add to block data structure:**
- `locked: boolean` - Whether the block's answer is locked as "correct"
- `showFeedback: boolean` - Whether to show correct/incorrect feedback

**Visual behavior:**
- **Unlocked**: Lighter text/outline, editable
- **Locked**: Normal colors, closed lock icon, answer saved as correct, question not editable

### 2.2 Icon Placement

Icons appear just below the block outline when block is selected:
- Lock icon (always visible for teachers)
- Check icon (only when `answers_enabled` is ON)
- AI Settings icon (Phase 4, teachers only)

### 2.3 Files to Modify

| File | Changes |
|------|---------|
| `app/components/AssignmentEditor.tsx` | Add lock/check/AI icons below block, add locked state styling, add `locked` to block data |

---

## Phase 3: Assignment Settings Overlay

### 3.1 New Component: AssignmentSettingsOverlay

Small overlay with two toggles:
- **Visible/Invisible**: Controls student access
- **Answers On/Off**: Controls self-check feature

Triggered by:
1. Gear icon in assignment list (paragraph page)
2. Gear icon in assignment editor toolbar
3. Clicking eye/check icons in assignment list

### 3.2 Assignment List Icons

Each assignment row shows:
- Eye/Eye-off icon for visibility
- Check/X icon for answers status

Clicking either opens the settings overlay.

### 3.3 Database Migration

```sql
ALTER TABLE assignments 
ADD COLUMN is_visible boolean DEFAULT true;
```

### 3.4 API Changes

Update `app/api/assignments/[assignmentId]/route.ts` to handle `is_visible` and `answers_enabled` in PUT request.

### 3.5 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `app/components/AssignmentSettingsOverlay.tsx` | Create | Reusable settings overlay |
| `app/(main)/.../paragraphs/[paragraphId]/page.tsx` | Modify | Add visibility/answers icons, overlay trigger |
| `app/components/AssignmentEditor.tsx` | Modify | Add gear icon to toolbar |
| `app/api/assignments/[assignmentId]/route.ts` | Modify | Add PATCH for visibility/answers_enabled |
| `app/lib/supabase/database.types.ts` | Modify | Add is_visible type |
| `supabase/schema_migration.sql` | Modify | Add is_visible column migration |

---

## Phase 4: AI Grading Presets

### 4.1 Preset Data Structure

```typescript
interface GradingPreset {
  id: string;
  name: string;
  is_default: boolean;
  settings: {
    strictness: number; // 1-10 slider
    partial_credit: boolean;
    spelling_matters: boolean;
    grammar_matters: boolean;
    case_sensitive: boolean;
    custom_instructions: string;
    ai_enabled: boolean;
  };
}
```

### 4.2 AI Settings Icon Behavior

- Third icon per block (only for teachers)
- Opens preset configuration panel
- Can select existing preset or create new one
- Per-block override option

### 4.3 Preset Storage

Presets stored in user preferences or new `grading_presets` table linked to user account.

### 4.4 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `app/components/AIGradingPresets.tsx` | Create | Preset management UI |
| `app/api/users/grading-presets/route.ts` | Create | CRUD for presets |
| `app/components/AssignmentEditor.tsx` | Modify | Add AI settings icon, integrate presets |
| `app/components/grading/ai-grading-assistant.tsx` | Modify | Use presets when grading |

---

## Implementation Order

1. **Phase 2**: Lock/checkmark icons in AssignmentEditor.tsx
2. **Phase 3.1**: Create AssignmentSettingsOverlay component
3. **Phase 3.2**: Add visibility/answers icons to paragraph page
4. **Phase 3.3**: Update assignment API for visibility/answers
5. **Phase 3.4**: Add gear icon to editor toolbar
6. **Phase 4.1**: Create AIGradingPresets component
7. **Phase 4.2**: Create presets API
8. **Phase 4.3**: Integrate presets with blocks

---

## Technical Notes

### Build System
This is a Next.js project. The warnings about `vite.config.ts`, `index.html`, and `build:dev` are incorrect and should be ignored. The project builds with `next build`.

### Lock State Logic
- When locked: `block.data.locked = true`
- Current answers become correct answers
- Students can still modify their answers (score updates)
- Teachers cannot edit question until unlocked

### Visibility Logic
- `is_visible = false`: Assignment hidden from students
- Teachers always see all assignments (with "hidden" indicator)

