# FastFree ERP — Project Knowledge Base (for Bots)

## 🎯 Project Overview
- **Name:** FastFree ERP
- **Type:** Full Enterprise Resource Planning (ERP) system
- **Path:** `C:\Users\FastFree\Desktop\fastfree`
- **Backend:** Frappe (Python) — `apps/fastfree_backend/`
- **Frontend:** Quasar (Vue 3 + TypeScript) — `apps/fastfree_erp/`
- **Architecture:** Monorepo with apps + packages

## 📁 Apps (9 applications)
| App | Name | Description | Scripts |
|-----|------|-------------|---------|
| fastfree_backend | Frappe app | Custom Frappe application for FastFree Cloud | Python (bench) |
| fastfree_erp | FastFree ERP | Full Enterprise Resource Planning | dev, build, typecheck, lint |
| fastfree_hr | FastFree HR | Human Resources + CRM | dev, build, typecheck, lint |
| fastfree_installer | @fastfree/installer | Tauri desktop installer | dev, build, tauri |
| fastfree_ledger | FastFree Ledger | Accounting + Sales + Inventory | dev, build, typecheck, lint |
| fastfree_os | (no pkg.json) | NixOS configuration for deployment | CLI scripts |
| fastfree_panel | fastfree | Quasar SPA + Node backend for Clan CLI | dev, build, test:e2e |
| fastfree_pos | FastFree POS | Point of Sale | dev, build, typecheck, lint |
| fastfree_website | fastfree | Next.js website | dev, build, start |

## 📦 Packages (9 reusable packages)
| Package | Name | Description |
|---------|------|-------------|
| fastfree_accounting | fastfree-accounting | Chart of Accounts, Journal Entries, Payments, Ledger, Cost Centers, Fiscal Years, Financial Reports |
| fastfree_auth | fastfree-auth | Authentication, permissions, license, common services |
| fastfree_crm | fastfree-crm | CRM module |
| fastfree_hr | fastfree-hr | HR module |
| fastfree_inventory | fastfree-inventory | Products, Categories, Warehouses, Stock Entries, Suppliers |
| fastfree_lowcode | quasar-app-extension-fastfree-lowcode | Low-code engine: Window Manager, CRUD Table, Dynamic Form |
| fastfree_purchase | fastfree-purchase | Purchase Management |
| fastfree_sales | fastfree-sales | Sales module |
| fastfree_update | quasar-app-extension | Quasar App Extension |

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
