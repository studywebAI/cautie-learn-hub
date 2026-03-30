# Theme baseline snapshot (2026-03-30)

This file records the **old UI theme and font setup** before the Claude-style light theme was applied.

## Full old token snapshot

- `docs/theme/pre-claude-globals.css`

That file is a direct copy of the previous `app/globals.css`, including:

- all previous color variables (`:root`, `.theme-light`, `.theme-dark`, `.theme-ocean`, `.theme-forest`, `.theme-sunset`, `.theme-rose`)
- all previous typography rules

## Previous default font stack

- Body/UI controls:
  - `"Segoe UI Variable Text", "Segoe UI", Inter, "SF Pro Text", Helvetica, Arial, sans-serif`
- Previous global base weight behavior:
  - body/inputs/buttons used ~`550`
  - `.font-bold`, `.font-semibold`, `.font-medium`, `.font-normal` were forced to `560`

## Current switching model

- Theme saved in local storage key: `studyweb-theme`
  - New light: `light` (Claude palette)
  - Old light: `legacy` (original palette)
- Font saved in local storage key: `studyweb-font`
  - New default: `inter`
  - Old stack: `legacy`
