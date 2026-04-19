# High-Impact 6 Technical Closure

Last updated: 2026-04-19
Scope: critical UI + API + DB differences only (no fake checklist closure)

## 1. Agenda Core (Teacher + Student)
- Goal: stable agenda flows with immediate creation/update behavior and no stale interaction patterns.
- Acceptance:
  - Teacher can create/update/delete agenda items with instant UI reflection.
  - Student sees only available/published items.
  - Agenda item operations emit audit events.

## 2. Tools + Link Ingestion
- Goal: URL/file ingestion must be reliable, deduplicated, and free from stuck loading states.
- Acceptance:
  - URL dedupe uses canonical URL key (no false duplicates due to tracking params/hash).
  - URL extraction timeout/errors surface clear actionable messages.
  - Source cards never stay loading forever.

## 3. AI Failover + Security
- Goal: Gemini -> OpenAI fallback executes only for relevant provider/runtime error classes, with secure key handling.
- Acceptance:
  - Auto mode attempts fallback only for retryable provider failures.
  - User key remains encrypted-at-rest and never returned in plaintext.
  - Provider failures persist to `ai_error_logs`.

## 4. Recents + Integrations
- Goal: recents UX must stay available even when one backend source fails.
- Acceptance:
  - Recents render from partial data using tolerant fetch strategy.
  - No Microsoft dependency is required for local recents to load.
  - UI remains responsive when one recents source endpoint errors.

## 5. i18n (Touched Surfaces)
- Goal: remove obvious hardcoded text in high-traffic settings/tools surfaces touched in this closure run.
- Acceptance:
  - Settings labels and core helper text use locale mapping in-file (until fully dictionary-backed refactor).
  - No newly added strings are hardcoded English-only.

## 6. SQL / Migration Integrity
- Goal: keep launch SQL path deterministic and safe.
- Acceptance:
  - Canonical migration path remains `supabase/migrations/*.sql`.
  - Debug/temp/emergency SQL stays excluded from launch runbook.
  - Validation scripts regenerate launch SQL and marker outputs.

