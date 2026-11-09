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
- Rust compile: `_app` param must be renamed to `app` if referenced in body — prefix `_` means unused in Rust
- Truncated identifiers in service_account.rs (Buil...idW → BuildTrusteeWithSidW, EXPLI...S_W → EXPLICIT_ACCESS_W) — verify build passes
- Security: use env vars for secrets (api_secret_token(), master_transfer_secret()), not hardcoded constants
- Security: add rate limiting (5 attempts/60s) to verify_admin_password
- CSS: replace hardcoded hex/rgb with CSS variables, add .is-rtl rules and :focus-visible blocks
- i18n: replace `isRtl ? '...' : '...'` ternaries with `t('auto.<key>')` calls
- i18n: add `auto` and `telemetry` sections to both en and ar in useI18n.ts
- Build verification: `cargo tauri build` or `cargo build` in src-tauri/ must pass with 0 errors

## Verification

- Run `npm run build` — should pass
- Run `npm run dev` — should start
- Check all 3 themes render correctly
- Check RTL layout
- Check accessibility (ARIA, keyboard nav)
