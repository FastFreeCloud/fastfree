<!--
🤖 AI-RULEZ :: GENERATED FILE — DO NOT EDIT
Project: fastfree
Source: .ai-rulez/config.toml

NEVER edit this file - modify .ai-rulez/ content instead
Use MCP server: npx -y ai-rulez@latest mcp --allow-any-dir --serve-skills
Regenerate: ai-rulez generate

Docs: https://github.com/Goldziher/ai-rulez
Content-Hash: blake3:a9d2605e9bdb479058821ecf369b4591dad50320cf020ddefa04a6821d2dcba7
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

6. **Multi-Agent Verification Mandate (Paseo + OpenCode)**:
   - For all architectural, security, or release validations of `apps/fastfree_installer`, the active AI agent MUST orchestrate an independent verification loop via Paseo MCP and OpenCode (`paseo-review-loop`).
   - The primary agent creates a worktree-isolated workspace (`create_workspace`) and opens an OpenCode reviewer agent via `create_agent` with an initial review prompt.
   - OpenCode independently inspects code changes, runs build checks (`vue-tsc`, `vite build`, `cargo check`), audits Windows 11 Fluent 2 compliance, and provides an objective sign-off (`VERDICT: APPROVE`).
   - No release or installer finalization is accepted without this dual-agent Paseo + OpenCode audit.

### multi-agent-orchestration

**Priority:** critical

FastFree is powered by an autonomous, multi-agent meta-harness ecosystem:

1. **Omnigent Meta-Harness & Subagents Architecture**:
   - Omnigent (`~/.omnigent`, local server on `127.0.0.1:8090`) is the canonical orchestrator for AI agents and subagents.
   - Omnigent coordinates specialized subagents defined via declarative YAML specifications in `.omnigent/agents/` (e.g., `fastfree_supervisor.yaml` coordinating `subagent_researcher`, `subagent_implementer`, and `subagent_reviewer`).
   - Worktree isolation: Each execution session runs in a dedicated ephemeral Git worktree (`.worktrees/omnigent-*`), isolating code mutations from the primary working directory.
   - Paseo and Herdr are retired from canonical fleet orchestration in favor of Omnigent.

2. **Hindsight Persistent Long-Term Memory**:
   - Long-term memory is managed via the Hindsight memory engine (`fastfree-core-memory` bank).
   - Agents maintain cognitive continuity across sessions via `hindsight_recall`, `hindsight_retain`, and `hindsight_reflect`.
   - **Secret Sanitizer Invariant**: Every memory payload passes through `MemorySanitizer` before indexing; WireGuard keys, Clan Vars, keystore passwords, and internal Hyper-V IPs are strictly forbidden from being ingested into memory banks.

3. **Independent Reviewer Invariant (Dual-Agent Review Loop)**:
   - The primary implementer acts as **Writer / Implementer** (Claude / Antigravity).
   - An independent **Reviewer** agent (OpenCode / DeepSeek R1 profile) must audit diffs, run `vue-tsc`, verify AI-Rulez policies, and issue an objective sign-off (`VERDICT: APPROVE`).
   - No release, installer finalization, or core monorepo mutation is accepted without independent verification.

4. **Human-In-The-Loop (HITL) Approvals & Cost Caps**:
   - Destructive operations (`git push`, `rm -rf`, `clan vars set`) require explicit operator authorization via the Approvals Gate.
   - Cost ceilings and token budgets are enforced in real-time.

### nixos-clan

_Applies to: `apps/fastfree_os/**`, `flake.nix`, `clan.nix`_

**Priority:** critical

When working on `apps/fastfree_os`:
- **Fleet Topology**: All 11 nodes (`client1` through `client11`) are sovereign Hyper-V appliances. `client1` serves as the central mesh controller appliance (with port forwarding UDP 51820 on router/Windows Firewall).
- **Profiles**: Shared system configurations must be in `profiles/base.nix` or `profiles/hyperv.nix`. Keep `machines/<name>/configuration.nix` minimal.
- **Clan Services**: Core Clan services (`wireguard`, `sshd`, `users`, `internet`) must be declared under `inventory.instances` with `module.input = "clan-core"`. Custom services (e.g. `fastfree-erp`) must use `_class = "clan.service"` and be instantiated under `inventory.instances`.
- **WireGuard**: Nodes connect to controller `client1` on UDP port `51820`. Each peer node (`client2..11`) gets an isolated WireGuard instance (`client${n}-network`) on a distinct UDP port (`51820 + n`).
- **Secrets Management**: Never embed plaintext passwords in Nix expressions. Use Clan Vars (`clan vars generate <machine>`).

### paseo-hub-governance

**Priority:** critical

Omnigent is the **canonical** agent orchestrator for FastFree; Paseo and Herdr are retired from canonical fleet orchestration and replaced by Omnigent on port `8090`.

1. **Role Boundaries & Multi-Harness Integration**:
   - Agent orchestration (workspaces, worktrees, subagents, reviews, fan-out) runs through Omnigent server/runner architecture and Hindsight memory banks.
   - Omnigent enforces OS-level sandboxing (bubblewrap/seccomp), L7 egress proxying for sensitive credentials, and centralized MCP connection pooling (`ServerMcpPool`).
   - Programmatic permission approvals (`apiPendingApprovals` / `apiDecideApproval`) operate via the FastFree Panel Hono backend (`/api/v1/governance/*`).

2. **Sovereignty & Isolated Runner**:
   - The Omnigent runner executes locally on host or sovereign VPS (`client1`).
   - Customer appliances (`client2..11`) are protected by network isolation; runners are strictly blocked from probing the `10.0.0.0/8` WireGuard subnet.

3. **Secrets Classification & DLP (secure-secrets applies)**:
   - Sensitive credentials (keystore passwords, Clan Vars, private keys) are brokered at the L7 proxy layer and never passed as raw environment variables to agent prompts.
   - The DLP inspection engine terminates any egress connection containing WireGuard or Clan Var secret patterns.

4. **Lint Gate**: `ai-rulez verifiers run --strict` MUST pass after any change to orchestration or governance configuration.

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
  - `apps/fastfree_os`: Sovereign NixOS Clan 26.05 infrastructure (All 11 nodes `client1..11` are Hyper-V appliances, WireGuard mesh).
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

### beads

Run `bd ready` to find available work. Issues are stored in the local Dolt DB
(`fastfree-<hash>`); sync uses your git remote under `refs/dolt/data`.

## Quick Reference

```bash
bd ready              # find available work
bd show <id>          # view issue details
bd update <id> --claim # claim work
bd close <id>         # complete work
```

## Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite or markdown TODO lists.
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files.
- Do not commit/push without explicit authority from orchestrator or current user request.
- Conservative default: report status and proposed commands at handoff; wait for approval.

### session-memory

> **Target Audience**: AI Agents (OpenCode, Claude, Antigravity)  
> **Source**: Synchronized Monorepo Knowledge Base  
> **Last Updated**: 2026-10-28

---

## 1. System Overview & Monorepo Topology

FastFree is a sovereign, offline-first enterprise multi-agent monorepo and operating system ecosystem.

### Key Targets:
- **`apps/fastfree_installer`**: Tauri v2 + Vue 3 desktop node installer for Windows 11 Fluent 2.
- **`apps/fastfree_os`**: Sovereign NixOS Clan 26.05 infrastructure (11 sovereign Hyper-V appliance nodes `client1..11`).
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

### D. Omnigent & Hindsight Integration (Paseo Retired)
- **Omnigent Meta-Harness**: Integrated on port `8090` with declarative YAML specs (`.omnigent/agents/fastfree_supervisor.yaml`) coordinating subagent researcher, implementer, and reviewer.
- **Hindsight Long-Term Memory**: Structured cross-session memory across World Facts, Agent Experiences, Entity Summaries, and Evolving Beliefs.
- **Secret Sanitizer Engine**: Strict regex + entropy filter (`MemorySanitizer`) preventing WireGuard keys, Clan Vars, and keystore passwords from memory retention.
- **Quasar AI Engineering Studio**: Mounted `ClanOmnigentScreen.vue` and upgraded `ClanAgentsHub.vue` with Session Trees, Approvals Gate, Cost/Token Telemetry, and Hindsight Memory Explorer.
- **Paseo Retirement**: Paseo gracefully retired in favor of Omnigent's unified meta-harness architecture.

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
4. **Governance Synchronization**: Always verify `npx -y ai-rulez@5.9.2 verifiers run --strict` passes before declaring work complete.

## Unlisted skills

Some skills are served over MCP and are not listed in this session. Call `find_skill` with a short description of the task, then `load_skill` with the chosen name, on the `ai-rulez` MCP server. If that server is unavailable, read `.ai-rulez/skills/<name>/SKILL.md` instead.
