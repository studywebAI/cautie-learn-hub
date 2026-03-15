# Cautie Product IA + Preload Redesign Plan

## 0) Why This Exists

This document is the implementation source of truth for the new Cautie information architecture (IA).

The change is foundational:

- Teacher workspace becomes strictly class-first.
- Student workspace becomes mode-first (`School` vs `Tools`).
- Navigation, data loading, routes, and empty states all change together.

This plan is intentionally explicit so any agent or engineer can execute without guessing.

---

## 1) Decisions Locked (From Product Discussion)

## 1.1 Teacher IA

- We are using IA Option 1 (strict class context).
- Teachers always have an active class context when they are in class-scoped pages.
- Class switching keeps the user on the same page, only changes class data.
  - Example: if teacher is on `Subjects`, switching class keeps them on `Subjects` and loads subjects for the selected class.
- Global teacher class overview is no longer the center of the product.
- The product center is: selected class + selected page/tab.

## 1.2 Class Creation / Collaboration Entry

- Single CTA at top of class section: `+ New class`.
- Clicking `+ New class` opens a menu.
- First menu level has exactly 2 options:
  - `Create new class`
  - `Join as teacher (collaborate)`
- Each option opens its own submenu / flow:
  - Create flow: name, optional metadata, create.
  - Join flow: join code, QR scan (and any existing join mechanics).

## 1.3 Student IA

- Student app has 2 product modes in a switcher dropdown:
  - `School`
  - `Tools`
- Visual/layout language for `Tools` should be clearly different from current school layout.
- `School` contains classes/subjects/assignments/agenda.
- `Tools` contains tool-first workflows.

## 1.4 Tools <-> School Bridge Direction

- Bridge direction priority is School -> Tools.
- User can launch tool actions from school context (example: generate quiz from subject/chapter/assignment context).
- Optional return link from tools output to attach/save back to school context can be added later, but the core bridge starts in School.

## 1.5 Shared Features Approved

Build these into v1/v1.1:

- Cross-mode notification center.
- Recent contexts (last class, last tool, last mode).
- Global quick switch command (`Cmd/Ctrl + K`).
- Role-aware first-time empty states.
- Smart defaults (reopen last class/mode/page).
- Clear permission handling for co-teachers.
- Search policy: class-scoped first, optional global fallback.

---

## 2) Product Principles (Must Not Be Violated)

1. Context is always visible.
- Header/sidebar must show where user is now (`Teacher > Class A > Subjects` or `Student > Tools > Quiz`).

2. Switching context does not change intent.
- Class switch should not throw user to dashboard.
- Mode switch should move to default page in that mode (or last page in that mode if known).

3. Fast feel over perfect completeness.
- Keep preload cache + optimistic transitions.
- Avoid hard loading states where we can show previous page skeleton + replace data.

4. Permission safety first.
- No leakage of classes, subjects, or assignments across class boundaries.

5. Backward compatibility by redirect, not silent breakage.
- Old global routes must redirect to class-aware equivalents where possible.

---

## 3) Current-State Notes (Observed in Repo)

These observations inform migration strategy:

- Main shell mounts `AppSidebar` in [`app/(main)/layout.tsx`](C:/Projects/cautie-learn-hub/app/(main)/layout.tsx).
- Sidebar already contains:
  - class dropdown behavior,
  - subject dropdown behavior,
  - local `studyweb-last-class-id` usage,
  - student lane toggle concept (`assigned` vs `tools`) in [`app/components/sidebar.tsx`](C:/Projects/cautie-learn-hub/app/components/sidebar.tsx).
- Dashboard currently redirects teachers with classes to `/class/{id}?tab=subjects` in [`app/(main)/page.tsx`](C:/Projects/cautie-learn-hub/app/(main)/page.tsx).
- Current `/subjects` page for teachers already supports class context selection in [`app/(main)/subjects/page.tsx`](C:/Projects/cautie-learn-hub/app/(main)/subjects/page.tsx).
- App context exposes preload resources (`classes:list`, `subjects:list`) in [`app/contexts/app-context.tsx`](C:/Projects/cautie-learn-hub/app/contexts/app-context.tsx).

Implication:
- We can evolve existing behavior; this is not a greenfield rewrite.

---

## 4) Target IA

## 4.1 Teacher IA (Class-First)

Top-level teacher shell:

1. Class context block (sidebar top)
  - Class switcher
  - `+ New class` CTA
2. Class-scoped navigation (same order everywhere)
  - Overview (optional lightweight, no old global summary dependence)
  - Subjects
  - Students
  - Assignments
  - Agenda
  - Materials
  - Settings
3. Utility/global controls
  - Notifications
  - Search
  - Command palette
  - Profile/settings

Behavior rule:
- If user switches class while on a class-scoped page, keep route shape and swap class id / data source.

## 4.2 Student IA (Mode-First)

Top-level student shell:

1. Product mode switcher (always visible)
  - School
  - Tools
2. Mode-local navigation:
  - School nav: Classes, Subjects, Assignments, Agenda, Progress
  - Tools nav: Tool library, Recents, Saved outputs, Templates
3. Shared global controls:
  - Notifications
  - Command palette
  - Profile/settings

---

## 5) Navigation + Routing Model

## 5.1 Canonical Route Strategy

Use explicit context in route path for class-scoped teacher pages:

- `/class/[classId]` (default class overview tab)
- `/class/[classId]/subjects`
- `/class/[classId]/subjects/[subjectId]`
- `/class/[classId]/students`
- `/class/[classId]/assignments`
- `/class/[classId]/agenda`
- `/class/[classId]/materials`
- `/class/[classId]/settings`

Student mode routes:

- `/school` (default school landing)
- `/school/classes`
- `/school/subjects`
- `/school/assignments`
- `/school/agenda`
- `/school/progress`

- `/tools` (default tools landing)
- `/tools/quiz`
- `/tools/flashcards`
- `/tools/notes`
- `/tools/...` (future tools)

## 5.2 Legacy Route Handling

Maintain compatibility redirects:

- `/subjects`:
  - Teacher: redirect to `/class/{activeClassId}/subjects`
  - Student: redirect to `/school/subjects`
- `/classes`:
  - Teacher: keep as management utility page or redirect to active class route.
  - Student: redirect to `/school/classes`.
- `/agenda`:
  - Teacher: `/class/{activeClassId}/agenda`
  - Student: `/school/agenda`

Log redirect events for 2 releases to identify stale links.

## 5.3 Class Switch Route-Preservation Rules

Given `currentRoute` and `nextClassId`, transform:

- `/class/{old}/subjects` -> `/class/{next}/subjects`
- `/class/{old}/subjects/{subjectId}`:
  - If subject exists in next class and slug/id mapping valid, preserve subject route.
  - Else fallback to `/class/{next}/subjects` with info toast.
- `/class/{old}/assignments` -> `/class/{next}/assignments`
- `/class/{old}/agenda` -> `/class/{next}/agenda`
- Any unknown class route -> `/class/{next}`

This transformation should be centralized in one helper to avoid divergence.

---

## 6) UX Specifications

## 6.1 Sidebar: Class Block

At top of sidebar for teachers:

1. Class selector button/dropdown
- Shows current class name.
- Shows status chip if archived/read-only.

2. `+ New class` button (single CTA)
- Opens menu:
  - `Create new class`
  - `Join as teacher (collaborate)`

3. Create flow
- Inputs:
  - Class name (required)
  - Optional description
- On submit:
  - Create class
  - Set as active class
  - Navigate to `/class/{newId}/subjects` (or remember previous page rule if desired)

4. Join flow
- Options:
  - Join code entry
  - QR scan
- On success:
  - Add membership
  - Set joined class active
  - Keep same page type when possible (route-preserving rule)

## 6.2 Teacher Page Header

Every class-scoped teacher page header shows:

- Class name
- Page title (Subjects, Students, etc.)
- Optional breadcrumbs when deep (subject -> chapter -> assignment)

## 6.3 Student Mode Switcher

Location:
- Top-left (same visual weight as product/workspace switchers in multi-product apps).

Interaction:
- Click opens dropdown: `School`, `Tools`.
- Keyboard accessible.
- Persist selection in local storage.

Default behavior:
- Reopen last used mode on next visit.
- If no history: default to `School`.

## 6.4 School -> Tools Bridge (Core)

School context action examples:

- From subject page: `Generate quiz from this subject`.
- From chapter/page content: `Make flashcards from this`.
- From assignment: `Create study notes`.

Bridge mechanics:

- Opens target tool route with context payload:
  - `classId`
  - `subjectId`
  - `chapterId` (optional)
  - `assignmentId` (optional)
  - `sourceText/sourceRef` (optional)

Result:
- Tool pre-fills source and context.
- User edits, runs generation.

---

## 7) Data + State Requirements

## 7.1 Core Persistent Context Keys

Local storage keys (or replacements with same semantics):

- `studyweb-last-class-id`
- `studyweb-last-mode` (`school` | `tools`)
- `studyweb-last-school-route`
- `studyweb-last-tools-route`
- `studyweb-last-tool-id` (optional for quick resume)

## 7.2 App Context Extensions

Extend global app context with:

- `activeClassId` (teacher class context)
- `setActiveClassId(classId)`
- `activeStudentMode` (`school` | `tools`)
- `setActiveStudentMode(mode)`
- `recentContexts`
  - last classes
  - last tools
  - last routes by mode

## 7.3 Preload Strategy

Keep existing preload model and extend:

Current keys:
- `classes:list`
- `subjects:list`

Proposed new preload keys:
- `class:details:{classId}`
- `class:subjects:{classId}`
- `class:students:{classId}`
- `class:assignments:{classId}`
- `school:notifications`
- `tools:recents`

Class switch preload sequence:

1. Immediately set UI pending state for target class.
2. Warm `class:subjects:{id}` + current page data key in parallel.
3. Keep current page shell mounted.
4. Swap dataset on ready.
5. Show non-blocking toast on recoverable errors.

---

## 8) Search + Notifications

## 8.1 Search Behavior

Teacher search default scope:
- Active class only.

Fallback option:
- Global search toggle (`All classes`) in search panel.

Student search:
- Scoped by active mode:
  - School mode searches school entities.
  - Tools mode searches tool outputs/templates.

## 8.2 Cross-Mode Notifications

One notification center shared across all modes/roles.

Each notification must contain:

- `scopeType`: `school` | `tools` | `system`
- `contextIds`: classId/subjectId/etc when relevant
- deep link target route

Filtering in UI:
- All
- School
- Tools

---

## 9) Permissions + Collaboration (Co-Teacher Safety)

## 9.1 Role Matrix

Minimum role semantics per class:

- Owner teacher
- Collaborating teacher
- Student

Permission examples:

- Owner teacher:
  - full class settings/membership permissions
- Collaborating teacher:
  - can teach/manage assignments/subjects
  - may have limited destructive permissions depending on policy
- Student:
  - read/submit only as configured

## 9.2 UI Permission Clarity

When collaborator lacks permission:

- Hide destructive controls where possible.
- If visible, disable with clear reason tooltip.

Never show actions that fail silently.

---

## 10) Empty States + Onboarding

## 10.1 Teacher Empty States

No classes:
- Show class-first onboarding:
  - `+ New class`
  - `Join as teacher`

No subjects in selected class:
- Show create subject CTA scoped to current class.

No assignments/students:
- Show class-contextual setup steps.

## 10.2 Student Empty States

School mode without classes:
- Show join class onboarding.

Tools mode without outputs:
- Show starter templates and first action CTA.

---

## 11) Command Palette (`Cmd/Ctrl + K`)

Required commands:

- Switch class
- Go to class page section (Subjects, Students, etc.)
- Switch mode (School/Tools)
- Open recent tool
- Open notifications
- Search in current scope

Command ranking:
- Prioritize recents and active context entities.

---

## 12) Analytics / Telemetry

Track these events for rollout confidence:

- `class_switch_started`
- `class_switch_completed`
- `class_switch_failed`
- `teacher_new_class_clicked`
- `teacher_create_class_success`
- `teacher_join_class_success`
- `mode_switch_to_school`
- `mode_switch_to_tools`
- `school_to_tool_bridge_clicked`
- `legacy_route_redirected`

Each event should include:

- user role
- previous context
- next context
- latency bucket (for key transitions)

---

## 13) Implementation Plan (Execution Phases)

## Phase 0: Stabilize and Guardrails

Goals:
- Prepare helpers, context keys, feature flags.

Tasks:

1. Add feature flags:
  - `ff_teacher_class_first_nav`
  - `ff_student_mode_switcher`
  - `ff_school_to_tool_bridge`

2. Implement centralized route/context helpers:
  - get active class id
  - transform route on class switch
  - resolve default route for role/mode

3. Add analytics stubs for context switch events.

Exit criteria:
- No user-visible behavior change yet.

## Phase 1: Teacher Class-First Shell

Goals:
- Teacher navigation fully class-first.

Tasks:

1. Sidebar updates (`app/components/sidebar.tsx`):
  - Single `+ New class` CTA with two-option menu.
  - Preserve route shape on class switch.
  - Remove/disable teacher global subjects entry patterns that violate class scope.

2. Route updates:
  - Move teacher pages to class-scoped canonical routes.
  - Add legacy redirects.

3. Header/context indicators:
  - Show active class + section name on all teacher class pages.

4. Ensure `app/(main)/page.tsx` teacher redirect points to canonical class route.

Exit criteria:
- Teacher can switch class on Subjects/Assignments/Agenda and stay on same page type.

## Phase 2: Student Mode Split

Goals:
- Student has explicit School vs Tools product modes.

Tasks:

1. Add mode switcher component in shell.
2. Create/confirm school route group and tools route group.
3. Persist/reload last mode and last route per mode.
4. Differentiate layout and visual structure for tools mode.

Exit criteria:
- Student can switch between School and Tools with persistent context.

## Phase 3: Bridge + Shared Systems

Goals:
- Connect School context to tool generation and unify shared experiences.

Tasks:

1. Add School -> Tools actions from subject/assignment surfaces.
2. Pass context payload into tool pages.
3. Add cross-mode notification center.
4. Add recents model (last class/tool/mode).
5. Add command palette commands for context switches.

Exit criteria:
- Teacher/student can start tool flows directly from school context.

## Phase 4: Hardening + Cleanup

Goals:
- Remove dead IA paths and improve reliability/performance.

Tasks:

1. Remove deprecated nav entry points.
2. Retire obsolete global class overview dependencies.
3. Optimize preload on class/mode switch.
4. Finalize telemetry dashboards and alerting.

Exit criteria:
- No critical dead links.
- Stable metrics after rollout window.

---

## 14) Technical Worklist by File Area

Note: This is a map, not an exact diff list.

## 14.1 Navigation Shell + Sidebar

- [`app/components/sidebar.tsx`](C:/Projects/cautie-learn-hub/app/components/sidebar.tsx)
  - class switch preservation
  - new class CTA/menu and flows
  - student mode switcher placement

- [`app/(main)/layout.tsx`](C:/Projects/cautie-learn-hub/app/(main)/layout.tsx)
  - inject mode-aware header or context bar if needed

- [`app/components/global-command-palette.tsx`](C:/Projects/cautie-learn-hub/app/components/global-command-palette.tsx)
  - commands for class/mode switch

## 14.2 Route Entrypoints

- [`app/(main)/page.tsx`](C:/Projects/cautie-learn-hub/app/(main)/page.tsx)
  - canonical teacher redirect
  - student default mode redirect

- [`app/(main)/subjects/page.tsx`](C:/Projects/cautie-learn-hub/app/(main)/subjects/page.tsx)
  - migrate to class-scoped canonical route usage

- [`app/(main)/classes/page.tsx`](C:/Projects/cautie-learn-hub/app/(main)/classes/page.tsx)
  - keep only necessary management/join behavior

## 14.3 Shared Context + Preload

- [`app/contexts/app-context.tsx`](C:/Projects/cautie-learn-hub/app/contexts/app-context.tsx)
  - active mode/class state
  - recents
  - preload key expansion

## 14.4 Notifications + Search

- [`app/components/notifications/notification-center.tsx`](C:/Projects/cautie-learn-hub/app/components/notifications/notification-center.tsx)
  - cross-mode filters and deep links

- teacher search components (existing search panel files)
  - class-first scope defaults

---

## 15) API and Backend Considerations

No immediate schema rewrite required for IA shift, but enforce these:

1. Class-scoped query enforcement
- Teacher-facing data APIs must require active class or class filter where relevant.

2. Membership checks
- Co-teacher membership verification on all class write routes.

3. Join flows
- Teacher join endpoint must mark role as collaborator/teacher correctly.

4. Notifications model
- Include scope metadata for School/Tools filtering.

---

## 16) Test Plan

## 16.1 Core Functional Scenarios

Teacher:

1. On `/class/A/subjects`, switch to class B, stay on subjects view.
2. On `/class/A/assignments`, switch to class B, stay on assignments view.
3. Join class as teacher via code, become collaborator, class appears in switcher.
4. Create class via `+ New class`, class becomes active.
5. Search defaults to selected class.

Student:

1. Switch School -> Tools -> School, mode and last route persist.
2. School page launches quiz/flashcards tool with context payload.
3. Notifications show mixed School/Tools items and filter correctly.

## 16.2 Permission Scenarios

1. Collaborating teacher cannot execute restricted owner-only actions.
2. Student cannot access teacher class settings routes.
3. Cross-class data leakage checks across APIs and UI.

## 16.3 Routing/Redirect Scenarios

1. Old `/subjects` route redirects by role/context.
2. Old `/agenda` route redirects by role/context.
3. Broken subject-in-new-class edge falls back to `/class/{id}/subjects` gracefully.

## 16.4 Performance Scenarios

1. Class switch P95 latency target: define and enforce (example <= 600ms perceived).
2. No full app remount on class switch.
3. Preload cache hit rate monitored after rollout.

---

## 17) Rollout Strategy

1. Internal dogfood with feature flags enabled for team accounts.
2. Small teacher cohort rollout (5-10%).
3. Monitor:
  - class switch success/failure rate
  - time-to-first-action after switch
  - redirect volume from legacy routes
4. Expand to all teachers.
5. Enable student mode switcher progressively.
6. Remove legacy nav paths after stability window.

Rollback plan:

- Disable feature flags in reverse order:
  - `ff_school_to_tool_bridge`
  - `ff_student_mode_switcher`
  - `ff_teacher_class_first_nav`

---

## 18) Open Decisions (Need Product Confirmation Before Final Build)

1. Teacher `/classes` route final behavior:
- Option A: keep as management utility page.
- Option B: always redirect to active class route.

2. Teacher lightweight class overview:
- keep minimal overview tab vs direct default to subjects.

3. Mode switcher copy:
- `School`/`Tools` (current) or alternative naming.

4. Bridge save-back phase timing:
- v1 (school -> tools only) or v1.1 include tools output attach-back.

---

## 19) Agent Handoff Checklist

Any implementation agent should complete this checklist before opening PR:

1. Confirm class switch preserves route intent on every class-scoped teacher page.
2. Confirm `+ New class` menu contains only 2 top-level options.
3. Confirm student mode switcher is global and persistent.
4. Confirm School -> Tools bridge exists on at least 2 school surfaces.
5. Confirm search defaults to class scope for teachers.
6. Confirm collaborator permissions are clear in UI.
7. Confirm legacy route redirects are implemented and tracked.
8. Confirm command palette supports class/mode switching.
9. Confirm empty states are role-aware and actionable.
10. Confirm no critical regressions in assignments/agenda flows.

---

## 20) Definition of Done (Program-Level)

This redesign is done when:

1. Teachers experience class-first navigation everywhere.
2. Class switching preserves page intent and feels instant.
3. Students have explicit School and Tools products with persistent mode context.
4. School -> Tools bridge is live and used.
5. Notifications/search/command palette all respect active context.
6. Legacy routes are safely redirected with low error rates.
7. Permission boundaries remain correct for owner/collaborator/student roles.

