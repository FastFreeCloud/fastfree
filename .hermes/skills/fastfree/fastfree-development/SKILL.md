---
name: fastfree-development
description: "Develop FastFree ERP: frontend, backend, tests, deploy."
version: 1.0.0
author: FastFree (fastfree), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [fastfree, erp, development, frontend, backend, quasar, frappe]
    related_skills: [project-cleanup, codebase-inspection, systematic-debugging, test-driven-development]
---

# FastFree ERP Development Skill

Develop FastFree ERP — a Quasar (Vue 3 + TypeScript) frontend with Frappe (Python) backend, 9 apps, 9 packages, monorepo with pnpm.

## When to Use

- User asks to develop, modify, or extend FastFree ERP
- User wants to add features to any app (ERP, HR, Ledger, POS, Panel, Website, OS, Installer, Backend)
- User wants to work on any package (Auth, CRM, Accounting, Inventory, Sales, Purchase, HR, Lowcode, Update)
- User needs to run tests, build, or deploy

## Prerequisites

- Node.js 18+ and pnpm installed
- Python 3.10+ for backend
- Project at `C:\Users\FastFree\Desktop\fastfree`
- Quasar CLI: `pnpm add -g @quasar/cli`
- Frappe bench (for backend development)

## How to Run

### Step 1: Start development server

```bash
cd C:/Users/FastFree/Desktop/fastfree
pnpm dev  # or pnpm --filter fastfree_hr dev
```

### Step 2: Run tests

```bash
cd C:/Users/FastFree/Desktop/fastfree
pnpm test  # Vitest
pnpm test:e2e  # Cypress
```

### Step 3: Build

```bash
cd C:/Users/FastFree/Desktop/fastfree
pnpm build  # Build all
pnpm --filter fastfree_hr build  # Build specific
```

### Step 4: Deploy

```bash
cd C:/Users/FastFree/Desktop/fastfree
pnpm deploy  # Deploy all
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server (all apps) |
| `pnpm --filter fastfree_hr dev` | Start HR app dev server |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:e2e` | Run E2E tests (Cypress) |
| `pnpm build` | Build all apps |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |

## Architecture

### 9 Apps

| App | Purpose | Tech |
|-----|---------|------|
| fastfree_erp | Main ERP shell | Quasar (Vue 3 + TS) |
| fastfree_hr | HR management | Quasar (Vue 3 + TS) |
| fastfree_ledger | Accounting ledger | Quasar (Vue 3 + TS) |
| fastfree_pos | Point of sale | Quasar (Vue 3 + TS) |
| fastfree_panel | Admin panel (Hono backend) | Quasar + Hono |
| fastfree_website | Marketing website | Next.js |
| fastfree_backend | Frappe backend (Python) | Frappe (Python) |
| fastfree_os | NixOS/Clan infrastructure | NixOS |
| fastfree_installer | Desktop installer | Vue 3 + Tauri (Rust) |

### 9 Packages
| Package | Purpose |
|---------|---------|
| fastfree_auth | Authentication & authorization |
| fastfree_crm | Customer relationship management |
| fastfree_accounting | Accounting logic |
| fastfree_inventory | Inventory management |
| fastfree_sales | Sales management |
| fastfree_purchase | Purchase management |
| fastfree_hr | HR management (screens, services, stores) |
| fastfree_lowcode | Lowcode platform (window manager, CRUD) |
| fastfree_update | Update management |

### Development Pattern

Each package follows this structure:
```
packages/fastfree_<name>/
├── src/
│   ├── index.ts          # Package entry point
│   ├── init.ts           # Initialization
│   ├── screens/          # Vue screen components
│   ├── services/         # API services
│   ├── stores/           # Pinia stores
│   ├── types/            # TypeScript types
│   └── locales/          # i18n (en, ar)
├── package.json
├── tsconfig.json
└── README.md
```

## Procedure

### Adding a new feature to HR module:

1. **Create types** — Add TypeScript types in `packages/fastfree_hr/src/types/index.ts`
2. **Create service** — Add API service in `packages/fastfree_hr/src/services/<name>.service.ts`
3. **Create store** — Add Pinia store in `packages/fastfree_hr/src/stores/useHrStore.ts`
4. **Create screen** — Add Vue screen in `packages/fastfree_hr/src/screens/<Name>.vue`
5. **Register screen** — Add to `packages/fastfree_hr/src/screens.ts`
6. **Add i18n** — Add translations in `locales/en.ts` and `locales/ar.ts`
7. **Test** — Write tests in `tests/`
8. **Build** — Run `pnpm --filter fastfree_hr build`

### Delegating to subagents:

Use `delegate_task` for parallel work:
- Frontend changes (Vue/TS) → subagent with frontend context
- Backend changes (Python/Frappe) → subagent with backend context
- Test writing → subagent with test context
- Documentation → subagent with docs context

### Using bots for development:

```bash
# Code inspection
python bots/project_bot.py

# Design audit
python bots/design_auditor_bot.py

# Architecture mapping
python bots/architecture_mapper_bot.py

# Test running
python bots/test_runner_bot.py

# Cleanup
python bots/cleanup_bot.py
python bots/deep_cleanup_bot.py
```

## Communication

- **Respond in Arabic only** (Egyptian dialect) — user's standing preference
- Be direct and concise — no verbose explanations
- No Russian/English mixing except file names and commands
- Execute commands, verify, and report what actually returned
- Use HTML for deliverables with RTL support (dir="rtl") and CSS variables

## Free-First Policy

- Use only free/open-source tools and models
- All profiles use `reflection/beam-1.0-501b-a23b:free` (Nous) — no paid models
- Prefer local models, free APIs, open-source tools
- Never enable billing or use paid fallbacks
- Verify licensing and costs before recommending tools

## Hermes Profiles & Kanban

### Profiles (10 specialists)
Profiles live in `~/.hermes/profiles/`, NOT in the project. Each profile has:
- `config.yaml` — model, terminal.cwd, skills.external_dirs
- `SOUL.md` — personality and role definition
- `memories/` — persistent memory
- `skills/` — profile-specific skills

Project-local skills are shared via `skills.external_dirs` pointing to `fastfree/.hermes/skills/`.

### Kanban
- Board: `fastfree-erp` (created with `hermes kanban boards create fastfree-erp`)
- Tasks assigned to specialist profiles
- Dispatched via Hermes gateway (ticks every 60s)

### Specialist Profiles
| Profile | Role | Skill |
|---------|------|-------|
| cto | CTO/Engineering Manager | fastfree-cto |
| pm | Product Manager | fastfree-pm |
| architect | Software Architect | fastfree-architect |
| uiux | UI/UX Designer | fastfree-uiux |
| frontend | Frontend Developer | fastfree-frontend |
| backend | Backend Developer | fastfree-backend |
| devops | DevOps Engineer | fastfree-devops |
| qa | QA Engineer | fastfree-qa |
| security | Security Engineer | fastfree-security |
| reviewer | Code Reviewer | fastfree-reviewer |

## Pitfalls
- Never modify `node_modules/` directly
- Always run `pnpm install` after changing `package.json`
- Frappe backend requires `bench start` (not just `python`)
- Quasar apps need `quasar dev` (not `npm run dev`)
- i18n keys must exist in both `en.ts` and `ar.ts`
- TypeScript strict mode is enabled — fix all type errors
- RTL support required for Arabic — use logical properties (`margin-inline-start` not `margin-left`)
- pnpm may not be in PATH on Windows — use `node_modules/.bin/vitest` directly
- Frappe backend: create DocType JSON + controller .py + API endpoints in separate files
- Vitest tests: use `vi.mock()` for Frappe API layer, target 100% coverage on services
- RTL: use CSS variables (--foreground, --muted-foreground, --accent, --border, --card)
- Accessibility: add ARIA labels, roles, aria-modal, aria-required on all interactive elements
- i18n: verify en.ts and ar.ts have identical key sets
- Frappe controller: validate() method for required fields, email format, date logic, unique constraints
- Subagents: don't dispatch multiple for same files; verify results (tests, compile, JSON validity)
- .hermes/ in project must only contain config.yaml + skills/ — never copy global Hermes home here
- Git cleanup: after messy operations, verify .hermes/ structure with `find .hermes -type f`
- Installer uses Vue 3 + Tauri (Rust), NOT Quasar — separate build process
- Rust compile: fix undefined params, truncated identifiers, then verify with cargo build
- Security: never hardcode secrets; use env vars; sanitize PowerShell; canonicalize paths
- Runtime: VM memory — use available_memory_mb (not total) for RAM recommendations; clamp to available - headroom; min 2048 MB; default 2048 MB in frontend fallbacks
- OpenCode: use beam-free model (`opencode run -m opencode/beam-free`) when free limit hit; always verify git diff after OpenCode runs; clean up extra files (.hermes/backups, .hermes/bin, .hermes/installs, .hermes/logs, tools/) that may be created in project root
- OpenCode: .hermes/ in project must only contain config.yaml + skills/ — never copy global Hermes home here (OpenCode may create backups/installs/logs/bin that pollute the project)

## Verification

- Run `pnpm typecheck` — should pass
- Run `pnpm lint` — should pass
- Run `pnpm test` — should pass
- Run `pnpm build` — should succeed
- Check `git diff` — only intended changes
