# FastFree ERP — Project Context for Hermes

## Project Overview
FastFree ERP is an Enterprise Resource Planning system unified across modular packages and dedicated core apps.
- **Frontend:** Quasar (Vue 3 + TypeScript), monorepo (pnpm)
- **Backend:** Frappe (Python), scaffold only
- **Infrastructure:** NixOS/Clan (11 nodes)
- **Desktop:** Tauri (Rust)
- **Website:** Next.js

## Directory Structure
```
fastfree/
├── apps/           # 3 Core apps (Installer, Backend, Website)
├── packages/       # 11 Modular packages (Accounting, Auth, CRM, HR, Inventory, Lowcode, OS, Panel, Purchase, Sales, Update)
├── bots/           # 10 Python automation bots
├── scripts/        # Build/deploy scripts
├── .hermes/        # Project-local Hermes skills (10 specialist skills)
└── fastfree_mcp_tools/  # MCP tools
```

## Development Workflow
1. Use specialist profiles: cto, pm, architect, uiux, frontend, backend, devops, qa, security, reviewer
2. Use project-local skills: /fastfree-cto, /fastfree-pm, /fastfree-frontend, etc.
3. Use Kanban board: fastfree-erp
4. Use subagents for parallel work: delegate_task
5. Use bots for automation: python bots/*.py

## Free-First Policy
- Use only free/open-source tools
- Model: reflection/beam-1.0-501b-a23b:free (Nous)
- Never use paid services without approval

## Conventions
- TypeScript strict mode
- Vue 3 Composition API (script setup)
- i18n: en + ar (RTL)
- CSS variables (not hardcoded colors)
- Service layer pattern
- Pinia stores
- Screen registry (screens.ts)

## Hermes Project-Local Home
- `.hermes/` is the official project-local Hermes home (`HERMES_HOME`).
- Run Hermes inside this project with `scripts/hermes-project.ps1` or set `HERMES_HOME=C:\Users\FastFree\Desktop\fastfree\.hermes`.
- Project-local skills live in `.hermes/skills/fastfree/`.
- Project context comes from `AGENTS.md`; agent identity comes from `.hermes/SOUL.md`.
- Secrets belong in `.hermes/.env` and `.hermes/auth.json`, never in tracked files.
- `FASTFREE_DEVELOPMENT_GOALS.md` — Development roadmap
- `PROJECT_KNOWLEDGE_BASE.md` — Project knowledge base
- `opencode.json` — MCP configuration
- `package.json` — Root package config
- `pnpm-workspace.yaml` — Workspace config
