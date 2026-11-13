# Cypress tests — FastFree Clan Panel

Cypress is configured for both **E2E** (full app through a browser) and
**component** (single Vue component in isolation) testing.

- E2E specs: `test/cypress/e2e/**/*.cy.ts`
- Component specs: `test/cypress/component/**/*.cy.ts`
- Support: `test/cypress/support/`
- Fixtures + factories: `test/cypress/fixtures/`
- E2E static server: `test/cypress/scripts/serve-app.mjs`

## Running E2E

The E2E specs expect the SPA on `http://localhost:9000`. Two ways to provide
it:

```bash
# 1. Development server (hot reload, proxies /api + /mcp to the backend)
pnpm dev                          # terminal 1
pnpm backend:dev                  # terminal 2 (private API on :9099)
pnpm test:e2e                     # terminal 3

# 2. Production build served by the E2E static server (no dev server needed)
pnpm test:e2e:build               # builds dist/spa
pnpm backend:dev                  # terminal 1 (private API on :9099)
pnpm test:e2e:serve               # terminal 2 (serves dist/spa + proxies /api + /mcp)
pnpm test:e2e                     # terminal 3
```

`test:e2e:serve` uses only Node built-ins (`node:test/cypress/scripts/serve-app.mjs`),
serves `dist/spa` with SPA history fallback and proxies `/api/*` + `/mcp/*` to
the backend. Override the bind/backend addresses with `E2E_HOST`, `E2E_PORT`,
`E2E_API_HOST`, `E2E_API_PORT`.

Interactive mode (debug in a real browser):

```bash
pnpm test:e2e:open
```

## Running component tests

```bash
pnpm test:component          # headless
pnpm test:component:open     # interactive
```

Component specs are bundled by Cypress's Vite dev server. The Vite config lives
inline in `cypress.config.ts` (`component.devServer.viteConfig`) and mirrors the
Quasar app's `#lc` alias.

## Adding a new E2E spec

1. Create `test/cypress/e2e/<feature>.cy.ts`.
2. Use the shared support commands (no need to re-import anything):
   - `cy.visitApp(path?)` — visit a route on the app.
   - `cy.apiRequest(method, path, body?)` — call `/api/v1/<path>` (never fails
     on non-2xx; assert on the response).
   - `cy.backendHealth()` — assert the liveness endpoint.
3. Keep the pattern used by the existing specs: one `describe` per feature,
   stable CSS-class selectors (`.lc-*`, `.window-panel`, `.clan-*-screen`),
   and explicit assertions on the backend error envelope for failure cases.

Example:

```ts
/// <reference types="cypress" />

describe('My feature', () => {
  beforeEach(() => cy.visitApp('/'));

  it('does the thing', () => {
    cy.apiRequest('GET', '/health').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data.status).to.eq('ok');
    });
  });
});
```

## Adding a new component spec

1. Create `test/cypress/component/<Component>.cy.ts`.
2. Import the `.vue` component and mount it with `cy.mount`.
3. Quasar-based components must be registered through the Quasar plugin, which
   also provides the `$q` global they rely on:

```ts
import { Quasar, QBtn, QIcon } from 'quasar';
import EmptyState from '../../../../fastfree_lowcode/src/runtime/components/EmptyState.vue';

const quasarWithComponents = [Quasar, { components: { QIcon, QBtn } }] as const;

cy.mount(EmptyState, {
  props: { title: 'Empty' },
  global: { plugins: [quasarWithComponents] },
});
```

## Fixtures and factories

- `fixtures/*.json` — static snapshots loaded with `cy.fixture('machines.json')`.
- `fixtures/factories.ts` — browser-safe re-export of the shared library in
  `tests/fixtures/` at the monorepo root, so Vitest unit tests and Cypress
  specs generate identical data.
- Domain factories are namespaced (`accounting`, `crm`, `hr`, `inventory`,
  `purchase`, `sales`, `auth`); composed scenarios and edge cases
  (`unbalancedJournalEntry`, `expiredLicense`, ...) are exported directly.
- The MCP/API error assertions in `api-contract.cy.ts` and the smoke checks in
  `test-data-factories.cy.ts` are driven by these factories.

## Requirements / notes

- **Cypress 16+** is required. Cypress 14 hangs on Node 26 (the repo's engine);
  16.3.0 ships Electron 43 and explicitly supports Node 26.
- The E2E specs that exercise `/api` or `/mcp` need the private backend running
  on `127.0.0.1:9099` (or `CLAN_PANEL_API_PORT`).
- From the monorepo root, run everything through the workspace filter:
  `pnpm --filter @fastfree/panel test:e2e`.
- The root `pnpm test` wiring (unit + E2E + coverage) belongs to the sibling
  task `t_23a7e729`; it should call `pnpm --filter @fastfree/panel test:e2e`
  after the app and backend are up.
