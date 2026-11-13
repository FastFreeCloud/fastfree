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

### Tauri dev (alternative)
```bash
cd C:/Users/FastFree/Desktop/fastfree/apps/fastfree_installer
npx tauri dev  # Uses Vite + Rust, shows all errors in terminal
```

### Seeing errors in tauri dev
- **Terminal**: Rust compile errors + Vite build errors
- **Browser DevTools (F12)**: JS errors, Vue warnings, CSS issues, network errors
- **IPC tab**: Rust command errors (filter "ipc" in Network tab)
- **Log file**: C:\Users\FastFree\AppData\Roaming\FastFree\installer.log
- **TypeScript only**: `npx vue-tsc --noEmit`

## Architecture

### Tech Stack
- Frontend: Vue 3 (Composition API, script setup)
- Desktop: Tauri (Rust)
- Build: Vite
- Styling: SCSS + CSS variables
- i18n: Custom composable (useI18n)
- State: Custom composables (useDiscovery, useTheme, useDiagnostics)

### Launcher vs host
The installer is a **launcher/companion**, not a host for the ERP apps. `AppRegistryService.launchApp()`
calls `openUrl()` (Tauri opener → OS browser) and deliberately never navigates the installer webview. The
target architecture is **one FastFree backend + one Tauri client whose UI is JSON/SDUI**, so app tiles must
open screens **inside** the client (SDUI), not the OS browser. See `fastfree-architect` →
`references/target-architecture.md`.

### SDUI screen registry
`src/schemas/screens.ts` is the single source of truth: `STEP_SCHEMAS` (the 6 wizard steps) and
`NAMED_SDUI_SCREENS` (package screens such as `accounting_ledger`, `sales_pos`, `fleet_monitor`,
`client_manager`). `SduiStepHost.vue` renders them via `SduiNode` from
`quasar-app-extension-fastfree-lowcode`. Only 4 packages currently ship JSON schemas (`fastfree_accounting`,
`fastfree_panel`, `fastfree_sales`); the rest register Vue screens in their own `screens.ts`.

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
- Quasar is used as a component library (`app.use(Quasar, ...)` in `src/main.ts`) but the installer is **not** a Quasar CLI app — it is plain Vite + Vue 3, and the module screens are SDUI JSON, not hand-coded Vue
- Desktop app — not web
- WireGuard screen was previously fixed (331 insertions, 207 deletions)
- Never hardcode secrets in Rust source — recoverable from binary
- Sanitize PowerShell inputs — command injection risk
- Canonicalize paths — path traversal risk
- pnpm may not be in PATH on Windows — use node_modules/.bin/vitest directly
- Rust compile: `_app` param must be renamed to `app` if referenced in body — prefix `_` means unused in Rust
- Truncated identifiers in service_account.rs (Buil...idW → BuildTrusteeWithSidW, EXPLI...S_W → EXPLICIT_ACCESS_W) — verify build passes
- Security: use env vars for secrets (api_secret_token(), master_transfer_secret()), not hardcoded constants
- Security: when removing hardcoded secrets, create .env.example documenting required env vars
- Security: when env vars are missing, return clear error message (not empty string that fails silently)
- Security: add .env file support — read from .env in app directory as fallback when env vars not set
- Security: when license token missing, fall back to offline mode (WARN, not ERROR) — installer still works with cached license
- Security: installer log shows "Online network unreachable; validated from local cached cryptographic token" when offline fallback succeeds
- Build: on Windows, .exe may be locked by running process — rename it (mv target/debug/*.exe *.exe.old) before cargo build
- Build: cargo build takes 20+ minutes on first run (large dependency tree) — run in background
- Runtime: Hyper-V virtual switch must be created before VM provisioning (New-VMSwitch -Name "FastFree-Switch" -SwitchType External)
- Runtime: VM provisioning requires Hyper-V virtual switch to exist first — installer cannot create it automatically
- Runtime: set env vars in Windows system (Machine level) for installer to work across sessions
- Runtime: license verification works offline with cached token when FASTFREE_API_SECRET_TOKEN is not set
- Security: env var names: FASTFREE_API_SECRET_TOKEN, FASTFREE_MASTER_TRANSFER_SECRET
- Security: license server returns "UNAUTHORIZED" when API secret token is empty/wrong
- Security: add rate limiting (5 attempts/60s) to verify_admin_password
- CSS: replace hardcoded hex/rgb with CSS variables, add .is-rtl rules and :focus-visible blocks
- i18n: replace `isRtl ? '...' : '...'` ternaries with `t('auto.<key>')` calls
- i18n: add `auto` and `telemetry` sections to both en and ar in useI18n.ts
- Build verification: `cargo tauri build` or `cargo build` in src-tauri/ must pass with 0 errors
- Inspection: OpenCode with beam-free model (`opencode run -m opencode/beam-free`) can inspect running Tauri app via dev tools — checks CSS vars, RTL, WireGuard design, console errors, i18n
- Inspection: OpenCode free usage limit may be hit — use beam-free model as alternative, or wait for reset
- Inspection: when OpenCode hits free limit, it may leave partially modified files — always verify git diff after OpenCode runs
- Inspection: WireGuard screen CSS staleness — wireguard-screen.css selectors reference old .wg-* classes but components use .wg-hero-card, .wg-bento-grid, .wg-advanced-banner, .wg-endpoint-modal — regenerate CSS against actual class names
- Inspection: legacy token inconsistency — var(--primary) vs var(--accent-primary) — standardize on --accent-primary
- Inspection: physical offsets in RTL — replace `right:` with `inset-inline-end:` for proper mirroring
- Inspection: i18n verification — 211 keys, 0 missing, full parity en/ar, 0 raw keys, 0 leftover placeholders
- Inspection: theme swap works (data-theme="light", .theme-light, body rgb(248,250,252))
- Inspection: RTL no horizontal overflow (scrollWidth == clientWidth) — critical for installer window width 1400px
- Inspection: locale persists via localStorage.fastfree_installer_locale

## Verification

- Run `npm run build` — should pass
- Run `npm run dev` — should start
- Check all 3 themes render correctly
- Check RTL layout
- Check accessibility (ARIA, keyboard nav)
