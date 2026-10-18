---
name: fastfree-flow-designer
description: >-
  Visual brand architecture, asset generation, design token retrieval, and automated UI styling
  via the official fastfree_flow_mcp server. Use whenever designing, modifying, or creating UI components,
  dialogs, screens, banners, or visual assets in FastFree Panel, FastFree Website, or Quasar apps.
---

# FastFree Flow Designer Skill

This skill guides agents in designing on-brand visual interfaces, retrieving design tokens, and generating branded assets using Google Flow via `fastfree_flow_mcp`.

---

## 1. Environment & CDP Integration Architecture

The `fastfree_flow_mcp` server connects to a live Chromium browser running Google Flow via the Chrome DevTools Protocol (CDP). It leverages the user's active, signed-in Google session without requiring external API keys.

### Session Configuration:
- **Default Browser**: CentBrowser (`C:/Users/FastFree/AppData/Local/CentBrowser/Application/chrome.exe`).
- **CDP Port**: `9222` (configurable via `FLOW_CDP_PORT`).
- **User Data Directory**: `C:/Users/FastFree/AppData/Local/CentBrowser/User Data` (`FLOW_USER_DATA`).
- **Profile**: `Default` (`FLOW_PROFILE`).
- **Authenticated Account**: `mohamed.fastfree@gmail.com` (`FLOW_ACCOUNT`).
- **Flow URL**: `https://flow.google.com` (`FLOW_URL`).
- **Auto Launch**: Automatically launches browser if not running; manually started via `scripts\launch.cmd`.
- **Supported Models**:
  - **Images**: `Nano Banana Pro`, `Nano Banana 2`, `Imagen 4`.
  - **Videos**: `Omni Flash`, `Veo 3.1 - Lite`, `Veo 3.1 - Fast`, `Veo 3.1 - Quality`.
- **Supported Aspect Ratios**: `16:9`, `1.91:1`, `4:3`, `1:1`, `3:4`, `9:16`.
- **Video Durations**: `4s`, `6s`, `8s`, `10s`.

---

## 2. Complete MCP Tool Suite (`fastfree_flow_mcp`)

### A. Brand Kit & Token Retrieval
1. `flow_brand_read()`:
   - Reads the comprehensive brand identity from `brand/BRAND.md` and `brand/brand.js`: company mission, color ramp, typography, iconography, logo guidelines, social ratios, voice, and imagery principles.
   - Call this first before initiating any branded asset creation.
2. `flow_brand_tokens({ group?: string })`:
   - Returns machine-readable design tokens for UI development and document styling.
   - Groups: `colors`, `typography`, `shape`, `icons`, `imagery`, `socialRatios`, `logo`, `voice`, or `all` (default).
3. `flow_brand_prompt({ request, kind, ratio?, exclude? })`:
   - Synthesizes user requests into on-brand, comma-free generation prompts.
   - **Crucial Rule**: The Flow editor strips commas. `flow_brand_prompt` outputs comma-free phrasing formatted with spaces or "and".
   - Kinds:
     - `logo`: Flat, geometric mark legible at small scales (24px).
     - `icon`: Centered single glyph for application tiles.
     - `illustration`: Clean, flat UI artwork with generous whitespace.
     - `post`: Marketing and social graphics with dedicated copy areas.
     - `screenshot`: High-density application interfaces, tables, and dashboards.
4. `flow_brand_add_logo({ sourceFile, name })`:
   - Promotes an approved generated image into `brand/logos/` as an official brand asset.

### B. Session & State Inspection
5. `flow_launch({ restart?: boolean })`:
   - Launches or restarts the Chromium browser with `--remote-debugging-port=9222`.
6. `flow_status()`:
   - Queries Google Flow session status: active account, sign-in verification, available models, and CDP connectivity.
7. `flow_screenshot({ name? })`:
   - Captures high-resolution PNG screenshot of the current Google Flow project canvas.
8. `flow_discover_ui()`:
   - Dissects DOM elements and controls on Google Flow; used if tool selectors require recalibration following Google UI updates.

### C. Asset & Media Generation
9. `flow_generate_image({ prompt, ratio? })`:
   - Submits prompt directly to Google Flow image model (Nano Banana / Imagen).
   - Prompts must not contain commas.
10. `flow_download_latest()`:
    - Fetches the most recently generated high-res asset to the local project output directory.
11. `flow_list_output({ limit? })`:
    - Lists generation runs organized chronologically in `output/`.
12. `flow_setup_video({ prompt, ratio?, duration? })`:
    - Configures video parameters and types prompt into Flow composer without consuming credits (allows user review).
13. `flow_create_scene({ prompt? })`:
    - Opens Scenes management panel for storyboard and multi-shot orchestration.
14. `flow_list_characters()` & `flow_create_character({ name, description })`:
    - Manages persistent character definitions across scenes.
15. `flow_open_tools_gallery()` & `flow_use_grid_architect({ theme, shots })`:
    - Launches batch shot generation via Grid Architect using a shared stylistic theme.

---

## 3. FastFree Design System & UI Creation Rules (Quasar & Panel)

When building or refining screens in `apps/fastfree_panel`, `apps/fastfree_ledger`, or `packages/*`:

### 1. Color System (Single Blue Ramp & Shared Statuses)
- **Primary Ramp (The Only Brand Blues)**:
  - Primary: `#1976d2` (`--q-primary`, `--lc-primary`) — CTAs, active navigation, brand elements.
  - Primary Dark: `#1565c0` — Hover states and interactive emphasis.
  - Primary Darker: `#0d47a1` — Headlines, high-contrast dark accents.
  - ⚠️ **Strict Constraint**: Never introduce a fourth blue hue.
- **Supporting Accents**:
  - Secondary: `#26a69a` (Teal) — Secondary surfaces and subtler accents.
  - Accent: `#9c27b0` (Purple) — Spared for distinct callouts only.
- **Semantic Statuses (Strict Enforcement)**:
  - Success: `#21ba45`
  - Error: `#c10015`
  - Warning: `#f2c037`
  - Info: `#31ccec`
  - ⚠️ Always use `useStatusHelpers` (`translateStatus` / `statusColor`). Never hardcode custom hex colors in templates.
- **Neutrals & Dark Mode**:
  - Border: `#e5e7eb` (`--lc-border`).
  - Zebra & Hover Surface: `#f7f8fa` (`--lc-surface-alt`).
  - Text Secondary: `#6b7280`.
  - Dark Surface / Page: `#1d1d1d` / `#121212`.

### 2. Typography & Spatial Geometry
- **Typeface**: **Roboto only**.
  - Body: 14px (weight 400).
  - Label / Meta: 12px (weight 500).
  - Headline: 20px (weight 600).
- **Corner Radii**:
  - Small: 2px (`rounded-borders`).
  - Medium: 4px.
  - ⚠️ **Single Radius Invariant**: Never mix sharp and rounded corners within the same view.
- **Elevation & Glassmorphism**:
  - Dock and modals must match `--lc-dock-bg` with backdrop-filter blur tokens.

### 3. Iconography & Quasar UI Standards
- **Icon Set**: **MDI v7** (`mdi-` prefix, e.g., `<q-icon name="mdi-check" />`).
  - Never mix Material Icons with MDI in the same component.
- **RTL & Logical CSS**:
  - Never use physical `left` or `right` in custom styles. Use CSS logical properties: `inset-inline-start`, `inset-inline-end`, `margin-inline`, `padding-inline`.
- **Accessibility (a11y)**:
  - Every `<q-btn>` must have an explicit `aria-label` attribute.
  - Maintain AAA contrast ratio across both light and dark themes.
- **Bilingual Internationalization (i18n)**:
  - Zero hardcoded English or Arabic strings in templates or components.
  - Every key must be registered simultaneously in `locales/en.ts` and `locales/ar.ts`.
- **Form Architecture & Data Integrity**:
  - Form elements must use `<q-form @submit.prevent="...">` paired with `<q-btn type="submit">`.
  - Type definitions: Strict typing (`Partial<DocType>`); never use generic `Record<string, unknown>`.
  - Service Layer: All backend operations must reside in domain `*.service.ts` classes.
