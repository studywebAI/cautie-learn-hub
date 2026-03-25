# OneDrive Embedded Picker Acceptance Checklist

Last updated: 2026-03-25 (Europe/Berlin)

## Product requirements mapping

| Requirement | Status | Notes |
|---|---|---|
| First-time auth return resumes picker in-place | done | Redirect return (`ms=connected&ms_picker=embed`) now re-opens embedded picker immediately and avoids generic reset state (`app/components/tools/microsoft-app-strip.tsx`). |
| Embedded picker uses whitespace area above text input | done | `SourceInput` now renders `topContent` in a flex host area above textarea (`app/components/tools/source-input.tsx`). |
| No new tab/popup as primary browsing UX | done | Primary flow uses embedded iframe + postMessage channel (`app/components/tools/microsoft-app-strip.tsx`). |
| Avoid "left app" feeling | partially done | Browsing is embedded, but first-time Microsoft auth can still require provider redirect by platform design. |
| Microsoft-like visual language | partially done | Real Microsoft picker content is embedded; host shell tightened to neutral/Microsoft-like framing. |
| Subtle Cautie branding | done | Header uses "OneDrive \| Opened in Cautie". |
| Real status line (no fake loading hero) | done | Status text is state-driven (`Signing in`, `Fetching files`, `Loading picker`, `Ready to select`, etc.). |
| File selection -> handoff back to app | done | `pick` command saves selected files to `context-sources` and triggers ingestion jobs. |
| Backend receives rich metadata (id/name/mime/webUrl/downloadUrl/drive/parent) | done | `context-sources` POST accepts/stores `driveId`, `parentId`, `downloadUrl` metadata. |
| Backend extraction + AI context pipeline | done | Existing ingestion jobs process selected OneDrive source items and extraction flows into context sources. |
| No fake custom imitation picker | done | Uses Microsoft-hosted picker UI, not a custom clone. |

## Constraints (platform / legal)

| Constraint | Status | Notes |
|---|---|---|
| Fully white-labeled Microsoft picker UI | blocked by Microsoft/platform constraints | Picker internals are Microsoft-hosted cross-origin content. |
| Zero external auth behavior in all cases | blocked by Microsoft/platform constraints | First consent/sign-in may redirect to Microsoft auth endpoint. |

## Cross-surface QA scope

| Surface | Status | Notes |
|---|---|---|
| Quiz | done | `MicrosoftAppStrip` mounted in `topContent`; embedded picker opens in host area. |
| Notes | done | `MicrosoftAppStrip` mounted in `topContent`; embedded picker opens in host area. |
| Flashcards | done | `MicrosoftAppStrip` mounted in `topContent`; embedded picker opens in host area. |
| Studyset | done | Embedded `MicrosoftAppStrip` mounted in Step 3 import section, with selected OneDrive file list refreshed from `context-sources`. |

## Verification commands run

- `npm run typecheck` -> pass
- `npm run build` -> pass
