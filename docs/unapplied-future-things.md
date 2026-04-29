# Unapplied Future Things

Last updated: 2026-04-29

This file tracks features that are in codebase planning/partial state but are not fully shipped in UX yet.

## 1) School Schedule UI (hidden for now)
- Decision: hide school schedule from the class UI for now.
- UI status: hidden from class tabs (`schedule` tab removed from teacher tab list).
- Backend status: still implemented and available in API/routes:
  - `/api/classes/[classId]/school-schedule`
  - `/api/school-schedule`
- Estimated completeness:
  - backend/data: ~85%
  - UX for launch quality: ~35%
- Current direction: keep endpoints intact, re-introduce when design/system parity pass is complete.

## 2) Ideas Board (community polling)
- Goal: community-style intake where users submit ideas and vote.
- Implemented in this pass:
  - DB migration:
    - `supabase/migrations/20260429_ideas_board_v1.sql`
  - API:
    - `GET/POST /api/ideas-board`
    - `POST /api/ideas-board/[ideaId]/vote`
  - UI page:
    - `/ideas-board` via `app/(main)/ideas-board/page.tsx`
  - Sidebar profile menu entry:
    - added under account dropdown as `Ideas Board`.
- Seed poll ideas added:
  - Voice-first study mode (microphone input/output)
  - Source-backed deep questions
  - Auto timelines and custom diagrams
- Additional implementation completed:
  - Admin lifecycle control API:
    - `POST /api/ideas-board/[ideaId]/stage`
  - Admin poll status control API:
    - `POST /api/ideas-board/polls/[pollId]/status`
  - UI now supports:
    - submitted -> candidate promotion
    - candidate community voting
    - admin monthly poll creation from candidates
    - poll open/close/archive controls
    - roadmap stage updates (planned/shipped)
- Estimated completeness:
  - backend/data: ~92%
  - UX moderation/workflow: ~82%
- Remaining later iteration (not applied yet):
  - explicit monthly scheduler/auto-close
  - separate staff role model (beyond `subscription_type`)
  - richer moderation audit trail

## 3) Tools settings unification (planned, not fully applied)
- Requested direction:
  - real settings only (layout, prior knowledge level, visuals/photos toggle, source depth)
  - premium-gated advanced generation (source-backed outputs, diagrams, timelines)
  - remove low-value/no-op settings
- Current status:
  - mixed implementations across tools pages and editors
  - some controls exist but are inconsistent between notes/quiz/studyset flows
- Estimated completeness:
  - backend capability: ~60%
  - consistent UX layer: ~25%
- Next implementation wave:
  - single shared `ToolRuntimeSettings` schema + shared panel component
  - per-tier enforcement tied to subscription checks and upgrade CTA

## 4) Feature inventory from repository markers
- Existing broader backlog files already in repo:
  - `app/PROGRESS.md`
  - `docs/launch/launch-master-open-items.md`
  - `docs/launch/launch-closure-tracker.md`
- High-signal files with many future/placeholder markers from latest scan:
  - `app/lib/tool-i18n.ts`
  - `app/components/AssignmentEditor.tsx`
  - `app/components/dashboard/teacher/class-settings.tsx`
  - `app/(main)/settings/page.tsx`
  - `app/components/tools/source-input.tsx`

## 5) Current product direction notes
- Theme system:
  - keep strict surface hierarchy (`background` -> `panel` -> `interactive` -> `chip`) independent of theme palette.
  - themes should only swap color values, not layout/surface hierarchy.
- Group tab:
  - student rename flow should stay list-first, quick-select, and keyboard save.
- Schedule:
  - remain hidden in class UI until parity pass is signed off.
