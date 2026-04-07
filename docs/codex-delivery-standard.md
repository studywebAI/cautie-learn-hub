# Codex Delivery Standard (Non-Negotiable)

This project requires end-to-end completion, not partial implementation.

## Rule
- Do not stop at 70%.
- The final 30% (polish, persistence, edge-cases, smoothness, validation) is mandatory.

## Mandatory Completion Checklist
- Implement core behavior.
- Implement edge-case behavior.
- Ensure persistence/reload behavior is correct.
- Ensure transitions/animations feel coherent (no abrupt jumps/glitches).
- Verify visual stability across the changed flow.
- Remove temporary fallback hacks once the real flow is in place.
- Run at least one validation command (`typecheck`/`lint`/targeted test) after changes.
- Report what is done and what is not done explicitly.

## Reporting Format
- State: "Completed" vs "Not completed yet".
- If anything is incomplete, list exact remaining items and why.
