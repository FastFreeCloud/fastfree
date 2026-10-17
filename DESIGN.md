---
name: FastFree ERP
description: Design system for the FastFree ERP monorepo — 6 Quasar apps sharing one visual identity.

colors:
  primary: "#1976d2"
  primary-dark: "#1565c0"
  primary-darker: "#0d47a1"
  secondary: "#26a69a"
  accent: "#9c27b0"
  positive: "#21ba45"
  negative: "#c10015"
  info: "#31ccec"
  warning: "#f2c037"
  dark: "#1d1d1d"
  dark-page: "#121212"
  border: "#e5e7eb"
  surface-alt: "#f7f8fa"
  text-secondary: "#6b7280"

typography:
  body:
    fontFamily: Roboto
    fontSize: 14px
    fontWeight: 400
  label:
    fontFamily: Roboto
    fontSize: 12px
    fontWeight: 500
  headline:
    fontFamily: Roboto
    fontSize: 20px
    fontWeight: 600

icons:
  primary: mdi-v7
  fallback: material-icons

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px

rounded:
  sm: 2px
  md: 4px
---

# FastFree Design System

## Overview

FastFree is an ERP monorepo: **6 Quasar apps** (`erp`, `pos`, `hr`, `ledger`, `panel`, `clan_panel`) plus **8 domain packages** (`auth`, `accounting`, `inventory`, `sales`, `purchase`, `hr`, `crm`, `lowcode`).

All 6 apps share **one** `quasar.variables.scss` (verified byte-identical, MD5 `BD691A46…`). Any design change must land in that one file or in a shared package — never in a single app.

The product is a dense business application: tables, forms, and data entry at speed. Visual priority is **legibility and scannability over decoration**.

## Colors

### Primary blue — the only brand color

| Token | Hex | Declared? | Use |
|---|---|---|---|
| `primary` | `#1976d2` | ✅ Sass var | Quasar default (buttons, active nav) |
| `primary-dark` | `#1565c0` | ❌ hardcoded | Hover / emphasis states |
| `primary-darker` | `#0d47a1` | ❌ hardcoded | Headers, high-contrast text |

> ⚠️ **Known drift:** `#1565c0` (10 uses) and `#0d47a1` (6 uses) are hardcoded in components and exist in **no** Sass variable. They are real brand colors in practice. See "Do's and Don'ts".

### Semantic colors

Standard Quasar set, declared in `quasar.variables.scss`:

- **positive** `#21ba45` — success, paid, approved
- **negative** `#c10015` — errors, failed, overdue
- **info** `#31ccec` — neutral notices
- **warning** `#f2c037` — pending, requires action

These map to the `statusColor` helper and the status badges across all domain packages. **Status color is never chosen ad-hoc** — it comes from `useStatusHelpers`.

### Neutrals

- **border** `#e5e7eb` — table rows, input outlines, card edges
- **surface-alt** `#f7f8fa` — zebra rows, hover fills, section bands
- **text-secondary** `#6b7280` — labels, timestamps, de-emphasized metadata

> ⚠️ **Known drift:** `#6b7280` and `#64748b` are both in use as grey text, and neither is declared.

### Dark mode

`$dark: #1d1d1d`, `$dark-page: #121212`. Both declared. Use Quasar's `$dark` classes (`text-white`, `bg-grey-9`) rather than raw hex when adding dark variants.

## Typography

**Roboto is the single family.** Declared via the `roboto-font` Quasar extra in all 6 `quasar.config.ts` files. No other font family is loaded — do not introduce one.

| Level | Size | Weight | Use |
|---|---|---|---|
| Body | 14px | 400 | Table cells, form inputs, default text |
| Label | 12px | 500 | Column headers, field labels, badges |
| Headline | 20px | 600 | Page titles, section headers |

Domain screens are Quasar tables and forms; 14px body is the established baseline.

## Icons

Two icon sets are registered together: **`mdi-v7`** (primary) and **`material-icons`** (fallback). Use MDI. Material Icons is retained for compatibility only — do not mix within one view.

## Spacing

4px base scale. Tables and forms rely on consistent vertical rhythm; Quasar's default component spacing already assumes this scale, so custom margins should land on `xs/sm/md`.

## RTL

The UI is **Arabic-first** and uses `dir="rtl"`.

- Use logical properties: `inset-inline-start/end`, not `left/right`
- Never hardcode a physical direction in new styles
- Existing violations were already fixed once — do not reintroduce them

## Components

- **Tables** — the dominant surface. Use Quasar `QTable`; columns defined in the screen file, not in a shared table wrapper
- **Forms** — `QForm` + `@submit.prevent` with buttons **inside** the `<form>` element
- **Status badges** — always via `useStatusHelpers` (`statusColor` + `translateStatus`)
- **Layouts** — Quasar `QLayout` with the app-level drawer; screens must not redefine page chrome

### Shared composables

Both live in the lowcode runtime and are consumed by every domain package:

| Composable | Real path | Exports |
|---|---|---|
| `useStatusHelpers` | `packages/fastfree_lowcode/src/runtime/composables/useStatusHelpers.ts` | `useStatusHelpers(namespace)` |
| `useFormatNumber` | `packages/fastfree_lowcode/src/runtime/composables/useFormatNumber.ts` | `useFormatNumber()` |

Note the `runtime/composables/` segment — it is not `src/composables/`. `useStatusHelpers` takes a namespace argument for its translation keys.

## Do's and Don'ts

**Do:**
- Add new colors to `quasar.variables.scss` in **all 6 apps** (they are separate copies, not a symlink)
- Use `useFormatNumber` for currency and numbers, never raw `toLocaleString`
- Reach for `useStatusHelpers` before writing any status badge or color mapping
- Follow existing screen structure: toolbar → filters → table → dialogs

**Don't:**
- Don't add a fourth shade of blue. The palette already has `#1976d2` / `#1565c0` / `#0d47a1` and the drift is real — consolidate onto the declared ramp rather than extending it
- Don't introduce a second grey ramp alongside `#e5e7eb` / `#6b7280` / `#64748b`
- Don't add a font family
- Don't use physical CSS directions (`left` / `right`) in new code
- Don't add `console.log` or untranslated English strings — every screen ships EN + AR locales
- Don't modify `packages/fastfree_lowcode` styling without checking the four Quasar apps that consume it

## Verification

Before calling any UI work done, from `apps/fastfree_erp`:

```bash
npx vue-tsc --noEmit    # 0 errors
npm run lint:check      # 0 violations
```

A screen that changes only styling still must pass both — Quasar/Vue templates are type-checked.

## Known Issues to Fix

1. **Color drift** — `#1565c0`, `#0d47a1`, `#64748b`, and several greys are hardcoded in domain screens without Sass variables. Consolidate onto the declared ramp.
2. **Duplicated config files** — `quasar.variables.scss` exists as 6 independent copies. Any edit must be applied 6 times, and they can silently diverge.
3. **`App.vue` divergence** — the 6 `App.vue` files are not identical (only two share a hash), suggesting per-app drift in app-level styling.