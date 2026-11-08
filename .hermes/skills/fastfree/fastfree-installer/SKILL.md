---
name: fastfree-installer
description: "Installer: FastFree desktop app (Vue + Tauri)."
version: 1.0.0
author: FastFree (fastfree), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [fastfree, installer, tauri, vue, desktop]
    related_skills: [fastfree-development, fastfree-cto]
---

# FastFree Installer Development Skill

Develop the FastFree Desktop Installer — a Vue 3 + Tauri (Rust) desktop app for installing and managing FastFree ERP nodes.

## When to Use

- User asks to develop, modify, or fix the FastFree installer
- User wants to work on installer screens (WireGuard, License, Provisioning, etc.)
- User needs to fix installer CSS, RTL, or accessibility
- User wants to add new installer features

## Prerequisites

- FastFree project at `C:/Users/FastFree/Desktop/fastfree`
- Installer app: `apps/fastfree_installer/`
- Tauri CLI: `cargo tauri`
- Node.js + npm
- Rust toolchain

## How to Run

### Start dev server

```bash
cd C:/Users/FastFree/Desktop/fastfree/apps/fastfree_installer
npm run dev  # Vite dev server
```

### Build

```bash
cd C:/Users/FastFree/Desktop/fastfree/apps/fastfree_installer
npm run build  # vue-tsc + vite build
```

### Tauri dev

```bash
cd C:/Users/FastFree/Desktop/fastfree/apps/fastfree_installer
cargo tauri dev
```

## Architecture

### Tech Stack
- Frontend: Vue 3 (Composition API, script setup)
- Desktop: Tauri (Rust)
- Build: Vite
- Styling: SCSS + CSS variables
- i18n: Custom composable (useI18n)
- State: Custom composables (useDiscovery, useTheme, useDiagnostics)

### Screen Flow (6 steps)
1. HostDiscovery — System discovery
2. LicenseScreen — License activation
3. NodeSizing — Storage sizing
4. WireGuardScreen — VPN setup
5. ProvisioningScreen — VM provisioning
6. LaunchpadScreen — Control center

### Components (30+)
- dashboard/: AppLaunchGrid, LiveConsoleModal, TelemetryDialCard
- diagnostic/: AuditStepCard, DiagnosticLogDrawer, DiagnosticSummaryBadge, DiagnosticTelemetryGrid
- license/: LicenseChangeKeyModal, LicenseInputSection, LicenseTransferModal, LicenseVerifiedCard
- wireguard/: WireGuardAdvancedBanner, WireGuardBentoGrid, WireGuardEndpointModal, WireGuardHeroCard, WireGuardNodeSelector, WireGuardPasswordModal
- UnifiedDiagnosticHub, MandatoryUpdateGate, TrayCompanionDialog

### CSS Files (11)
- diagnostic-hub.css, host-discovery.css, license-card.css, license-input.css
- license-modals.css, license-screen.css, node-sizing.css
- provisioning-screen.css, wireguard-screen.css

## Procedure

### Adding a new screen:
1. Create Vue component in `src/components/`
2. Add to App.vue step flow
3. Create CSS file in `src/assets/styles/`
4. Add i18n keys to useI18n
5. Test in dev mode

### Fixing CSS:
1. Use CSS variables (--bg-app, --bg-card, --text-main, etc.)
2. Use logical properties (margin-inline-start, not margin-left)
3. Support RTL (is-rtl class)
4. Support 3 themes (dark, light, oled-black)
5. Add focus-visible, prefers-reduced-motion

## Audit Findings (from installer audit)

### CSS Issues (9 files audited)
- 8 files use hardcoded hex/rgb colors instead of CSS variables
- 3 files (license-card, license-input, license-modals) have zero `.is-rtl` rules
- 6 `outline: none` sites lack `:focus-visible` replacement
- wireguard-screen.css redefines global theme tokens in `:root` — breaks theme switching
- Physical L/R props remain: `border-left`, `text-align: left`, `left/right` positioning

### Accessibility Patterns (applied to 28 components)
- SVG icons: add `aria-hidden="true"` on decorative icons
- Modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `tabindex="-1"`, `@keydown.esc`
- Loading spinners: `role="status"`, `aria-label="Loading"`
- Icon-only buttons: mirror `title` to `aria-label`
- Clickable divs: add `role="button"`, `tabindex="0"`, Enter/Space handlers, `aria-pressed`

### i18n Completeness
- Verify en.ts and ar.ts have identical key sets (target: 284 keys each)
- Use `t()` instead of `isRtl ? '...' : '...'` ternaries
- Check for hardcoded English strings in components
- Missing keys pattern: `wireguard.*` keys often missing from both locales

### Tauri/Rust Security (CRITICAL)
- Never hardcode secrets in Rust source (`API_SECRET_TOKEN`, `FASTFREE_MASTER_TRANSFER_SECRET`) — recoverable from binary
- Sanitize all inputs interpolated into PowerShell (client_id, target_drive, switch_name, vhdx_path) — command injection risk
- Canonicalize paths before filesystem operations (target_drive, client_id, export_diagnostic_bundle) — path traversal risk
- Enforce `max_offline_days` in `load_license_cache` — offline fallback accepts any known-prefix key
- Remove `read_clipboard_text` command or restrict to trusted contexts
- Replace `let _ =` error swallowing with proper error propagation
- Add timeouts to PowerShell invocations (hung process stalls installer)
- CSP: remove `'unsafe-inline'` from `default-src`

### Compile Errors (must fix before build)
- `install_app_update`: references undefined `app` (should be `_app`)
- `ensure_service_account`: non-Windows branch references undefined `account_name`
- `service_account.rs`: truncated identifiers in ACL section

## Pitfalls

- Tauri commands need Rust backend (src-tauri/)
- CSS must work in 3 themes (dark, light, oled-black)
- RTL support required (Arabic)
- No Quasar — uses plain Vue 3
- Desktop app — not web
- WireGuard screen was previously fixed (331 insertions, 207 deletions)
- Never hardcode secrets in Rust source — recoverable from binary
- Sanitize PowerShell inputs — command injection risk
- Canonicalize paths — path traversal risk
- pnpm may not be in PATH on Windows — use node_modules/.bin/vitest directly

## Verification

- Run `npm run build` — should pass
- Run `npm run dev` — should start
- Check all 3 themes render correctly
- Check RTL layout
- Check accessibility (ARIA, keyboard nav)
