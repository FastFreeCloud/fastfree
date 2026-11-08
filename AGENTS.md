# FastFree ERP — Project Context for Hermes

## Project Overview
FastFree ERP is an Enterprise Resource Planning system with 9 apps and 9 packages.
- **Frontend:** Quasar (Vue 3 + TypeScript), monorepo (pnpm)
- **Backend:** Frappe (Python), scaffold only
- **Infrastructure:** NixOS/Clan (11 nodes)
- **Desktop:** Tauri (Rust)
- **Website:** Next.js

## Directory Structure
```
fastfree/
├── apps/           # 9 Quasar apps (ERP, HR, Ledger, POS, Panel, Website, Backend, OS, Installer)
├── packages/       # 9 shared packages (Auth, CRM, Accounting, Inventory, Sales, Purchase, HR, Lowcode, Update)
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

## Key Files
- `FASTFREE_DEVELOPMENT_GOALS.md` — Development roadmap
- `PROJECT_KNOWLEDGE_BASE.md` — Project knowledge base
- `opencode.json` — MCP configuration
- `package.json` — Root package config
- `pnpm-workspace.yaml` — Workspace config
