# Installer CSS Audit Report

Scope: `apps/fastfree_installer/src/assets/styles/` — 9 CSS files audited (task mentioned 11; only 9 present).

## Summary

| File | Hardcoded colors | Physical L/R props | `.is-rtl` rules | `outline: none` without focus-visible | Theme-aware vars |
|------|------------------|--------------------|-----------------|---------------------------------------|------------------|
| diagnostic-hub.css | 94 hex / 102 rgb | 5 (border-left + colors) | 2 | 1 (input) | partial (var + fallback) |
| host-discovery.css | 81 hex / 53 rgb | 0 | 1 | 0 | partial |
| license-card.css | 45 hex / 80 rgb | 0 | 0 | 1 | partial |
| license-input.css | 54 hex / 43 rgb | 1 (text-align:left) | 0 | 1 | partial |
| license-modals.css | 40 hex / 22 rgb | 1 (text-align:left) | 0 | 1 | partial |
| license-screen.css | 10 hex / 2 rgb | 0 | 2 | 0 | partial |
| node-sizing.css | 69 hex / 49 rgb | 1 (left:3px) | 4 | 2 | partial |
| provisioning-screen.css | 78 hex / 36 rgb | 4 (left/right + text-align) | 1 | 0 | partial |
| wireguard-screen.css | 25 hex / 42 rgb | 1 (padding-right) | 2 | 3 (has focus-ring fix) | self-contained tokens |

## Key Findings

1. Hardcoded colors dominate 8 of 9 files. Most hex/rgb literals (e.g. `#38BDF8`, `#10B981`, `rgba(239,68,68,...)`) are not mapped to theme variables, so dark/light/oled-black themes will not recolor correctly.
2. wireguard-screen.css is the reference: it defines local RGB tokens (`--accent-sky-rgb`, etc.) and uses `rgba(var(--...-rgb), α)`. Other files should follow this pattern, but wireguard also redefines global tokens (`--bg-app`, `--text-main`) in its own `:root`, which overrides the app theme globally — a theme inconsistency.
3. RTL: license-card, license-input, license-modals have zero `.is-rtl` rules. Any physical direction (text-align:left, padding, arrows) will not flip. Several files still use physical props (`border-left`, `text-align:left !important`, `left:` positioning).
4. Accessibility: 6 files use `outline: none` without a `:focus-visible` replacement (diagnostic-hub, license-card, license-input, license-modals, node-sizing x2). Keyboard users lose focus indication. wireguard already implements `:focus-visible` outline.
5. Missing focus states in host-discovery, license-screen, provisioning-screen (no `:focus` at all).

## Specific Fixes

### diagnostic-hub.css
- Replace `border-left: 2px solid transparent` + `border-left-color` status colors with logical `border-inline-start` and CSS vars (`--accent-sky`, `--accent-amber`, etc.).
- Add `:focus-visible { outline: 2px solid var(--accent-sky); outline-offset: 2px; }` for `.search-box-input`.
- Convert hardcoded status hex (#EF4444, #F59E0B, #10B981, #38BDF8) to variables.

### host-discovery.css
- Add at least one `.is-rtl` override for any directional transforms/arrows.
- Add `:focus-visible` outlines for interactive elements (currently 0 `:focus`).

### license-card.css / license-input.css / license-modals.css
- Add `.is-rtl` blocks (currently none). Flip `text-align: left !important` → use logical `text-align: start` or `.is-rtl` override.
- Remove `outline: none` or pair with `:focus-visible` outline.
- Replace hardcoded palette (#38BDF8, #34D399, #EF4444, #F59E0B, #94A3B8, #27272A, #3F3F46) with global vars.

### license-screen.css
- Minor: convert remaining hex to vars; add focus states.

### node-sizing.css
- Replace `left: 3px` absolute positioning with logical `inset-inline-start: 3px`.
- Remove two `outline: none` or add focus-visible replacements (slider + select).
- Convert hardcoded colors.

### provisioning-screen.css
- Replace `left:0; right:0` with `inset: 0` (or `inset-inline`).
- Convert `text-align: left !important` to logical `start`.
- Add focus states (none currently).

### wireguard-screen.css
- Do not redefine global theme tokens (`--bg-app`, `--text-main`, etc.) in `:root`; scope them under a `.wireguard-screen` selector or consume global theme vars so dark/light/oled-black themes apply.
- Keep the RGB-token pattern; it is the model for the other files.
- Fix `padding-right: 4px` → `padding-inline-end: 4px`.

## Recommended Migration Order
1. Add shared focus-visible utility to App.vue global styles (covers all files at once).
2. Convert each file's hardcoded palette to local RGB tokens following wireguard pattern.
3. Add `.is-rtl` overrides where missing.
4. Remove global token overrides in wireguard-screen.css.

## Verification
- Run `vue-tsc` and `vite build` after changes.
- Visual check all 3 themes × 2 directions.
- Keyboard tab navigation to confirm focus rings.
