# FastFree Monorepo State & Session Memory

> **Target Audience**: AI Agents (OpenCode, Claude, Antigravity)  
> **Source**: Synchronized Monorepo Knowledge Base  
> **Last Updated**: 2026-10-28

---

## 1. System Overview & Monorepo Topology

FastFree is a sovereign, offline-first enterprise multi-agent monorepo and operating system ecosystem.

### Key Targets:
- **`apps/fastfree_installer`**: Tauri v2 + Vue 3 desktop node installer for Windows 11 Fluent 2.
- **`apps/fastfree_os`**: Sovereign NixOS Clan 26.05 infrastructure (`client1` VPS, `client2..11` Hyper-V appliances).
- **`apps/fastfree_panel`**: Central Clan management panel (Quasar 2 SPA + Hono backend).
- **`apps/fastfree_ledger` / `pos` / `erp` / `hr`**: Quasar 2 enterprise client apps with Capacitor Android builds.
- **`packages/*`**: Modular domain engines (`accounting`, `inventory`, `sales`, `purchase`, `hr`, `crm`, `lowcode`, `auth`).

---

## 2. Recent Milestones & Critical Accomplishments

### A. Desktop Installer Refinement (`apps/fastfree_installer`)
- **Native Fluent 2 Aesthetic**: Window shadows enabled via DWM, Segoe UI Variable typography, pure Mica deep-dark styling, zero emojis.
- **Full Emoji Purge**: Replaced 59 raw emoji instances across 10 components with official SVG assets (`/logo.svg`, inline SVGs).
- **Mandatory Update Gate**: Extracted into clean isolated component; locks progress if updates are pending.
- **Live Hyper-V Telemetry**: Removed fake timers; status is dynamically queried via PowerShell commands.
- **Quality Gates**: Zero TypeScript errors (`vue-tsc`), clean `vite build`, and `cargo check` passing with 0 warnings.

### B. Multi-Agent Governance Mandate (`.ai-rulez`)
- Added critical invariant: No installer, architectural, or core deployment completion is accepted without independent verification from **OpenCode** running via **Herdr**.
- Enforced dual-role setup: Implementer (`Antigravity`) vs Independent Reviewer (`OpenCode`).

### C. GitHub Actions Workflow Audit & Security Patch
- Audited all 16 workflows in `.github/workflows/`.
- **CRITICAL SECURITY FIX**: Discovered hardcoded keystore passwords in plaintext in all 4 Android workflows (`pos`, `hr`, `ledger`, `erp`).
- Patched all 4 workflows to reference `${{ secrets.ANDROID_KEYSTORE_PASSWORD }}`.
- Synchronized all `ai-rulez` verifiers (`7 passed, 0 failed`).

---

## 3. Workflow Topology & Execution Order

Total workflows: **16**.

### Deployment Sequence:
1. `ai-rulez-gate.yml` (Mandatory automated PR/Push gate).
2. `7_fastos_client1.yaml` (Base NixOS VPS deployment).
3. `8_diagnose_client1.yaml` (VPS and WireGuard mesh health verification).
4. `5_fastfree_web_panel.yaml` & `6_fastfree_web_website.yaml` (Web control plane).
5. `1_fastfree_web_pos.yaml`, `2_web_hr`, `3_web_ledger`, `4_web_erp` (Enterprise SPAs).
6. `9_build_clan_image.yaml` (Clan client node images: VHDX/ISO).
7. `10_build_tauri_installer.yaml` (Windows desktop node installer release).
8. `1-4_fastfree_android_*.yaml` (Android app store builds).

---

## 4. Mandatory Developer & Agent Invariants

1. **Zero Raw Emojis**: Never use emoji symbols in official UI or terminal banners.
2. **Zero TypeScript Errors**: Always run `npx vue-tsc --noEmit` on affected apps/packages.
3. **Zero Plaintext Secrets**: Strictly use Clan Vars or GitHub Secrets.
4. **Governance Synchronization**: Always verify `npx -y ai-rulez@latest verifiers run --strict` passes before declaring work complete.
