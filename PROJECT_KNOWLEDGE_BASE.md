# FastFree ERP — Project Knowledge Base (for Bots)

## 🎯 Project Overview
- **Name:** FastFree ERP
- **Type:** Full Enterprise Resource Planning (ERP) system
- **Path:** `C:\Users\FastFree\Desktop\fastfree`
- **Backend:** Frappe (Python) — `apps/fastfree_backend/`
- **Frontend:** Quasar (Vue 3 + TypeScript) — `packages/` modular packages (installer shell in `apps/fastfree_installer/`)
- **Architecture:** Monorepo with 3 core apps + 10 modular packages

## 📁 Apps (3 core apps)
| App | Name | Description | Scripts |
|-----|------|-------------|---------|
| fastfree_backend | Frappe app | Custom Frappe application for FastFree Cloud | Python (bench) |
| fastfree_installer | @fastfree/installer | Tauri desktop installer | dev, build, tauri |
| fastfree_website | @fastfree/website | Next.js website | dev, build, start |

> Decommissioned (now modular packages): `fastfree_erp`, `fastfree_ledger`,
> `fastfree_hr`, `fastfree_pos` → superseded by `packages/fastfree_*`.

## 📦 Packages (10 modular packages)
| Package | Name | Description |
|---------|------|-------------|
| fastfree_accounting | fastfree-accounting | Chart of Accounts, Journal Entries, Payments, Ledger, Cost Centers, Fiscal Years, Financial Reports |
| fastfree_auth | fastfree-auth | Authentication, permissions, license, common services |
| fastfree_crm | fastfree-crm | CRM module |
| fastfree_hr | fastfree-hr | HR module |
| fastfree_inventory | fastfree-inventory | Products, Categories, Warehouses, Stock Entries, Suppliers |
| fastfree_lowcode | quasar-app-extension-fastfree-lowcode | Low-code engine: Window Manager, CRUD Table, Dynamic Form |
| fastfree_os | (no pkg.json) | NixOS/Clan deployment flake (11 nodes) |
| fastfree_panel | @fastfree/panel | Quasar SPA + Node backend for the Clan CLI (SDUI JSON schemas) |
| fastfree_purchase | fastfree-purchase | Purchase Management |
| fastfree_sales | fastfree-sales | Sales module |

## 🤖 5 Bots for Project Understanding

### Bot-1: Code Inspector
- **Purpose:** Analyze LOC, languages, file counts
- **Tools:** pygount, search_files
- **Output:** Codebase statistics, language breakdown

### Bot-2: Design Auditor
- **Purpose:** Check design tokens, colors, fonts, RTL, borders
- **Files:** tokens.css, quasar.config.ts, css/variables
- **Score:** 3/10 (needs fix)
- **Issues:** tokens.css not imported, color mismatch (#1976D2 vs #38BDF8), default fonts vs Cairo, physical CSS props vs logical

### Bot-3: Architecture Mapper
- **Purpose:** Map dependencies between apps and packages
- **Output:** Dependency graph, module relationships

### Bot-4: GitHub/CI Manager
- **Purpose:** Track PRs, issues, CI workflows
- **Tools:** gh CLI, GitHub API
- **Workflows:** 12+ CI pipelines

### Bot-5: Test Runner
- **Purpose:** Run E2E (Playwright) and unit tests (Vitest)
- **Coverage:** accounting utils, UI components

## 🔧 Technology Stack
- **Backend:** Frappe (Python 3.10+), bench
- **Frontend:** Quasar (Vue 3, TypeScript, Vite)
- **Website:** Next.js
- **Installer:** Tauri (Rust + Vue)
- **OS:** NixOS (deployment)
- **Package Manager:** pnpm
- **Testing:** Playwright (E2E), Vitest (unit)
- **CI/CD:** GitHub Actions (12+ workflows)
- **Linting:** ESLint, oxlint, oxfmt

## 📋 8 Development Phases
1. Codebase Inspection (pygount → LOC, languages)
2. Design Audit (tokens, colors, fonts, RTL → fix to score 8/10)
3. Delegation (OpenCode workers for parallel tasks)
4. GitHub Integration (PRs, issues, CI monitoring)
5. Testing (Playwright E2E + Vitest unit)
6. Notifications (Telegram for build/PR/design status)
7. Research (Frappe/Quasar/Vue documentation)
8. Memory (store architecture conventions across sessions)

## 🔗 Key Files
- `opencode.json` — MCP server configuration (13 servers)
- `AGENTS.md` — Agent instructions and conventions
- `DESIGN.md` — Design system documentation
- `pnpm-workspace.yaml` — Monorepo workspace config
- `tsconfig.json` — TypeScript configuration
