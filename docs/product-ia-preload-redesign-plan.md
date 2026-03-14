# Product IA + Intro Preload Redesign Plan

Last updated: 2026-03-14  
Project: `C:\Projects\cautie-learn-hub`

## Why this exists
This document captures the agreed direction for making the app feel more professional and less MVP:
- Cleaner information architecture (especially teacher vs student flows)
- Intro/splash that reflects real readiness (not fake/early cut-off)
- Better first-impression loading for sidebar destinations and class workspace tabs
- Practical rollout plan we can execute incrementally

## Non-Negotiable Product Rule
1. Never ship a half-baked product.
2. No placeholders, fake states, or "temporary" UX that looks unfinished.
3. If a flow is visible to users, it must behave as production-quality and complete.

## Goals
1. Make teacher UX class-centered, faster, and clearer.
2. Give students a cleaner split between teacher-assigned work and personal tools.
3. Ensure intro only ends when:
- animation has fully completed
- critical app shell data is ready
4. Warm likely next views in background so first clicks feel instant.

## Current State (Repo Context)
Observed from current codebase:

1. Intro gating
- `app/(main)/layout.tsx` now gates splash by `appReady && introAnimationDone`.
- Animation completion is signaled from wordmark/highlight callbacks (`StartupSplash` -> `CautieWordmark`).
- Logging has been added for intro lifecycle.

2. Data bootstrap
- `app/contexts/app-context.tsx` currently:
- loads cached dashboard data from localStorage
- fetches `/api/dashboard`
- also calls `preloadFirstImpressionData()` for `/api/classes` and `/api/subjects`
- sets `appReady` after init finishes

3. Sidebar behavior
- `app/components/sidebar.tsx` still fetches classes/subjects independently for dropdowns and hover/open behavior.
- This duplicates preload responsibility already in context.

4. Teacher class workspace
- `app/(main)/class/[classId]/page.tsx` loads active tab lazily and caches tab data (`tabDataCache`).
- Only active tab is fetched immediately; other tabs remain cold until visited.

5. IA today
- Top-level nav includes both classes/subjects and tools.
- Teacher has a class workspace, but global structure still competes with it.
- Student and teacher experiences are role-gated but not cleanly separated into strong lanes.

## Product Direction (Chosen)
Default direction:
- Teacher: **Hybrid class-first**
- Student: **Two-lane shell** (`Assigned` and `Tools`)
- Preload: **Staged preload**

This balances performance, clarity, and migration safety without a massive one-shot rewrite.

## Inspiration Patterns To Borrow
Use these as UX reference styles (not literal copies):

1. Linear: workspace switcher + fast context changes.
2. Notion: clear nav grouping and hierarchy.
3. Slack: strong context scoping once inside a workspace.
4. Canvas/Google Classroom: assigned work clarity and deadlines-first student lane.
5. Stripe/GitHub: clean density and progressive hydration.
6. Figma: command-palette style “jump to” behavior.
7. VS Code: sectioned activity model (study lane vs tools lane).

## Target IA

### Teacher IA (Hybrid class-first)
1. Primary entry after login: class workspace (`/class/[classId]`).
2. Global `/classes` remains for admin/discovery actions:
- create/archive/search/sort
- class inventory
3. Class-scoped operations stay in class workspace:
- subjects, chapters, assignments, analytics, settings, group, attendance, progress
4. Optional global cross-class analytics page can remain separate.

### Student IA (Two-lane shell)
1. Sidebar top control toggles:
- `Assigned` (teacher-driven work)
- `Tools` (self-study utilities)
2. Assigned lane includes:
- classes, upcoming deadlines, assigned material, required actions
3. Tools lane includes:
- quiz/flashcards/notes and self-driven learning features
4. One visual system across both lanes to avoid “two products” feeling.

## Intro + Preload Architecture (Staged)

### Tier model
1. Tier 0 (blocking intro)
- session + role
- class list
- subject list
- first route shell data

2. Tier 1 (immediate background warm)
- active class lightweight tab payloads (invite/group/subjects summaries)

3. Tier 2 (opportunistic warm)
- heavier tabs (analytics/progress/attendance/settings)
- prioritize recent/frequent classes only

### Rule
Intro finishes only when both are true:
1. `introAnimationDone === true`
2. `tier0Ready === true`

### Orchestration
Create one preload orchestrator in app context:
- centralized key-based warm/load
- dedupe in-flight requests
- status map per key (`idle/loading/ready/error`)
- replace duplicated class/subject prefetch logic in sidebar

## Interface / Contract Additions
Planned additions:
1. `PreloadResourceKey` type (e.g. `classes:list`, `subjects:list`, `class:{id}:group`)
2. `PreloadSnapshot` state object with timestamps/status
3. App context additions:
- `preloadSnapshot`
- `warmResources(keys)`
- `isTier0Ready`
4. Optional API bundle endpoint (recommended for latency):
- `GET /api/preload/bootstrap?classIds=...`

## UX Quality Guardrails
Definition of “more professional/clean” for this product:
1. Consistent naming semantics in nav (no mixed intent labels).
2. Stable visual density and typography scale.
3. Role/context-aware empty states with clear next actions.
4. Predictable loading patterns and skeletons.
5. Remove duplicate fetch/state ownership that causes jitter.

## Phased Delivery Plan

### Phase 1: Preload foundation + intro truthfulness
1. Introduce preload orchestrator in `AppContext`.
2. Move class/subject first-impression ownership into orchestrator.
3. Sidebar consumes orchestrator state; remove duplicate fetch loops.
4. Keep current IA unchanged in this phase.

Exit criteria:
- intro ends only after animation + Tier 0 data
- first open of classes/subjects feels warm without extra spinner flicker

### Phase 2: Teacher class-first tightening
1. Add prominent class switcher in sidebar/header.
2. Route teacher post-login into last-active or first class workspace.
3. Reframe `/classes` as management index (not primary daily destination).

Exit criteria:
- teacher can do daily tasks without bouncing between global pages

### Phase 3: Student two-lane shell
1. Add `Assigned` / `Tools` lane selector at top of sidebar.
2. Reorganize nav links under the lane model.
3. Keep feature parity while improving discoverability.

Exit criteria:
- students clearly understand “what teacher expects” vs “what I can use”

### Phase 4: Polish + performance hardening
1. Command palette for quick navigation.
2. Recent/favorite classes and subjects.
3. Progressive warm strategy tuning based on real usage.

Exit criteria:
- faster perceived navigation
- cleaner interaction model and less MVP feel

## Testing and Validation
1. Intro lifecycle
- does not close before animation completion
- does not close before Tier 0 ready
- closes promptly once both are true

2. Preload correctness
- no duplicate network calls for same key
- warm data reused by sidebar/class views
- fallback works on failed warm requests

3. Teacher flow
- class switch changes context correctly
- class workspace contains key daily operations

4. Student flow
- lane switch is clear and state-safe
- assigned and tools responsibilities remain clearly separated

5. Regression checks
- role handling still follows `subscription_type`
- class/subject create/join/update paths remain functional

## Risks and Tradeoffs
1. Over-preloading can slow startup on weak networks.
- Mitigation: staged preload and strict Tier 0 budget.
2. IA shift can confuse existing users.
- Mitigation: hybrid rollout + keep global management entry points.
3. Multiple caches can diverge.
- Mitigation: single orchestrator ownership and key invalidation rules.

## Decision Log (Current Defaults)
1. Teacher model: Hybrid class-first.
2. Student model: Two-lane (`Assigned` + `Tools`).
3. Preload model: Staged tiers.
4. Intro model: animation + Tier 0 readiness gate.
5. Execution strategy: phased migration, no big-bang rewrite.

## Immediate Next Implementation Slice
1. Add preload orchestrator state and API in app context.
2. Move sidebar class/subject preload to orchestrator consumption.
3. Keep existing routes; improve readiness and consistency first.
4. Instrument timings for Tier 0/Tier 1/Tier 2 to tune thresholds.
