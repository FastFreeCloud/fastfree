import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * FastFree ERP — root Vitest configuration.
 *
 * The monorepo is a pnpm workspace (`pnpm-workspace.yaml`) with core apps in
 * `apps/*` and modular packages in `packages/*`. This config is the single
 * entry point: it fans out into one Vitest *project* per workspace package
 * (`test.projects`), so `pnpm vitest run` from the repo root discovers and runs
 * every unit test in the workspace.
 *
 * Per AGENTS.md the codebase is TypeScript strict + ESM, so every project is
 * transformed by Vite/esbuild (no `tsc` required at test time) and workspace
 * packages resolve to their `src/` entry via the aliases below — mirroring the
 * `paths` map in the root `tsconfig.json`.
 */

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url))

// apps/fastfree_installer reuses its Vite config as its Vitest project config,
// and that file uses `__dirname`. Silence Vite's native-config deprecation
// notice during test runs (must be set before project configs are loaded).
process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING ??= 'true'

/** Modular packages that expose a `src/index.ts` entry point. */
const modularPackages = [
  'fastfree_accounting',
  'fastfree_auth',
  'fastfree_crm',
  'fastfree_hr',
  'fastfree_inventory',
  'fastfree_purchase',
  'fastfree_sales',
] as const

type Alias = { find: RegExp; replacement: string }

const workspaceAliases: Alias[] = []

for (const pkg of modularPackages) {
  const name = pkg.replace(/_/g, '-')
  const srcDir = here(`./packages/${pkg}/src`)
  // Bare import: `fastfree-auth`
  workspaceAliases.push({ find: new RegExp(`^${name}$`), replacement: `${srcDir}/index.ts` })
  // Subpath import: `fastfree-accounting/services` -> `src/services`
  workspaceAliases.push({ find: new RegExp(`^${name}/(.*)$`), replacement: `${srcDir}/$1` })
}

// Lowcode runtime — keep parity with the root tsconfig `paths` aliases.
const lowcodeRuntimeDir = here('./packages/fastfree_lowcode/src/runtime')
for (const name of [
  '@fastfree/lowcode',
  'fastfree-lowcode',
  'quasar-app-extension-fastfree-lowcode',
]) {
  workspaceAliases.push({ find: new RegExp(`^${name}$`), replacement: `${lowcodeRuntimeDir}/index.ts` })
  workspaceAliases.push({ find: new RegExp(`^${name}/(.*)$`), replacement: `${lowcodeRuntimeDir}/$1` })
}

// `@fastfree/panel` is the Quasar SPA; point at its source root so tests can
// import panel modules without a build step.
workspaceAliases.push({
  find: /^@fastfree\/panel$/,
  replacement: here('./packages/fastfree_panel/src/index.ts'),
})

// SDUI shared contract (`packages/fastfree_sdui`) — bare import resolves to the
// contract entry, mirroring the exports map in its package.json; subpaths
// (`fastfree-sdui/contract/types`) resolve to package-root-relative files.
const sduiPkgDir = here('./packages/fastfree_sdui')
workspaceAliases.push({ find: /^fastfree-sdui$/, replacement: `${sduiPkgDir}/contract/index.ts` })
workspaceAliases.push({ find: /^fastfree-sdui\/(.*)$/, replacement: `${sduiPkgDir}/$1` })

export default defineConfig({
  resolve: {
    alias: workspaceAliases,
  },
  test: {
    // One project per workspace package. Glob entries are resolved with
    // tinyglobby; a package with its own `vitest.config.ts` keeps it and
    // inherits these options (`extends` defaults to true).
    projects: ['packages/*', 'packages/*/backend', 'apps/*'],
    // Most packages have no tests yet — a project with zero test files must
    // not fail the whole run.
    passWithNoTests: true,
    // Services/stores are plain TS and run fine in Node. Packages that mount
    // Vue components can opt into jsdom/happy-dom in their own config.
    environment: 'node',
    globals: false,
    // Deterministic dates across machines. (The Vite native-config warning is
    // silenced at the top of this file, before project configs are loaded.)
    env: {
      TZ: 'UTC',
    },
    setupFiles: [here('./vitest.setup.ts')],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.quasar/**',
      '**/coverage/**',
      '**/playground/**',
    ],
    coverage: {
      // V8 provider (Istanbul-compatible) — already a root devDependency.
      provider: 'v8',
      // Text for the terminal, JSON for machine consumption, HTML for humans.
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      // Keep the report artifact even when the threshold gate fails, so a red
      // build still produces something to inspect.
      reportOnFailure: true,
      // By default only files exercised by the test suite are measured (Vitest's
      // documented default). Test sources and the shared fixtures library are
      // infrastructure, not production code, so they are excluded.
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/tests/**',
      ],
      // The 80% quality gate. `vitest run --coverage` exits non-zero when any
      // metric falls below its threshold, so the build fails instead of the
      // report being silently green.
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
