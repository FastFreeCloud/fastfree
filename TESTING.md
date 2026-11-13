# Testing — Unit (Vitest)

FastFree ERP is a pnpm workspace (`pnpm-workspace.yaml`): core apps in `apps/*`,
modular packages in `packages/*`. Unit tests run through a single root Vitest
config that fans out into one **project per workspace package**.

## Commands

```bash
pnpm install            # links vitest from the root devDependencies
pnpm run test:unit      # run every unit test in the workspace once
pnpm run test:watch     # watch mode
pnpm run test:coverage  # run the suite and enforce the 80% coverage gate
pnpm vitest run --project fastfree-accounting   # one project only
pnpm --filter fastfree-hr test                  # a single package's own script
```

`pnpm test` is wired separately (unit + E2E + coverage) by the CI task.

## How it works

- `vitest.config.ts` (root) declares `test.projects: ['packages/*',
  'packages/*/backend', 'apps/*']`. Each glob match becomes a project whose
  root is that directory; a package with its own `vitest.config.ts` (e.g.
  `packages/fastfree_hr`) keeps it and inherits the root options.
- `resolve.alias` maps every workspace package name to its `src/` entry and
  subpaths (`fastfree-auth/types` → `packages/fastfree_auth/src/types`), mirroring
  the `paths` map in `tsconfig.json`. Tests can import workspace packages by
  name without a build step or a linked `dist/`.
- `test.environment` defaults to `node` (services/stores are plain TS). A
  package that mounts Vue components can set `environment: 'jsdom'` (or
  `happy-dom`) in its own `vitest.config.ts`; install the environment package
  in that package first.
- `vitest.setup.ts` runs per test file (currently pins `TZ=UTC` and restores
  spies). Keep it dependency-free.
- `test.passWithNoTests: true` means a package with no tests yet does not fail
  the workspace run.

## Coverage

`pnpm run test:coverage` runs the whole suite under `@vitest/coverage-v8` and
enforces the project's quality gate.

- **Provider:** V8 (Istanbul-compatible), via `@vitest/coverage-v8` — a root
  devDependency, so no extra install step.
- **Reporters:** `text` (terminal summary), `json` (`coverage/coverage-final.json`,
  for machine consumption), and `html` (`coverage/index.html`, for browsing).
- **Thresholds:** 80% for statements, branches, functions, and lines. If any
  metric falls short, Vitest prints `ERROR: Coverage for <metric> (…%) does not
  meet global threshold (80%)` and exits non-zero — the build fails.
- **Scope:** by default Vitest measures only files the suite actually exercises
  (its documented default). Test sources (`**/*.test.ts`, `**/*.spec.ts`) and the
  shared fixtures library (`tests/**`) are excluded, so the gate reports on
  production code rather than test infrastructure.
- **Artifacts on failure:** `reportOnFailure: true` keeps the HTML/JSON reports
  writable even when the gate trips, so a red build still leaves evidence.

```bash
pnpm run test:coverage          # gate at 80%
pnpm vitest run --coverage --coverage.thresholds.statements=100   # prove the gate trips
```

The HTML report is not committed (`coverage/` is gitignored); generate it locally
with the command above.

## Adding a test

Drop a `*.test.ts` / `*.spec.ts` file anywhere under a workspace package
(convention: `<package>/tests/`). It is picked up automatically — no config
change needed. Import the code under test with a relative path, or import
another workspace package by name to exercise the aliases.

```ts
import { describe, it, expect, vi } from 'vitest'
import { calculateTax } from '../src/services/tax.service'

vi.mock('fastfree-auth', () => ({ getDocList: vi.fn() }))

describe('calculateTax', () => {
  it('rounds to 2 decimals', () => {
    expect(calculateTax(33.33, 7.5)).toBe(2.5)
  })
})
```

## Adding a new workspace package

1. Add it under `packages/` (or `apps/`) with a `package.json`.
2. If it exposes a `src/index.ts`, add its name to `modularPackages` in
   `vitest.config.ts` so the alias exists.
3. Add a `tests/` file. The root run discovers it immediately.

## Test data fixtures & factories

Reusable test data lives in `tests/fixtures/` at the repo root and is shared by
Vitest unit tests and Cypress E2E/component specs (one source of truth, no
runtime dependencies):

```ts
import { accounting, buildList, resetFactories } from '../../../tests/fixtures/index'

const entries = buildList(accounting.journalEntry, 3)
```

- Domain factories are namespaced (`accounting`, `crm`, `hr`, `inventory`,
  `purchase`, `sales`, `auth`) because some entity names repeat across modules.
- Every factory returns a fully-populated, internally consistent record
  (journals balance, document totals equal the sum of their lines); override
  only the fields a test cares about.
- Deliberate invalid states (unbalanced journal, expired licence, negative
  stock, overdue invoice) live in `scenarios.ts`, not in the base factories.
- `apiSuccess` / `apiFailure` / `paginated` build the shared API envelopes.
- See `tests/fixtures/README.md` for the full catalogue.

## Conventions

- TypeScript strict mode (root `tsconfig.json`); Vitest transforms TS via
  Vite/esbuild, so no `tsc` pass is needed to run tests.
- ESM (`"type": "module"` in packages); import from `vitest` explicitly
  (`globals` is off).
- Free/open-source only. Coverage is `@vitest/coverage-v8` (V8 provider) with an
  80% gate — see [Coverage](#coverage). Cypress E2E is configured by the E2E task.
