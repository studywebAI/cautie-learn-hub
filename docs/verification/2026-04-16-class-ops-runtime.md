# Class Ops Runtime Verification (2026-04-16)

## Environment
- Local app: `http://127.0.0.1:9003` (Next dev server)
- Backend: linked Supabase project `lrcaoisrfragkvmofeyg`
- Auth: real Supabase teacher session cookie
- Data setup: disposable class + teacher + 2 students, cleaned up after run

## Verification Scope
- Attendance GET students-only roster
- Attendance POST actions:
  - Present
  - Absent
  - Homework
  - Late
  - Custom event
- Class-scoped rename (`PATCH /api/classes/[classId]/members`)
- Alias propagation across Group, Attendance, Logs
- Logs filter behavior (`category`, `code`)

## Results
- Attendance GET returned only student rows (teacher excluded): PASS
- Attendance action persistence (`student_attendance` + `audit_logs`): PASS
- Rename persistence (`class_members.display_name` + `ROS-MEM-001` audit row): PASS
- Alias propagation across Group/Attendance/Logs: PASS
- Logs filtering by category/code: PASS

## Evidence Snapshot
Class used during run: `aeea417e-8ad3-4e5b-8601-4a76572b490c` (cleaned up after verification)

### Attendance Actions
| Action | API Status | Attendance Row ID | Required Log Codes Found |
|---|---:|---|---|
| Present | 200 | `7f9b441e-8569-4db0-b7dc-a0db2148dfbf` | `EVT-ATT-001` |
| Absent | 200 | `747e7c16-da0d-43d5-8bad-f539172e0c05` | `EVT-ATT-001` |
| Homework | 200 | `b7110dab-9b2a-466a-a545-01444c6ae389` | `EVT-ATT-001`, `EVT-ATT-002` |
| Late | 200 | `331019b8-dd71-4958-813c-50a071cafc5f` | `EVT-ATT-001`, `EVT-ATT-003` |
| Custom event | 200 | `03846535-ec70-436c-9776-b7cbb4856cd0` | `EVT-ATT-001`, `EVT-CUS-001` |

### Rename
- Member row updated:
  - `class_id`: `aeea417e-8ad3-4e5b-8601-4a76572b490c`
  - `user_id`: `a8856058-160c-4650-b243-9ac7b1d29837`
  - `display_name`: `Runtime Alias Student`
- Audit row:
  - `action`: `member_rename`
  - `log_code`: `ROS-MEM-001`
  - `log_category`: `roster`
  - `audit_log_id`: `9d9dbb38-770b-48fa-970a-7ebf1e9947bc`

### Logs Filter Checks
- `GET /api/classes/[classId]/audit-logs?category=events`: all returned `log_category = events`
- `GET /api/classes/[classId]/audit-logs?code=ROS-MEM-001`: all returned `log_code = ROS-MEM-001`

## Notes
- The first verification run failed on attendance writes due RLS. Fix applied in attendance API to use admin client for attendance/audit write path and teacher read path where needed.
- Re-run completed fully with all checks passing.
