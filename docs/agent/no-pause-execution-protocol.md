# No-Pause Execution Protocol

Purpose: keep launch implementation moving in uninterrupted delivery mode, with verification before handoff.

## Operating Rules
1. Work in one continuous run per scope slice: explore -> implement -> verify -> document.
2. Do not stop after planning when implementation is requested.
3. Do not mark work complete without runtime evidence and DB/API proof where applicable.
4. If a blocker appears, patch around it immediately (schema compatibility, fallback path, retry-safe flow), then re-run verification.
5. Keep source of truth docs updated in the same run (open items + verification report + migration log).

## Mandatory Verification Gate
For every completed slice:
- Runtime flow test passes (UI + API + persistence).
- Relevant DB rows/log rows verified when the feature is server-backed.
- `npm run typecheck` passes.
- ESLint passes on touched files.

## Launch Closure Sequence
1. Read open-items and plan docs.
2. Pick one coherent vertical slice.
3. Implement all UI + API + DB pieces for that slice.
4. Run runtime verifier(s).
5. Fix failures and rerun until green.
6. Update closure docs with evidence.
7. Move to next slice without pausing.

## Truthfulness Rule
Never claim "100% complete" unless:
- open items are actually closed,
- runtime verification is green,
- typecheck is green,
- no known blocker remains.
