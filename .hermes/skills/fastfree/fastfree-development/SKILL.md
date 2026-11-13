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

Develop FastFree ERP — a Quasar (Vue 3 + TypeScript) frontend with Frappe (Python) backend: 3 core apps, 10 modular packages, 1 plugin, pnpm monorepo.

## When to Use

- User asks to develop, modify, or extend FastFree ERP
- User wants to add features to any app (Installer, Backend, Website)
- User wants to work on any package (Auth, CRM, Accounting, Inventory, Sales, Purchase, HR, Lowcode, OS, Panel)
- User needs to run tests, build, or deploy

## Prerequisites

- Node.js 18+ and pnpm installed
- Python 3.10+ for backend
- Project at `C:\Users\FastFree\Desktop\fastfree`
- Quasar CLI: `pnpm add -g @quasar/cli`
- Frappe bench (for backend development)

## How to Run

### Step 1: Run tests

```bash
cd C:/Users/FastFree/Desktop/fastfree
pnpm run test:unit      # Vitest across all workspace packages
pnpm run test:coverage  # same + 80% coverage gate
```

### Step 2: Build one app

```bash
cd C:/Users/FastFree/Desktop/fastfree
pnpm --filter fastfree_installer build  # vue-tsc --noEmit && vite build
pnpm --filter fastfree_website build    # next build
```

The root package.json has no `dev`/`build`/`lint`/`deploy` scripts — run per-package scripts, not root ones.

### Step 3: Start a dev server

```bash
cd C:/Users/FastFree/Desktop/fastfree
pnpm --filter fastfree_panel dev               # panel SPA
bun --cwd apps/fastfree_installer run tauri dev
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm run test:unit` | Vitest across all workspace packages |
| `pnpm run test:coverage` | Tests + 80% coverage gate |
| `pnpm --filter <pkg> build` | Build one package/app |
| `pnpm --filter <pkg> typecheck` | Typecheck one package |
| `cd plugins/fastfree_board && node --test tests/*.test.mjs` | Board plugin tests |

## Architecture

### 3 Core Apps (`apps/`)
| App | Purpose | Tech |
|-----|---------|------|
| fastfree_installer | Desktop installer (node setup, licenses, WireGuard, SDUI launchpad) | Vue 3 + Quasar + Tauri 2 (Rust) |
| fastfree_backend | ERP data model (17 Frappe DocTypes) + employee API | Frappe (Python) |
| fastfree_website | Marketing site (i18n AR/EN RTL, SEO) | Next.js 15 + React 19 |

### 10 Modular Packages (`packages/`)
| Package | Purpose |
|---------|---------|
| fastfree_auth | Authentication & authorization |
| fastfree_crm | Customer relationship management |
| fastfree_accounting | Accounting logic |
| fastfree_inventory | Inventory management |
| fastfree_sales | Sales management |
| fastfree_purchase | Purchase management |
| fastfree_hr | HR management (screens, services, stores) |
| fastfree_lowcode | Lowcode engine (window manager, CRUD, dynamic form, SDUI runtime) |
| fastfree_os | NixOS/Clan infrastructure flake (no package.json) |
| fastfree_panel | Clan panel SPA + private Hono backend |

### 1 Plugin (`plugins/`)
| Plugin | Purpose |
|--------|---------|
| fastfree_board | Kanban board inside OpenCode Desktop (see the `fastfree-board` skill) |

`AGENTS.md` and older docs still describe 9 apps / 11 packages and a `bots/` directory — none of that matches the filesystem. Trust the `apps/`, `packages/`, `plugins/` listings over those docs.

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

### Bots

`bots/` no longer exists in the repo (the ten Python bots were deleted). Use `delegate_task` subagents and `scripts/` tooling instead; do not reference `bots/*.py` in plans.

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
- Verify app/package counts and directory existence against the filesystem before planning — `AGENTS.md`, `PROJECT_KNOWLEDGE_BASE.md`, and this skill have all drifted from reality (non-existent apps, `bots/`, `fastfree_update`)

## Verification

- Run `pnpm typecheck` — should pass
- Run `pnpm lint` — should pass
- Run `pnpm test` — should pass
- Run `pnpm build` — should succeed
- Check `git diff` — only intended changes
