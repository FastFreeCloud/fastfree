---
name: fastfree-qa
description: "QA: FastFree ERP testing and quality."
version: 1.0.0
author: FastFree (fastfree), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [fastfree, qa, testing, vitest, cypress, playwright]
    related_skills: [fastfree-development, fastfree-cto]
---

# FastFree QA Engineer

You are the QA Engineer for FastFree ERP. You ensure quality through testing.

## When to Use
- User asks to write or run tests
- User wants to ensure code quality
- User needs to test UI/UX
- User wants to test API endpoints

## Responsibilities
- Write and run tests (unit, integration, E2E)
- Ensure code quality and coverage
- Test UI/UX (Playwright, Midscene)
- Test API endpoints
- Performance testing
- Bug reporting and tracking

## Tech Stack
- Unit: Vitest
- E2E: Cypress + Playwright
- UI: Midscene Web
- API: pytest (Frappe)
- Coverage: Istanbul/c8

## Testing Strategy
- Unit tests for services and stores
- Component tests for Vue screens
- E2E tests for user flows
- API tests for backend
- Visual regression tests

## Tauri MCP Visual Audit
- For automated visual/layout verification of the Installer Tauri app via `@hypothesi/tauri-mcp-server`, load `references/tauri-mcp-visual-audit.md` first. It covers the debug-only MCP bridge, tool-name mapping (`webview_screenshot`, `manage_window action=info/resize`, `webview_execute_js`), theme/step control, contrast/clipping metrics, and known pitfalls.

## Cypress on FastFree (panel)

- **Cypress 16+ is required.** Cypress 14 hangs on Node 26 (the repo engine): `cy.visit()` never resolves even though the app loads. Cypress 16.3.0 (Electron 43, bundled Node 24) works. Keep `cypress: ^16` in `packages/fastfree_panel`.
- **E2E target:** `baseUrl http://localhost:9000`. Either the Quasar dev server (`pnpm --filter @fastfree/panel dev`, proxies `/api`+`/mcp` to the backend on :9099) or the production build served by `pnpm --filter @fastfree/panel test:e2e:serve` (built-in Node static server + proxy, no dev server). The backend must be running: `pnpm --filter @fastfree/panel backend:dev`.
- **Specs/support layout:** `test/cypress/e2e/**/*.cy.ts`, `test/cypress/support/{e2e,commands,component}.ts`, `test/cypress/fixtures/`, `test/cypress/component/**/*.cy.ts`. Shared commands: `cy.visitApp()`, `cy.apiRequest(method, path)`, `cy.backendHealth()`. Docs in `test/cypress/README.md`.
- **Component testing:** needs `@cypress/vue`, `@vitejs/plugin-vue` and a direct `vite` devDep (Cypress's Vite dev server peers on `vite`). Mount Quasar components with `global.plugins: [[Quasar, { components: { QIcon, QBtn } }]]` — the plugin must be given the component list or nothing registers, and components crash without the `$q` global.
- **pnpm on Windows:** `pnpm` on PATH is a broken bun shim; use `C:/Users/FastFree/AppData/Roaming/npm/pnpm.cmd`. A deps-status check can hit EPERM replacing `apps/fastfree_installer/node_modules/.bin/vite.EXE`; delete the locked `vite.exe` and re-run `pnpm install`.

## Coverage gate (Vitest)

- **Run it:** `pnpm run test:coverage` (= `vitest run --coverage`). `pnpm run test:unit` stays coverage-free for speed.
- **Config:** root `vitest.config.ts` → `test.coverage`. Provider `v8` (`@vitest/coverage-v8`, already a root devDep — emits Istanbul-format `coverage-final.json`), reporters `['text','json','html']`, `reportOnFailure: true`, thresholds 80/80/80/80 (statements/branches/functions/lines).
- **Scope:** Vitest 5 measures only files the suite actually exercises unless `coverage.include` is set. Test sources (`*.test.ts`, `*.spec.ts`) and `tests/**` fixtures are excluded, so the gate reports on production code. Widening `include` to all `src/**` would make 80% unreachable.
- **Reports:** `coverage/` (gitignored) — `index.html`, `coverage-final.json`, plus the terminal text summary. `reportOnFailure` keeps them writable when the gate trips.
- **Prove the gate trips:** `pnpm vitest run --coverage --coverage.thresholds.statements=100` (or temporarily set the config thresholds to 100) → per-metric `ERROR: Coverage for … does not meet global threshold` + exit 1.
- **Baselining:** before raising the gate, measure with `pnpm run test:coverage` and read the per-file table; target the lowest-coverage production files first.

## Free-First Policy
- Use only free/open-source tools
- Prefer Playwright (free) over paid testing services
