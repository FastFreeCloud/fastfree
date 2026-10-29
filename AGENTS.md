<!--
🤖 AI-RULEZ :: GENERATED FILE — DO NOT EDIT
Project: fastfree
Source: .ai-rulez/config.toml

NEVER edit this file - modify .ai-rulez/ content instead
Use MCP server: npx -y ai-rulez@latest mcp --allow-any-dir --serve-skills
Regenerate: ai-rulez generate

Docs: https://github.com/Goldziher/ai-rulez
Content-Hash: blake3:a81770859294dae69ced0038643515b670267381ce0f1c6c078a970484aad127
-->

# fastfree

FastFree Sovereign Monorepo & Multi-Agent OS Ecosystem

## Rules

### desktop-installer

_Applies to: `apps/fastfree_installer/**`_

**Priority:** critical

When working within `apps/fastfree_installer`:

1. **Zero TypeScript & Cargo Errors**:
   - Always verify `vue-tsc --noEmit` and `vite build` pass with 0 errors.
   - Always verify `cargo check --manifest-path apps/fastfree_installer/src-tauri/Cargo.toml` passes with 0 warnings or errors.

2. **Native Windows 11 Fluent 2 Aesthetic**:
   - Maintain pure desktop design: Mica/Acrylic deep-dark theme, rounded corners (`16px`), Segoe UI Variable typography.
   - Native caption buttons (minimize, close with Windows `#C42B1C` hover).
   - Window shadows enabled via DWM (`"shadow": true`).

3. **Official Brand Assets Only**:
   - Never use raw emojis (`⚡`, etc.) in titlebar branding, action buttons, or update badges.
   - Always use the official FastFree Infinity Mark SVG (`/logo.svg`) and brand logo (`/logo-full.svg`).

4. **Splashscreen Reliability**:
   - `splashscreen.html` must always be listed in `vite.config.ts`'s `rollupOptions.input` so it is bundled directly into `dist/splashscreen.html`.
   - Splashscreen displays a minimum of 2.5s during hardware discovery to ensure seamless transition without flicker.
   - `close_splashscreen` command in Rust must show and focus the `main` window before closing the splash window.

5. **Updater & Provisioning Integrity**:
   - Application updates must use native Rust `tauri_plugin_updater::UpdaterExt` rather than JavaScript Web APIs.
   - Mandatory update gate locks wizard progress when a required version is pending.
   - Real VM status is queried live via Hyper-V PowerShell commands.

6. **Multi-Agent Verification Mandate (Herdr + OpenCode)**:
   - For all architectural, security, or release validations of `apps/fastfree_installer`, the active AI agent MUST orchestrate an independent verification loop via Herdr MCP and OpenCode (`herdr-review-loop`).
   - The primary agent spins up Herdr (`herdr server` / `herdr_status`) and opens an OpenCode reviewer session via `herdr_open_agent(name="opencode-reviewer", ...)`.
   - OpenCode independently inspects code changes, runs build checks (`vue-tsc`, `vite build`, `cargo check`), audits Windows 11 Fluent 2 compliance, and provides an objective sign-off (`VERDICT: APPROVE`).
   - No release or installer finalization is accepted without this dual-agent Herdr + OpenCode audit.

### multi-agent-orchestration

**Priority:** critical

FastFree is designed to run in a collaborative multi-agent ecosystem:

1. **Paseo Daemon Requirement**:
   - The Paseo daemon (`~/.paseo`, local MCP server on `127.0.0.1:6767`) is the canonical orchestrator for AI agents (OpenCode, Claude Code, Codex) across workspaces and worktrees.
   - Any AI assistant acting on major subsystem completions, core packages, or release testing MUST use the Paseo MCP tools (`list_agents`, `create_workspace`, `create_agent`, `send_agent_prompt`, `get_agent_status`, `get_agent_activity`) or the CLI equivalents (`paseo ls/run/send/wait/logs`).

2. **Independent Reviewer Invariant**:
   - Critical milestones (such as finalizing the Desktop Installer, OS deployment profiles, or lowcode runtime invariants) must not rely solely on a single agent's self-assessment.
   - The primary agent acts as **Writer / Implementer**, and MUST launch an **OpenCode** agent with a Review-oriented profile (different provider family, no file edits) via the `paseo-review-loop` skill as an independent **Reviewer**, relaying findings until `VERDICT: APPROVE`.
3. **Skill Contracts**: Use the sanctioned skills — `paseo-conductor` (observe & drive agents), `paseo-fanout` (N worktree-isolated attempts), `paseo-review-loop` (writer/reviewer discipline). Keep destructive calls low: reads are free; creates/prompts are deliberate.

### nixos-clan

_Applies to: `apps/fastfree_os/**`, `flake.nix`, `clan.nix`_

**Priority:** critical

When working on `apps/fastfree_os`:
- **Fleet Topology**: `client1` is the single central public VPS. `client2` through `client11` are customer Hyper-V appliances.
- **Profiles**: Shared system configurations must be in `profiles/base.nix`, `profiles/vps.nix`, or `profiles/hyperv.nix`. Keep `machines/<name>/configuration.nix` minimal.
- **Clan Services**: Core Clan services (`wireguard`, `sshd`, `users`, `internet`) must be declared under `inventory.instances` with `module.input = "clan-core"`. Custom services (e.g. `fastfree-erp`) must use `_class = "clan.service"` and be instantiated under `inventory.instances`.
- **WireGuard**: Each client machine (`client2..11`) gets an isolated WireGuard instance (`client${n}-network`) on a distinct UDP port (`51820 + n`), connecting to controller `client1`.
- **Secrets Management**: Never embed plaintext passwords in Nix expressions. Use Clan Vars (`clan vars generate <machine>`).

### paseo-hub-governance

**Priority:** critical

Paseo is the **sole** agent orchestrator for FastFree; Herdr is fully retired
from the repository and fleet.

1. **Role Boundaries**:
   - Agent orchestration (workspaces, worktrees, prompts, reviews, fan-out) runs exclusively through Paseo MCP tools and the `paseo-conductor` / `paseo-fanout` / `paseo-review-loop` skills.
   - Value beyond raw orchestration: programmatic permission approvals (`list_pending_permissions` / `respond_to_permission`), cron schedules and heartbeats, mobile/web review via the E2E-encrypted relay, and Hub-level org automation.
   - Providers without first-class Paseo support (e.g. Antigravity) MUST be validated via a custom provider / ACP adapter before being used in unattended (scheduled or Hub-triggered) runs.

2. **Sovereignty — Self-Hosted Hub Only**:
   - The Paseo Hub MUST be self-hosted on the sovereign controller (`client1`), NOT the hosted `hub.paseo.sh` origin, for any fleet automation touching customer appliances (`client2..11`).
   - Appliance daemons enroll over the WireGuard mesh using single-use, 10-minute enrollment tokens (`POST /api/v1/daemons/enrollment-tokens`, scope `daemons:enroll`).

3. **Secrets Classification (secure-secrets applies)**:
   - Every Paseo hub API key (`paseo_pk_...`) is a regulated secret: GitHub Secrets or out-of-repo secret storage ONLY. Zero plaintext keys in the repo, Nix expressions, or generated context files.
   - Issued keys use least-privilege scopes; the `fastfree_panel` Hono backend may hold only `runs:dispatch` + `projects:read`.

4. **Trigger Security**:
   - Every trigger MUST declare a non-empty `from_users` allowlist; dispatch actors outside it are rejected (403).
   - Unattended agent steps default to the least-capable mode; `full-access` mode and widened GitHub authority (`contents: write`) require explicit scope justification in the workflow file.
   - Hub has no queue/retry: any consumer (e.g. the panel backend) MUST implement its own retry with a stable `deliveryKey` for dedup.

5. **Lint Gate**: `ai-rulez verifiers run --strict` MUST pass after any change to this rule or to Paseo-related configuration.

### secure-secrets

_Applies to: `**/*.nix`, `**/*.yaml`, `**/*.yml`, `**/*.json`_

**Priority:** critical

1. **Nix Expressions**: Never embed plaintext passwords, private keys, hashes, or API secrets inside `.nix` files.
2. **Clan Vars**: In Clan 26.05, secrets must always be managed via `clan vars generate <machine>` or `clan vars set <machine> <key>`.
3. **Frontend & Mobile**: Never bake private API tokens or keystore passwords directly into client bundles or git commits. Use environment placeholders (`${VAR}`) or secure CI secrets.

### code-quality

**Priority:** high

Follow these coding standards:
- Use descriptive variable names
- Add comments for complex logic
- Write unit tests for new functions
- Keep functions small and focused (typically < 50 lines)
- Handle errors explicitly, never silently

### erp-invariants

_Applies to: `packages/fastfree_accounting/**`, `packages/fastfree_inventory/**`, `packages/fastfree_sales/**`, `packages/fastfree_purchase/**`, `packages/fastfree_hr/**`, `packages/fastfree_crm/**`_

**Priority:** high

When working within ERP domain packages:
1. **Shared Composables**: Always reuse `@fastfree/lowcode` composables:
   - `useFormatNumber` for all currency, amount, and quantity formatting.
   - `useStatusHelpers` for badges and status translations.
2. **Form Submissions**: Every modal form dialog must wire `@submit.prevent` to its save method, with primary action buttons having `type="submit"`.
3. **Save Success Verification**: Always check `result.success` before closing dialogs or resetting form data.
4. **Clean Error Handling**: Always wrap API calls in `try/catch/finally` blocks with user-facing notification via `$q.notify`.
5. **Zero Hardcoded Strings**: All table headers, form labels, tooltips, and status values must be retrieved from the package i18n translation registry.

### frontend-quasar

_Applies to: `apps/fastfree_panel/**`, `apps/fastfree_ledger/**`, `packages/**`_

**Priority:** high

When working on Vue/TypeScript apps and packages:
- **Zero Errors**: Maintain 0 TypeScript errors (`vue-tsc --noEmit`) and clean ESLint.
- **Shared Composables**: Always reuse `useStatusHelpers` (for badges/colors) and `useFormatNumber` (for currency/numbers) instead of duplicating local functions.
- **Form Submissions**: Every form dialog must have `@submit.prevent` wired to its save method, with buttons having `type="submit"`.
- **RTL & i18n**: Support bidirectional layouts (use logical CSS properties like `inset-inline-start/end`) and load translations from i18n package registries.

## Context

### agents

المشروع يدار بواسطة وكلاء ذكاء اصطناعي متعددين يعملون بالتوازي عبر **Paseo** (الديمون المحلي `127.0.0.1:6767` مع حقن أدوات MCP تلقائياً `injectIntoAgents`):
- **الوكلاء النشطون**: Antigravity (`agy`), OpenCode (`opencode`), Claude Code (`claude`).
- **المهارة المشتركة المعتمدة**: [FastFree Guide Skill](file:///.agents/skills/fastfree-guide/SKILL.md).
- **أدوات MCP المتوفرة للوكلاء**:
  1. `ai-rulez`: خادم إدارة الحوكمة الذكي والقواعد والأوامر والفاحصات الحتمية.
  2. `quasar`: مكونات وإضافات Quasar UI.
  3. `playwright`: اختبارات المتصفح وفحص E2E وأخذ لقطات.
  4. `firecrawl-mcp`: استخراج وتلخيص محتوى الويب المتقدم.
  5. `sequential-thinking`: التفكير المنطقي المتسلسل وحل المشكلات المعقدة.
  6. `context7`: توثيق المكتبات الخارجي الحي.
  7. `grep` & `exa`: البحث البرمجي والدلالي.
  8. `midscene-web`: الفحص البصري التلقائي للواجهات.

---

## المتطلبات التقنية الأساسية

| الأداة | الإصدار الأدنى | ملاحظة |
|--------|----------------|--------|
| **Node.js** | **>= 22.22.0** | إلزامي لـ `@quasar/app-vite` 3.10.2 لإنشاء مجلد `.quasar` ومنع أخطاء TS2307 |
| **pnpm** | ^11.11.0 | مدير الحزم المعتمد للمستودع |
| **Git** | أي إصدار حديث | إدارة التفرعات وتثبيت التعديلات |

---

## أوامر الفحص والتشغيل المباشرة

```bash
# fastfree_panel (Quasar 2 + Vite)
cd apps/fastfree_panel
npx quasar prepare
npx vue-tsc --noEmit
npx eslint -c ./eslint.config.js "./src*/**/*.{ts,js,cjs,mjs,vue}"

# fastfree_ledger (Accounting + Sales + Inventory)
cd apps/fastfree_ledger
npx quasar prepare
npx vue-tsc --noEmit
npx eslint -c ./eslint.config.js "./src*/**/*.{ts,js,cjs,mjs,vue}"

# فحص كافة حزم packages/ دفعة واحدة:
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
foreach($p in @('fastfree_lowcode','fastfree_auth','fastfree_accounting','fastfree_inventory','fastfree_sales','fastfree_purchase','fastfree_hr','fastfree_crm')){
  cd "C:\Users\FastFree\Desktop\fastfree\packages\$p"
  Write-Output "$p = $((npx vue-tsc --noEmit 2>&1 | Select-String 'error TS' | Measure-Object).Count)"
}
```

---

## ترتيب تهيئة النظام (Boot Order)

```
fastfree-auth-init        → API client + auth initialized
fastfree-accounting-init  → Accounting groups + screens registered
fastfree-inventory-init   → Inventory groups + screens registered
fastfree-sales-init       → Sales groups + screens registered
fastfree-purchase-init    → Purchase groups + screens registered
fastfree-hr-init          → HR groups + screens registered
fastfree-crm-init         → CRM groups + screens registered
i18n                      → Translations loaded AFTER all packages register their messages
register-service-worker   → PWA registration (last)
```

### architecture

FastFree is a sovereign, offline-first enterprise multi-agent monorepo and operating system ecosystem.

## Directory Structure

- **apps/**: Independent deployable application targets:
  - `fastfree_panel`: Clan Panel SPA (Quasar 2 + Vue 3 + TypeScript + Vite) with private Node/Hono backend (`apps/fastfree_panel/backend`).
  - `fastfree_ledger`: Unified business ledger (Accounting, Sales, Inventory) built on LowCode.
  - `fastfree_erp`, `fastfree_pos`, `fastfree_hr`: Standalone Quasar apps with Capacitor mobile builds (`src-capacitor`).
  - `fastfree_website`: FastFree public portal.
  - `fastfree_backend`: Custom Frappe v15 app (Python / MariaDB).
  - `apps/fastfree_os`: Sovereign NixOS Clan 26.05 infrastructure (VPS `client1`, Hyper-V appliances `client2..11`, WireGuard).
- **packages/**: Core shared modular domain packages (0 TypeScript errors required):
  - `fastfree_lowcode`: UI engine, dynamic forms, datatables, 38 components, 27 composables, RTL/i18n engine.
  - `fastfree_auth`: Identity, licenses, role-based access control (Has Role child tables), API client.
  - `fastfree_accounting`: General ledger, chart of accounts, journal/payment entries, fiscal years, cost centers.
  - `fastfree_inventory`: Items, warehouses, stock entries, bin levels.
  - `fastfree_sales`: Quotations, sales orders, invoices, delivery notes.
  - `fastfree_purchase`: Suppliers, purchase orders, purchase receipts, purchase invoices.
  - `fastfree_hr`: Employees, departments, attendance, leave applications, payroll.
  - `fastfree_crm`: Leads, opportunities, contacts, campaigns.
  - `fastfree_update`: Update orchestration and playground.
- **scripts/**: Automation scripts for brand assets, Android keystores, and store automation.
- **.github/workflows/**: CI/CD deployment pipelines for Clan hosts, Android releases, and web builds.

## Key Principles & Invariants

- **Zero TS Errors**: Enforce `vue-tsc --noEmit` across all apps and packages before push.
- **Zero Raw CSS Offsets in RTL**: Always use logical properties (`inset-inline-start/end`) instead of `left/right`.
- **Reusable Composables**: Reuse `useFormatNumber` (currency/number) and `useStatusHelpers` (badges/status) instead of local helpers.
- **Form Submissions**: Every dialog form must wire `@submit.prevent` to its save function with `type="submit"` buttons.
- **Clan Secrets**: Zero plaintext passwords in Git or Nix expressions; use Clan Vars (`clan vars`).

### session-memory

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
- Added critical invariant: No installer, architectural, or core deployment completion is accepted without independent verification from **OpenCode** running via the **Paseo review-loop**.
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

## Unlisted skills

Some skills are served over MCP and are not listed in this session. Call `find_skill` with a short description of the task, then `load_skill` with the chosen name, on the `ai-rulez` MCP server. If that server is unavailable, read `.ai-rulez/skills/<name>/SKILL.md` instead.
