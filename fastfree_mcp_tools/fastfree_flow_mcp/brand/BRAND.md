---
name: fastfree-brand
description: The visual identity for FastFree. Read this BEFORE generating any logo, icon, illustration, screenshot, or social post so colours, type, and shape stay consistent. Triggers on - logo, brand, colour, color, palette, post for facebook, screenshot of our app, marketing image,宣传 image.
---

# FastFree Brand Kit

Single source of truth. `brand/brand.json` holds the machine-readable version; this file explains the reasoning.

## Company

- **Name** — FastFree
- **What it is** — ERP for fast-moving businesses
- **Interface language** — English UI, Egyptian Arabic for social copy
- **Market** — Arabic-first, RTL

## Colour

### Primary blue — the only brand colour

| Token | Hex | Role |
|---|---|---|
| `primary` | `#1976d2` | CTAs, active nav, the brand |
| `primaryDark` | `#1565c0` | Hover and emphasis |
| `primaryDarker` | `#0d47a1` | Headers, high-contrast text |

The three are one ramp. **Never introduce a fourth blue.** Two of these were hardcoded in the codebase before being documented — treat them as part of the ramp, not as new colours.

### Secondary and accent

- `secondary` `#26a69a` — teal, supporting surfaces
- `accent` `#9c27b0` — purple, sparing emphasis only

### Semantic

| Meaning | Hex |
|---|---|
| success, paid, approved | `#21ba45` |
| error, failed, overdue | `#c10015` |
| informational | `#31ccec` |
| warning, pending | `#f2c037` |

Status colour always comes from the shared `useStatusHelpers` helper, never chosen by hand.

### Neutrals

- `border` `#e5e7eb` — table rows, input outlines, card edges
- `surfaceAlt` `#f7f8fa` — zebra rows, hover fills
- `textSecondary` `#6b7280` — labels, timestamps
- `dark` `#1d1d1d` / `darkPage` `#121212` — dark mode

## Typography

**Roboto only.** One family, no exceptions.

| Level | Size | Weight |
|---|---|---|
| Body | 14px | 400 |
| Label | 12px | 500 |
| Headline | 20px | 600 |

## Shape

- Small radius 2px, medium radius 4px
- **One corner radius per view** — never mix sharp and rounded in the same screen

## Icons

**MDI v7.** Material Icons is registered as a legacy fallback; do not mix the two inside one view.

## Logo

- Primary file — `brand/logos/logo-primary.png`
- Dark-background variant — `brand/logos/logo-dark.png`
- Minimum size: 24px tall in UI, 40px tall in print
- Clear space: at least the height of the mark's inner counter on every side

**Never**

- recolour the mark
- add gradients, shadows, or outlines
- stretch or rotate
- place it on a busy photo without a solid backing shape
- rebuild the wordmark in a different typeface

## Imagery

**Do** — clean flat UI illustration, light background, generous whitespace, soft shadows, palette limited to the brand colours.

**Avoid** — stock photos of people shaking hands, glossy 3D renders, cluttered gradients.

## Social formats

| Use | Ratio | Size |
|---|---|---|
| Facebook feed | 1.91:1 | 1200 × 628 |
| Facebook square | 1:1 | 1080 × 1080 |
| Facebook / IG story | 9:16 | 1080 × 1920 |
| Open Graph image | 1.91:1 | 1200 × 628 |

## Voice

Direct, practical, confident. Short sentences. No hype words, no exclamation marks.

---

## How to generate on-brand

Use the MCP tools rather than writing prompts by hand:

1. `flow_brand_prompt` with a `kind` — `logo`, `icon`, `illustration`, `post`, `screenshot` — and a `ratio`
2. Feed the returned prompt to `flow_generate_image`

**Commas are stripped by the Flow editor.** `flow_brand_prompt` already returns a comma-free string — pass it through unchanged.

Kinds map to intent:

| Kind | Use when |
|---|---|
| `logo` | the mark itself, flat, geometric, readable small |
| `icon` | app tile, single glyph, centred |
| `illustration` | hero art, blog header, empty-state art |
| `post` | social graphic, needs room for text overlay |
| `screenshot` | high-fidelity UI, dense tables and cards |

## Before approving a logo

1. Generate several options
2. Read them at 24px — if the silhouette collapses, reject it
3. Check on light, dark, and brand-colour backgrounds
4. Save the winner with `flow_brand_add_logo`
5. Update `brand.json` → `logo.primaryFile`