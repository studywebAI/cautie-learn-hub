# OpenRouter Lockdown + Tool UX Runbook

## Purpose
This runbook defines the durable system contract for Cautie tool generation flows, class-share interoperability, and UI consistency policy.

## Scope
- AI routing contract for tool flows.
- Model lock contract.
- Provider telemetry contract.
- Source-input import contract.
- Send-to-class UX contract.
- Accent color target contract.
- Rollback and recovery contract.

## 1. AI Routing Contract

### 1.1 Allowed provider path
- Tool generation flows must execute through OpenRouter-compatible OpenAI endpoint path only.
- Direct Gemini provider execution path is disallowed for targeted tool flows.

### 1.2 Locked provider preference
- Runtime `providerPreference` is locked to `openai` enum value (OpenRouter-compatible route).
- `auto` and `gemini` values are normalized to the locked provider.

### 1.3 Locked model
- Locked model identifier: `google/gemini-2.5-flash-lite`.
- User-submitted model values are normalized to locked model.

### 1.4 Key resolution
- Key resolution order:
  1. User encrypted key (if configured)
  2. `OPENROUTER_API_KEY`
  3. `OPENAI_API_KEY` (compat fallback env slot)

### 1.5 Error behavior
- If no compatible key exists for OpenRouter route, flow fails explicitly with provider-unavailable error.
- Hidden fallback chains are disallowed in locked tool flows.

### 1.6 Telemetry signal
- Flow executor logs must include:
  - provider route
  - model
  - fallback lock state
  - policy lock state

## 2. Shared Constants Policy

### 2.1 Single source of truth
Use `app/lib/ai/openrouter-policy.ts` for:
- provider preference constant
- model constant
- provider/model normalization helpers
- key resolution helper

### 2.2 No duplicate literals
Avoid scattering raw string literals for locked provider/model in route handlers or UI pages.

## 3. Settings UX Contract

### 3.1 Provider control behavior
- Provider field is display-only in locked mode.
- Display label: `OpenRouter`.

### 3.2 Model control behavior
- Model field is display-only in locked mode.
- Single allowed option: `google/gemini-2.5-flash-lite`.

### 3.3 Messaging
- UX text must state lock explicitly.
- Avoid fallback-oriented copy that suggests multi-provider routing.

## 4. Run Pipeline Contract

### 4.1 Runtime option defaults
- Any runtime options fallback for provider preference uses locked provider constant.
- `auto` fallback defaults are disallowed.

### 4.2 Error logging payload
- Provider preference persisted in logs must never default to `auto`.
- Provider attempted still records actual attempted route.

## 5. Source Input Contract

### 5.1 Control order
The source toolbar order is fixed:
1. Upload
2. Photo
3. Mic
4. Import from...
5. Link

### 5.2 Removed control
- Standalone `Recents` button is not allowed.

### 5.3 Import from... menu
Required entries:
- Chat
- Microsoft OneDrive
- Recents

### 5.4 Chat import behavior
- Opens modal with class selector.
- Reads class-share feed from API.
- Allows selecting an item and importing it into source stack.

### 5.5 Recents import behavior
- Still available via modal.
- Is grouped under Import from... instead of direct toolbar button.

## 6. Class Share Integration Contract

### 6.1 Shared client module
Use `app/lib/class-share/client.ts` for:
- reading class share rows
- posting class share entries
- normalization of rows

### 6.2 Posting rules
- `classId` required.
- At least one of `text` or `attachmentLabel` required.
- Audience defaults to `all` unless explicitly `teacher`.

### 6.3 Fetch rules
- Fetch source endpoint: `/api/classes/{classId}/share?audience={audience}`.
- Normalize rows before UI consumption.

## 7. Send-to-Class UX Contract

### 7.1 Shared component
Use `app/components/tools/send-to-class-button.tsx` as canonical flow.

### 7.2 Selection rules
- If route `classId` exists: direct send.
- If exactly one shareable class: direct send.
- If multiple classes: force class picker modal.

### 7.3 Button labels
- Default CTA label: `Send to class`.
- Busy label: `Sending...`.

### 7.4 Tool coverage
Current targeted coverage:
- Notes result screen
- Flashcards result screen
- Quiz result screen

## 8. Class List Normalization Contract

### 8.1 Shared extraction utility
Use `app/lib/classes/shareable-classes.ts` to normalize class options.

### 8.2 Filtering policy
- Exclude archived classes.
- Include stable fallback name when class label missing.

## 9. Accent Contract

### 9.1 Token
- Introduce central token: `--accent-brand: #7f8962`.

### 9.2 Allowed targets
- Username in breadcrumb path on tool pages.
- Sidebar tool icons.
- Breadcrumb tool icons.
- Sidebar upgrade CTA.
- Send/Generate buttons in designated share/upload contexts.

### 9.3 Non-goals
- No global recolor pass outside target list.
- Avoid introducing extra greys not present in theme language.

## 10. Sidebar Prefetch / Request Hygiene

### 10.1 Navigation prefetch policy
- Disable unnecessary prefetch for heavy class routes in sidebar links.
- Prefer explicit navigation to reduce background class route request churn.

### 10.2 Debug logging policy
- Keep verbose request logging behind flags.
- Disable continuous logging by default in production.

## 11. Recovery and Rollback

### 11.1 Fast rollback files
Primary touchpoints:
- `app/lib/ai/openrouter-policy.ts`
- `app/lib/ai/runtime-settings.ts`
- `app/lib/ai/flow-executor.ts`
- `app/api/user/ai-settings/route.ts`
- `app/api/tools/v2/runs/route.ts`
- `app/components/tools/source-input.tsx`
- `app/components/tools/send-to-class-button.tsx`
- `app/lib/class-share/client.ts`

### 11.2 Rollback order
1. Restore provider/model constants.
2. Restore runtime normalization behavior.
3. Restore settings UI enablement if needed.
4. Restore source toolbar order only if required by product decision.
5. Verify typecheck.

### 11.3 Safety check after rollback
- Ensure no dead imports.
- Ensure all tool pages compile and render.
- Ensure class share API payload contracts remain valid.

## 12. Validation Checklist

### 12.1 Build checks
- `npm run typecheck`

### 12.2 AI checks
- Trigger notes, flashcards, quiz generation.
- Verify logs include openrouter route and locked model.
- Verify direct gemini path is not used for targeted tool flows.

### 12.3 Source-input checks
- Verify toolbar order exactly.
- Verify standalone recents button absent.
- Verify import dropdown opens and all entries work.

### 12.4 Share checks
- On notes/flashcards/quiz results, verify `Send to class` visible when classes exist.
- Verify multi-class modal appears before send.
- Verify direct send with route classId.

### 12.5 Accent checks
- Verify accent applies only on approved targets.

## 13. Operational Notes

### 13.1 Why provider enum remains `openai`
- Current system uses OpenAI-compatible route primitives.
- OpenRouter path is consumed via compat route and key.
- Enum semantics are route-level, not brand-level.

### 13.2 Why model is hard-locked
- Product decision prioritizes deterministic behavior.
- Avoids silent drift due user setting changes.

### 13.3 Why shared modules were introduced
- Prevents duplicated network and normalization logic.
- Improves consistency and lowers regression surface.

## 14. Coding Standards Used

- Small composable helpers.
- Shared utilities for repeated transformations.
- Explicit runtime normalization at boundaries.
- UI-level safeguards for required flow steps.

## 15. Future Extensions

### 15.1 Optional audit trail
- Add `source=tool_send_to_class` markers for posted items.

### 15.2 Optional policy toggles
- Add admin-only toggles for temporary unlock in non-production.

### 15.3 Optional e2e suites
- Add Playwright checks for toolbar ordering and class-picker flow.

### 15.4 Optional telemetry dashboard
- Add panel showing route/model distribution for AI tool runs.

## 16. Appendix: Contracts Snapshot

### 16.1 Provider/model
- Provider route lock: OpenRouter via OpenAI-compatible path.
- Model lock: `google/gemini-2.5-flash-lite`.

### 16.2 Toolbar order
- `Upload -> Photo -> Mic -> Import from... -> Link`.

### 16.3 Import menu
- `Chat`, `Microsoft OneDrive`, `Recents`.

### 16.4 Share flow
- Mandatory class select when multiple classes exist.

## 17. Maintenance Notes

- Keep this runbook updated when any of the contracts above change.
- Prefer extending shared modules before adding one-off logic in tool pages.
- Re-run typecheck after every contract-level change.

## 18. Change Log Entry Template

Use this structure for future updates:
- Date/time:
- Change summary:
- Files touched:
- Contract(s) affected:
- Validation results:
- Rollback notes:

## 19. End-State Criteria

The system is considered complete when:
- Provider/model lock is enforced across runtime + routes + UI.
- Source toolbar and import grouping matches contract exactly.
- Send-to-class flow is uniform and guarded across targeted tools.
- Accent targets are applied precisely without global drift.
- Typecheck remains green.

## 20. Ownership

- Engineering owner: Tooling/UI integration layer.
- Product owner: Cautie tool workflow UX.
- Ops owner: Runtime env policy for OpenRouter keys.

