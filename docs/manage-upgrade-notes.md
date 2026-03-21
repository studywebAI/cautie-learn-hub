# Manage Upgrade Notes

- Requirement locked: if something is not 100% clear, ask questions before finalizing behavior.
- Keep teacher collaboration equal: no owner hierarchy between teachers at class level.
- Every settings change must be database-backed (no fake local-only switches for shared class behavior).
- Any new/changed table logic must be shipped as a `.sql` file for Supabase SQL editor.
- Add extensive logging for every class tab (`invite`, `group`, `subjects`, `grades`, `attendance`, `announcements`, `progress`, `analytics`, `settings`, `chapters`, `materials`, `students`, `assignments`).
- Prefer structured telemetry payloads over ad-hoc strings.
