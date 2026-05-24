# Design Consistency Audit — cautie-learn-hub

**Date:** 2026-05-19  
**Framework:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui  
**Scope:** `app/**/*.{tsx,css}`, `tailwind.config.ts`, `globals.css`

---

## Project Overview

The project has a well-structured design token system in `app/globals.css` built on CSS custom properties (HSL-based shadcn/ui tokens + a 4-step type scale). There are also multiple themes (light, dark, sand, ocean, forest, rose, sunset). However, a large amount of component code bypasses this system entirely, resulting in 500+ hardcoded hex values, a parallel ad-hoc font size scale, and several conflicting token definitions.

---

## 1. Colors

### 1.1 Brand color split: `#7f8962` used both as a CSS var and hardcoded ⚠️ HIGH

`--accent-brand: #7f8962` is correctly defined in `globals.css` and used via `var(--accent-brand)` in 151 places. But it is also hardcoded as the raw hex value in 90 additional places across at least 15 component files.

Example offenders:
- `app/components/class/analytics-tab-redesigned.tsx:116` — `bg-[#7f8962]`
- `app/components/class/chat-share-tab-redesigned.tsx:182` — `style={{ background: '#7f8962' }}`
- `app/components/class/grades-tab-redesigned.tsx:240` — `bg-[#7f8962]`

**Recommendation:** Replace every `#7f8962` / `bg-[#7f8962]` / `text-[#7f8962]` with `bg-[var(--accent-brand)]` / `text-[var(--accent-brand)]`. This is a mechanical find-and-replace.

---

### 1.2 Gray palette sprawl — 20+ untracked shades ⚠️ HIGH

The design system provides `--muted`, `--muted-foreground`, `--foreground`, `--border`, and `--surface-*` tokens. Components largely ignore these and use hardcoded grays instead. Count of occurrences:

| Hardcoded value | Occurrences | Closest system token |
|---|---|---|
| `#666` | 30 | `--muted-foreground` |
| `#aaa` | 20 | `--muted-foreground` |
| `#555` | 19 | `--muted-foreground` |
| `#1a1a1a` | 29 | `--foreground` |
| `#333` | 15 | `--foreground` |
| `#e4e4e4` | 22 | `--border` |
| `#d0d0d0` | 20 | `--border` |
| `#ddd` | 13 | `--border` |
| `#ebebeb` | 18 | `--muted` |
| `#fafafa` | 13 | `--surface-1` |
| `#f5f5f5` | 12 | `--surface-1` |
| `#f8f8f8` | 8 | `--surface-1` |
| `#f7f7f7` | 7 | `--surface-1` |
| `#f0f0f0` | 9 | `--surface-2` |
| `#444` | 8 | `--foreground` (lighter) |
| `#888` | 6 | `--muted-foreground` |
| `#bbb` | 6 | `--muted-foreground` |

None of these values adapt to dark mode or other themes because they are static hex values.

**Recommendation:** Map these to the existing `hsl(var(--...))` tokens. Components in `analytics-tab-redesigned.tsx`, `chat-share-tab-redesigned.tsx`, and `grades-tab-redesigned.tsx` are the worst offenders and should be prioritised.

---

### 1.3 `bg-white` used without dark mode fallback ⚠️ MEDIUM

`bg-white` is used 26 times in non-backup component files without a `dark:` counterpart, making those surfaces permanently white in dark mode.

Key files:
- `app/components/blocks/BlockEditor.tsx:437`
- `app/components/blocks/SimpleMultipleChoiceBlock.tsx:65`
- `app/components/blocks/SimpleOpenQuestionBlock.tsx:49`
- `app/components/class/attendance-tab-redesigned.tsx:255, 282, 297`
- `app/components/class/share-tab.tsx:370, 382, 392`
- `app/components/dashboard/teacher/create-class-dialog.tsx:212`
- `app/components/material-viewers/mindmap-professional.tsx:667`

**Recommendation:** Replace `bg-white` with `bg-background` or `bg-card` (both are theme-aware tokens already in the Tailwind config).

---

### 1.4 Agenda event colors duplicated across 3 components ⚠️ MEDIUM

A utility file `app/lib/agenda-event-style.ts` exists to centralise agenda event accent colors. Three components ignore it and roll their own color logic, with conflicting values:

| Category | `agenda-event-style.ts` | `draggable-event.tsx` | `list-view.tsx` | `assignment-details-panel.tsx` |
|---|---|---|---|---|
| homework | `#4f86c0` | `#5fa771` / `#4f86c0` | `#4f86c0` | `#4f86c0` |
| small_test | `#c38843` | `#3B82F6` (blue!) | `#3B82F6` (blue!) | `#3B82F6` (blue!) |
| big_test | `#c56f6f` | `#EF4444` | `#EF4444` | `#EF4444` |
| other | `#8f7bb0` | `#10B981` | `#10B981` | `#10B981` |

`small_test` in the canonical file is amber (`#c38843`) but the three components use blue (`#3B82F6`) — a completely different meaning. Homework in `draggable-event.tsx` uses green (`#5fa771`) in some branches, blue in others.

**Recommendation:** Delete the colour logic from all three component files and import `getAgendaVisualStyle()` from `app/lib/agenda-event-style.ts`. The canonical file itself should also be migrated to CSS custom properties.

---

### 1.5 Misleadingly named color tokens ℹ️ LOW

In `app/globals.css` `:root`:
- `--accent-purple: #262626` — `#262626` is near-black charcoal, not purple. Likely a copy-paste error from renaming a token.
- `--accent-teal: #22c55e` — `#22c55e` is green (Tailwind `green-500`), not teal.
- `--text-success: #22c55e` duplicates `--accent-teal: #22c55e` — same value, two token names.

**Recommendation:** Rename `--accent-teal` to `--accent-green` or just consolidate into `--success`. Remove or fix `--accent-purple`.

---

### 1.6 Legacy hex token layer is dead code and breaks dark mode ℹ️ LOW

`globals.css` defines two overlapping token layers. The second layer (lines 100–116) uses raw hex:

```css
--bg-page: #f2f2f2;
--bg-surface: #fcfcfc;
--bg-primary: #fbfbfb;
--text-primary: #1a1a1a;
--text-secondary: #3d3d3d;
--text-tertiary: #868686;
--text-info: #1f1f1f;
--text-success: #22c55e;
--text-warning: #f59e0b;
--text-danger: #ef4444;
--border-subtle: hsl(0 0% 94.9%);
--border-default: hsl(0 0% 94.9%);
--border-strong: hsl(0 0% 90%);
--accent-purple: #262626;
--accent-teal: #22c55e;
--brand-coral: #d97757;
```

These are defined in `:root` and `.theme-light` but **not** in `.theme-dark` / `.dark`, so they are always light-mode values. A grep of all TSX files confirms **zero components reference these via `var()`** — they are entirely unused. The `docs/theme/claude-light-tokens.css` file defines a third, incompatible variation of some of these (different `--primary` value, different `--bg-page`).

**Recommendation:** Delete the hex token block from `:root` and `.theme-light`. If any are needed, re-introduce them as HSL vars with dark-mode overrides. Delete `docs/theme/` entirely or document it clearly as a historical reference.

---

## 2. Fonts

### 2.1 Two conflicting `tailwind.config.ts` files ⚠️ HIGH

There are two Tailwind config files:

**`/tailwind.config.ts` (root):**
```ts
fontFamily: {
  sans: ["Georgia", "Times New Roman", "Times", ...fontFamily.serif],
  body: ["Georgia", "Times New Roman", "Times", ...fontFamily.serif],
  headline: ["Georgia", "Times New Roman", "Times", ...fontFamily.serif],
}
```

**`/app/tailwind.config.ts`:**
```ts
fontFamily: {
  sans: ['"IBM Plex Sans"', "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
  body: ['"IBM Plex Sans"', ...],
  headline: ['"IBM Plex Sans"', ...],
}
```

The root config declares `font-sans` as a **serif** stack (Georgia). This would affect any content outside the `app/` directory and serve as a confusing trap for any developer using `font-sans` expecting a sans-serif font. The `app/tailwind.config.ts` `content` paths also scan `./src/pages/**` and `./src/components/**`, which don't exist in this repo.

**Recommendation:** Delete `app/tailwind.config.ts` and fix the root `tailwind.config.ts` to use the correct sans-serif stack (or just point to `var(--font-ui)`). Update the `content` globs to match the actual directory structure.

---

### 2.2 `--font-ui` primary font is not loaded ⚠️ MEDIUM

```css
--font-ui: "Arial Text G2", var(--font-ui-previous);
--font-ui-previous: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
```

`"Arial Text G2"` is not a standard web font and is not loaded via any `@import` or `@font-face`. Every browser will skip it and fall through to IBM Plex Sans. This makes the primary font declaration invisible — it should either be removed or loaded properly.

**Recommendation:** Either add a `@font-face` declaration for "Arial Text G2" or remove it from the `--font-ui` stack and promote IBM Plex Sans as the primary.

---

### 2.3 `export-toolbar.tsx` and `cautie-wordmark.tsx` hardcode the font ℹ️ LOW

- `app/components/tools/export-toolbar.tsx:61,76,230` — three hardcoded `font-family: "IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;` declarations in generated HTML strings. (Export context — acceptable, but note that if the UI font changes, these won't follow.)
- `app/components/cautie-wordmark.tsx:130` — `style={{ fontFamily: '"IBM Plex Sans", ...' }}` in a React component where `var(--font-ui)` would work.

**Recommendation:** Change `cautie-wordmark.tsx` to use `var(--font-ui-legacy)` (the IBM Plex Sans var already aliased for this purpose).

---

### 2.4 `<b>` and `<strong>` rendered at weight 400 ⚠️ MEDIUM

`app/globals.css` lines 611–614:
```css
b, strong {
  font-weight: 400;
}
```

This strips the semantic meaning from bold text — `<strong>` renders identically to normal text. Any rich-text content or accessibility tool relying on bold for emphasis will be silently broken.

**Recommendation:** Remove this rule, or if the design intent is to avoid bold for aesthetic reasons, replace it with `font-weight: 500` so there is at least a visible distinction.

---

### 2.5 `.font-medium` flattened to weight 400 ℹ️ LOW

```css
.font-medium, .font-normal, .font-headline {
  font-weight: 400 !important;
}
```

`font-medium` is conventionally weight 500. Developers using `font-medium` to create visual hierarchy get no benefit. The `!important` makes it impossible to override in specific cases.

**Recommendation:** Either allow `font-medium` to render at 500 (removing it from this rule), or document the intentional design decision so developers know not to reach for font-weight for hierarchy.

---

## 3. Text Sizes

### 3.1 Unofficial px size scale runs in parallel to the design system ⚠️ HIGH

The design system defines a 4-step scale via CSS variables:

| Token | Value | Mobile |
|---|---|---|
| `--type-micro` | 12px | 11px |
| `--type-body` | 15px | 14px |
| `--type-section` | 18px | 17px |
| `--type-page` | 22px | 20px |

Components ignore this and use 498 instances of arbitrary pixel sizes via Tailwind's arbitrary value syntax:

| Class | Occurrences |
|---|---|
| `text-[11px]` | 173 |
| `text-[12px]` | 118 |
| `text-[10px]` | 112 |
| `text-[13px]` | 95 |
| `text-[14px]` | 11 |
| `text-[16px]` | 7 |
| `text-[9px]` | 1 |

This is a parallel, ad-hoc scale of 9 sizes that ignores responsive behaviour entirely. Notably, `text-[12px]` is roughly `--type-micro` and `text-[14px]` is roughly mobile `--type-body`, but none of the components will adapt to mobile viewports the way the CSS var tokens do.

**Recommendation:** Replace `text-[10px]`/`text-[11px]` with `text-xs` (mapped to `--type-micro` in globals.css), `text-[12px]`/`text-[13px]` with `text-sm` (14px), and `text-[14px]` with `text-sm`. Add a Tailwind `fontSize` extension that maps to the design tokens so developers can use named scale steps instead of raw pixels.

---

### 3.2 `text-lg` and `text-xl` are the same size ⚠️ MEDIUM

`app/globals.css`:
```css
.text-lg { font-size: 18px !important; }
.text-xl { font-size: 18px !important; }
```

Both classes produce identical output. Tailwind's defaults are 18px for `text-lg` and 20px for `text-xl`. Any developer using `text-xl` to mean "bigger than lg" gets the same rendering — a silent hierarchy collapse.

**Recommendation:** Change `.text-xl` to `font-size: var(--type-page)` (22px) or at minimum differentiate it from `text-lg` (e.g. 20px).

---

### 3.3 `h3` font-size is hardcoded rather than using a token ℹ️ LOW

```css
h3 { font-size: 16px; }
```

`h1`, `h2`, `h4–h6` all reference `var(--type-*)` tokens; `h3` is hardcoded to `16px`. This value will not adapt to mobile viewports (where the type scale reduces).

**Recommendation:** Change to `font-size: calc(var(--type-body) + 1px)` or add a `--type-h3` token.

---

## 4. Border Radius

### 4.1 Hardcoded `rounded-[N]` values duplicate design tokens ⚠️ MEDIUM

`globals.css` defines `--radius: 0.75rem` (12px). The Tailwind config maps:
- `rounded-lg` → `0.75rem` (12px)
- `rounded-md` → `~10px`
- `rounded-sm` → `~8px`

Components use hardcoded values that duplicate or conflict with these tokens:

| Class | Occurrences | Token equivalent |
|---|---|---|
| `rounded-[6px]` | 22 | — no system token; between sm and xs |
| `rounded-[8px]` | 7 | duplicates `rounded-sm` |
| `rounded-[10px]` | 6 | duplicates `rounded-md` |
| `rounded-[16px]` | 5 | larger than `rounded-lg` — pill-like? |
| `rounded-[12px]` | 1 | duplicates `rounded-lg` |
| `rounded-[4px]` | 2 | — no system token |
| `rounded-[2px]` | 2 | — no system token |

`rounded-[8px]` and `rounded-[10px]` are the same as existing tokens but bypass them. `rounded-[6px]` is the most common arbitrary radius and has no token equivalent.

**Recommendation:** Add a `rounded-xs` token (e.g. 6px) to `tailwind.config.ts`. Replace all `rounded-[8px]` with `rounded-sm` and `rounded-[10px]` with `rounded-md`. Document `rounded-[16px]` as a pill variant or add `rounded-pill`.

### 4.2 `border-radius: 8px` hardcoded in `globals.css` ℹ️ LOW

`app/globals.css:16` — `.tool-right-rail-inner { border-radius: 8px; }` — should use `var(--radius)` or `calc(var(--radius) - 4px)` to stay aligned with the token.

---

## 5. Other Issues

### 5.1 Backup files committed to the codebase ⚠️ MEDIUM

Three `*.WORKING_BACKUP.tsx` files exist in production source:
- `app/(main)/tools/flashcards/page.WORKING_BACKUP.tsx`
- `app/(main)/tools/notes/page.WORKING_BACKUP.tsx`
- `app/(main)/tools/quiz/page.WORKING_BACKUP.tsx`

These files inflate the token-inconsistency count (they account for ~30% of the hardcoded hex instances) and could cause confusion about which file is canonical.

**Recommendation:** Delete immediately or move to a `_archive/` directory outside `app/`.

---

### 5.2 `docs/theme/` contains orphaned conflicting tokens ℹ️ LOW

`docs/theme/claude-light-tokens.css` and `docs/theme/pre-claude-globals.css` define a third token system that is not imported anywhere. The `--primary` value there (`14.8 63.1% 59.6%` — a coral/orange) directly contradicts the `--primary` in `app/globals.css` (`75 17% 46%` — olive green). This can mislead contributors who read the docs.

**Recommendation:** Either update `docs/theme/` to match `app/globals.css` and mark it as read-only documentation, or delete it.

---

## Priority Summary

| # | Issue | Severity | Effort |
|---|---|---|---|
| 1.2 | Gray palette sprawl (20+ shades, none themeable) | 🔴 High | Large |
| 3.1 | 500 hardcoded px sizes bypassing the type scale | 🔴 High | Large |
| 1.1 | Brand color `#7f8962` hardcoded vs CSS var | 🔴 High | Medium |
| 2.1 | Two conflicting tailwind.config.ts files | 🔴 High | Small |
| 1.3 | `bg-white` without dark mode fallback | 🟠 Medium | Small |
| 1.4 | Agenda event colors duplicated in 3 components | 🟠 Medium | Small |
| 2.4 | `<b>`/`<strong>` rendered at weight 400 | 🟠 Medium | Small |
| 3.2 | `text-lg` and `text-xl` produce identical 18px | 🟠 Medium | Small |
| 4.1 | Hardcoded border-radius values duplicating tokens | 🟠 Medium | Medium |
| 5.1 | Backup files in production source tree | 🟠 Medium | Trivial |
| 2.2 | `--font-ui` primary font not loaded | 🟠 Medium | Small |
| 2.5 | `.font-medium` flattened to 400 | 🟡 Low | Small |
| 1.5 | Misleadingly named color tokens | 🟡 Low | Trivial |
| 1.6 | Dead legacy hex token layer, breaks dark mode | 🟡 Low | Small |
| 3.3 | `h3` font-size hardcoded, not a token | 🟡 Low | Trivial |
| 4.2 | `border-radius: 8px` in globals.css | 🟡 Low | Trivial |
| 5.2 | Orphaned `docs/theme/` token files | 🟡 Low | Trivial |
| 2.3 | Font hardcoded in wordmark component | 🟡 Low | Trivial |
