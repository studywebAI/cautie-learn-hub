# 100% Closure Verification (2026-04-16)

## Environment
- Local app: `http://127.0.0.1:9003`
- Backend: linked Supabase project `lrcaoisrfragkvmofeyg`
- Runtime method: disposable users/classes/hierarchy seeded per run, then cleaned up

## Runtime Verification Results

### 1) Class Ops Runtime (`scripts/verify-class-ops-runtime.mjs`)
- Status: PASS
- Verified:
  - Attendance GET returns students only (teacher excluded)
  - Attendance POST actions persist row + audit codes:
    - Present -> `EVT-ATT-001`
    - Absent -> `EVT-ATT-001`
    - Homework -> `EVT-ATT-001`, `EVT-ATT-002`
    - Late -> `EVT-ATT-001`, `EVT-ATT-003`
    - Custom event -> `EVT-ATT-001`, `EVT-CUS-001`
  - Rename persists to `class_members.display_name` and writes `member_rename` with `ROS-MEM-001`
  - Alias propagates in Group + Attendance + Logs
  - Logs filters (`category`, `code`) return correctly filtered rows
- Evidence class id (cleaned after run): `8008da9d-3b28-4f5a-a015-d29b21581c3d`

### 2) Assignment + UI Runtime (`scripts/verify-assignment-and-ui-runtime.mjs`)
- Status: PASS
- Verified Group UI parity:
  - Teachers section above students
  - No profile images
- Verified Attendance UI parity:
  - Exactly 6 row actions
  - No inline recent activity block
  - No profile images
  - No teacher rows in attendance roster
- Verified Assignment editor behavior:
  - Edit toggle is functional (`Edit: On` / `Edit: Off`)
  - Text header disabled before selection, enabled after selecting block
  - Size slider changes block width (`100% -> 38%`)
  - Add text block via UI drag/drop auto-focuses new header input
  - Persistence after reload:
    - `Runtime Edited Header` saved
    - `Runtime Added Header` saved
  - DB persistence confirmed:
    - existing block updated (`PUT`)
    - new block created (`POST`)
- Evidence class id (cleaned after run): `ff31a4de-cd2c-43a2-961f-585e0d754f3f`

## Type-Safety Verification
- Command: `npm run typecheck`
- Result: PASS (`tsc --noEmit` clean)
- Note: `.next/dev/types/routes.d.ts` was corrupted after dev runtime sessions; removed `.next` and reran cleanly.

## Schema Compatibility Fix Applied
- Linked DB fix executed:
  - Added missing `public.blocks.updated_at` column required by existing update trigger.
- Source-controlled migration added:
  - `supabase/migrations/20260416_blocks_updated_at_compat.sql`

## Additional API Compatibility Fix Applied
- `GET /api/classes/[classId]/group` submissions lookup now uses `submitted_at` (and no longer selects missing `submissions.created_at`) to keep logs clean in environments where that legacy column is absent.
