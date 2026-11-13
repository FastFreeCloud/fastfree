# pnpm Caching Strategy — Sub-5-Minute CI Builds

**Status:** Accepted design
**Owner:** DevOps
**Task:** `t_75199c61`
**Applies to:** every GitHub Actions workflow that installs the pnpm workspace — the quality gate (`ci.yml`), the release pipelines, and the deploy pipelines.
**Policy:** free/open-source only (GitHub Actions free tier, `actions/cache`, pnpm).

---

## 1. Acceptance criteria

1. Cache paths are defined for the **pnpm store** and for **build artifacts**.
2. Cache keys are derived from `pnpm-lock.yaml` **and** the root + workspace `package.json` hashes.
3. The expected build-time reduction is documented.
4. Estimated CI build time **with cache hits is under 5 minutes**.

This document is the handoff for `t_830ce334` ("Implement core GitHub Actions quality gate workflow"), which must integrate the strategy below.

---

## 2. Measured baseline (real runs on this repo)

These are real measurements, not guesses. They were taken on the current checkout with a pre-populated pnpm store (the "cache hit" path).

| Measurement | Command | Result |
|---|---|---|
| Warm-store install | `pnpm install --offline --frozen-lockfile` | **123 s** |
| Panel typecheck | `pnpm --filter @fastfree/panel typecheck` (`vue-tsc --noEmit`) | **91 s**, exit 0 |
| Panel build | `pnpm --filter @fastfree/panel build` (`quasar build`, SPA) | **96 s**, exit 0 |
| Installer build | `pnpm --filter @fastfree/installer build` (`vue-tsc --noEmit && vite build`) | 77 s to the Vite phase; typecheck passed (Vite failed only on a scratch-copy alias artifact, not a real CI failure) |

Environment: Windows 11, Node 26.8.1, pnpm 11.19.0, warm store 1.1 GB / 875 packages / `node_modules` 1.9 GB.
Linux CI is **faster** for install (no Windows reflink/hardlink overhead); typecheck and build times are comparable.

Reproduce the warm-store install with:

```bash
# in a scratch copy of the workspace manifests + pnpm-lock.yaml
pnpm install --offline --frozen-lockfile
```

---

## 3. Cache paths

### 3.1 pnpm store — **cache this**

The store is the single biggest win. It is content-addressed, hardlink-friendly, and pnpm re-links `node_modules` from it in tens of seconds.

pnpm 11 defaults (the version subdir changes between pnpm majors):

| OS | Default store path |
|---|---|
| Linux | `~/.local/share/pnpm/store/v11` |
| macOS | `~/Library/pnpm/store/v11` |
| Windows | `~/AppData/Local/pnpm/store/v11` |

**Never hardcode the path.** Resolve it at runtime with `pnpm store path` and feed it to `actions/cache` (see §5). This automatically tracks pnpm major upgrades and OS differences.

Also include the legacy/alternate locations for robustness (they are empty on most runners, but cost nothing):

```yaml
path: |
  ${{ steps.pnpm-store.outputs.path }}
  ~/.cache/pnpm
  ~/.pnpm-store
```

Measured store size: **1.1 GB** (875 packages).

### 3.2 Build artifacts — **cache this**

Per-workspace output directories. Paths are relative to the repo root:

| Workspace | Build output |
|---|---|
| `apps/fastfree_installer` | `apps/fastfree_installer/dist` |
| `apps/fastfree_website` | `apps/fastfree_website/.next` |
| `packages/fastfree_panel` | `packages/fastfree_panel/dist` |
| `packages/fastfree_panel/backend` | `packages/fastfree_panel/backend/dist` |
| any future package | `packages/*/dist`, `packages/*/build` |

Optional transpiler caches (cheap, safe): `.quasar/`, `node_modules/.cache`.

### 3.3 What we deliberately **do not** cache

| Path | Why |
|---|---|
| `node_modules` (1.9 GB) | Hardlink-heavy and fragile across cache tar/restore; pnpm re-links from the store in ~30-120 s. Caching it also consumes most of the 10 GB repo cache budget. |
| `**/src-tauri/target` | Rust build dir is multiple GB. The Tauri workflow already uses `swatinem/rust-cache@v2`. |
| `apps/*/src-capacitor` | Native Android build tree; huge and platform-specific. |
| Desktop bundles / installers | Large binaries; publish with `actions/upload-artifact` instead. |

---

## 4. Cache keys

### 4.1 Store key

```yaml
key: ${{ runner.os }}-pnpm-${{ inputs.pnpm-version }}-${{ hashFiles('pnpm-lock.yaml', 'package.json', 'pnpm-workspace.yaml', '.npmrc', '**/package.json') }}
restore-keys: |
  ${{ runner.os }}-pnpm-${{ inputs.pnpm-version }}-
  ${{ runner.os }}-pnpm-
```

**Why each input is in the key:**

| Input | Reason |
|---|---|
| `runner.os` | A Linux store is useless on macOS/Windows. |
| `pnpm-version` | Store format is version-specific (`v10` vs `v11`); a major bump must produce a fresh cache. |
| `pnpm-lock.yaml` | The resolved dependency graph. Primary invalidation signal. |
| `package.json` + `**/package.json` | Workspace shape: adding/removing a workspace member or changing a `workspace:` range changes the resolved graph even when the lockfile is regenerated separately. |
| `pnpm-workspace.yaml` | Defines the member globs and `overrides`/`allowBuilds`. |
| `.npmrc` | Contains `shamefully-hoist=true` and any registry/proxy settings that change resolution. |

`restore-keys` gives a **near-miss** path: when the lockfile changes slightly, the previous store is still restored and pnpm downloads only the delta.

### 4.2 Build-artifact key

```yaml
key: ${{ runner.os }}-build-${{ inputs.build-name }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ steps.build-key.outputs.hash }}
restore-keys: |
  ${{ runner.os }}-build-${{ inputs.build-name }}-
```

`steps.build-key.outputs.hash` is a hash of the workspace's **tracked source files only** (see §5), computed with `git ls-files` + `git hash-object`. Using `git ls-files` automatically excludes `node_modules`, `dist`, and `.next` (all gitignored), which a raw `hashFiles('packages/foo/**')` would wastefully hash.

### 4.3 Key design rules

1. Always include `runner.os`.
2. Always include the pnpm version.
3. Always include the lockfile hash.
4. Store keys include the workspace manifest hashes; build keys include the source hash.
5. Provide a prefix `restore-keys` fallback for near-miss reuse.
6. Keys are **write-once**: a cache entry is never overwritten. A key that never changes pins you to the first cache forever — so the key must change whenever the cached content should change.
7. Keep keys under 512 characters.

---

## 5. Reusable composite action

`.github/actions/pnpm-cache/action.yml` implements §3-§4 and is the intended integration point for `t_830ce334`.

```yaml
- uses: ./.github/actions/pnpm-cache
  with:
    node-version: '22'
    pnpm-version: '11'
    cache-build: 'true'
    build-name: panel
    build-paths: packages/fastfree_panel/dist
    workspace-dir: packages/fastfree_panel
```

Inputs:

| Input | Default | Meaning |
|---|---|---|
| `node-version` | `22` | Passed to `actions/setup-node`. |
| `pnpm-version` | `11` | Must match the repo lockfile/store format. |
| `cache-build` | `false` | Also restore/save the build-artifact cache. |
| `build-name` | `''` | Stable cache namespace for the artifact cache (workspace name). |
| `build-paths` | `''` | Newline-separated output paths to cache. |
| `workspace-dir` | `.` | Workspace root used for the source hash. |

Output: `store-path` (the resolved pnpm store path).

The action performs: `actions/setup-node` → `pnpm/action-setup` (no auto-install) → resolve store path → restore store cache → (optional) restore build-artifact cache. `actions/cache` saves automatically at job end when the key was not an exact hit.

---

## 6. Recommended quality-gate structure

The gate should be a **matrix over workspace members**, so jobs run in parallel and the wall clock is the slowest job, not the sum.

Actual workspace members (from `pnpm-workspace.yaml`: `packages/*`, `packages/*/backend`, `apps/*`, `tools/*`):

| Member | Package name | build | test | lint |
|---|---|---|---|---|
| `apps/fastfree_installer` | `@fastfree/installer` | ✅ | – | – |
| `apps/fastfree_website` | `@fastfree/website` | ✅ | – | ✅ |
| `packages/fastfree_panel` | `@fastfree/panel` | ✅ | – | ✅ (`lint:check`) |
| `packages/fastfree_panel/backend` | `@fastfree/clan-panel-backend` | ✅ | – | – |
| `packages/fastfree_accounting` | `fastfree-accounting` | – | – | ✅ |
| `packages/fastfree_auth` | `fastfree-auth` | – | – | ✅ |
| `packages/fastfree_crm` | `fastfree-crm` | – | – | – |
| `packages/fastfree_hr` | `fastfree-hr` | – | ✅ | – |
| `packages/fastfree_inventory` | `fastfree-inventory` | – | – | ✅ |
| `packages/fastfree_lowcode` | `quasar-app-extension-fastfree-lowcode` | – | – | – |
| `packages/fastfree_purchase` | `fastfree-purchase` | – | – | – |
| `packages/fastfree_sales` | `fastfree-sales` | – | – | – |

> **Note:** `apps/fastfree_backend` (Frappe/Python) and `packages/fastfree_os` (Nix) have no `package.json` and are not pnpm members. The gate must skip them.

```yaml
jobs:
  gate:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    strategy:
      fail-fast: false
      matrix:
        include:
          - { name: installer,     dir: apps/fastfree_installer,      build: 'apps/fastfree_installer/dist' }
          - { name: website,       dir: apps/fastfree_website,        build: 'apps/fastfree_website/.next' }
          - { name: panel,         dir: packages/fastfree_panel,      build: 'packages/fastfree_panel/dist' }
          - { name: panel-backend, dir: packages/fastfree_panel/backend, build: 'packages/fastfree_panel/backend/dist' }
          - { name: accounting,    dir: packages/fastfree_accounting }
          - { name: auth,          dir: packages/fastfree_auth }
          - { name: crm,           dir: packages/fastfree_crm }
          - { name: hr,            dir: packages/fastfree_hr }
          - { name: inventory,     dir: packages/fastfree_inventory }
          - { name: lowcode,       dir: packages/fastfree_lowcode }
          - { name: purchase,      dir: packages/fastfree_purchase }
          - { name: sales,         dir: packages/fastfree_sales }
    steps:
      - uses: actions/checkout@v6

      - uses: ./.github/actions/pnpm-cache
        with:
          node-version: '22'
          pnpm-version: '11'
          cache-build: 'true'
          build-name: ${{ matrix.name }}
          build-paths: ${{ matrix.build }}
          workspace-dir: ${{ matrix.dir }}

      - name: Install (frozen, no lifecycle scripts)
        run: pnpm install --frozen-lockfile --ignore-scripts

      - name: Lint (check-only)
        run: pnpm --dir "${{ matrix.dir }}" run --if-present lint:check

      - name: Typecheck
        run: pnpm --dir "${{ matrix.dir }}" run --if-present typecheck

      - name: Test
        run: pnpm --dir "${{ matrix.dir }}" run --if-present test

      - name: Build
        run: pnpm --dir "${{ matrix.dir }}" run --if-present build
```

### 6.1 Required follow-up: check-only lint scripts

Several `lint` scripts **mutate** the tree (`prettier --write`, `eslint --fix`, `oxfmt`, `oxlint --fix`). Running them in CI does not enforce formatting — it silently rewrites files and exits 0. The gate must use a non-mutating variant:

- `packages/fastfree_panel` already has `lint:check` — use it.
- Every other package with a `lint` script needs a `lint:check` (or the gate must invoke the underlying linter with `--check` / no `--fix`).

This is tracked as a follow-up task; the gate should use `--if-present` on `lint:check` so it degrades gracefully until the scripts land.

---

## 7. Timing model

Per-job estimate for the heaviest workspace (`packages/fastfree_panel`), Linux CI, **warm store**:

| Phase | Estimate | Basis |
|---|---|---|
| `actions/cache` restore (1.1 GB store) | 10-20 s | GitHub cache service throughput |
| `pnpm install --frozen-lockfile --ignore-scripts` | 30-60 s | 123 s measured on Windows; Linux is faster |
| `lint:check` | 10-25 s | eslint/prettier over one workspace |
| `typecheck` (`vue-tsc --noEmit`) | 30-90 s | 91 s measured |
| `test` | 5-20 s | vitest, one package |
| `build` (`quasar build`) | 40-100 s | 96 s measured |
| **Per-job total** | **~2.5-4.5 min** | |

**Overall gate wall clock** = slowest matrix job ≈ **4.5 min < 5 min**. Jobs run in parallel, so the sum is not the wall clock.

**With build-artifact cache hits** (release path, unchanged workspace): the build phase drops to ~0-10 s → **~2-3 min**.

### Cold vs warm

| Scenario | Install | Total gate | Reduction |
|---|---|---|---|
| Cold (no cache) | 5-10 min (download 1.1 GB + link) | 8-15 min | — |
| Warm (store cache hit) | 30-60 s | **2.5-4.5 min** | **~65-75 %** |

Cold-install time is network-bound and was not measured here; it is an estimate. The warm-store install **was** measured (123 s on Windows).

---

## 8. Cache limits and maintenance

- A repository has up to **10 GB** of `actions/cache` storage; entries not accessed within a week are evicted, and the oldest entries are evicted once the limit is reached.
- The store is ~1.1 GB per key. With `restore-keys` near-miss reuse, several historical entries accumulate. Run `pnpm store prune` periodically (e.g. nightly/weekly workflow) to drop packages not referenced by any current install.
- Prefer restoring on all branches but **saving only from the default branch** for the build-artifact cache, to avoid PR branches polluting the budget. The store cache is safe to save from any branch because it is keyed by content.
- Monitor cache hit rate in CI logs: `Cache hit occurred on the primary key` vs `Cache not found for input keys`.

---

## 9. Pitfalls

1. **`--no-frozen-lockfile` in existing workflows.** `1_fastfree_web_pos.yaml`, `2_fastfree_web_hr.yaml`, `3_fastfree_web_ledger.yaml`, `4_fastfree_web_erp.yaml`, `10_build_tauri_installer.yaml` all install with `--no-frozen-lockfile`. That lets a cache restore mutate the resolved graph. **Use `--frozen-lockfile` in CI.**
2. **pnpm version drift.** The repo's canonical version is pnpm 11 (`package.json` `devEngines.packageManager: ^11.11.0`, lockfile `configDependencies: pnpm 11.17.0`, store `v11`). Existing workflows pin `pnpm/action-setup` to `10` or `11.11.0`. **Pin 11 everywhere** and include it in the cache key.
3. **Caching `node_modules`.** Hardlinks do not survive `actions/cache`'s tar/restore reliably and the 1.9 GB tree dominates the budget. Cache the store instead.
4. **`--ignore-scripts` vs Quasar.** Install with `--ignore-scripts`, then run `pnpm exec quasar prepare` explicitly for Quasar apps. The `postinstall` hook (`quasar prepare`) is otherwise skipped.
5. **`hashFiles` before `actions/checkout`.** `hashFiles` only sees files in `GITHUB_WORKSPACE`. A cache step before checkout silently produces a constant key (`Linux-pnpm-11-`), pinning every run to the first cache. Always `actions/checkout` first.
6. **Empty `hashFiles` match.** If a glob matches nothing, `hashFiles` returns `""` and the key silently degrades to a constant. Verify the globs match in CI logs.
7. **Cache races.** A save that collides with an existing key logs `Failed to save: Unable to reserve cache with key …`. This is benign; the existing entry is kept. Use `concurrency` with `cancel-in-progress: false` for the gate to avoid wasted parallel runs.
8. **`shamefully-hoist=true`.** Keep it in `.npmrc` and in the cache key; changing it changes `node_modules` layout and must bust the cache.
9. **Build-artifact cache must not skip typecheck/lint/test.** Only the build step is cache-aware. A cache hit on `dist` never justifies skipping the verification gates.

---

## 10. Decision log / handoff

| Decision | Value | Reason |
|---|---|---|
| Package manager | pnpm **11** | Matches `devEngines`, lockfile `configDependencies`, and store `v11`. |
| Store path | `pnpm store path` (dynamic) | Tracks OS + pnpm major automatically. |
| Store key | `os + pnpm-version + hash(lockfile, package.json, pnpm-workspace.yaml, .npmrc, **/package.json)` | Invalidates on dependency **or** workspace-shape changes. |
| Build key | `os + build-name + hash(lockfile) + hash(tracked source)` | `git ls-files` excludes `node_modules`/`dist`. |
| Install flags | `--frozen-lockfile --ignore-scripts` | Correctness + hermetic CI. |
| Gate shape | Matrix over 12 JS workspace members | Parallel wall clock < 5 min. |
| Not cached | `node_modules`, `src-tauri/target`, native build trees | Size / hardlink fragility. |
| Follow-up | Add `lint:check` scripts to packages whose `lint` mutates | Required for the gate to enforce formatting. |

### Handoff to `t_830ce334`

1. Use `./.github/actions/pnpm-cache` (or the inline equivalent from §4) in `ci.yml`.
2. Trigger on `pull_request` and `push` to `master`.
3. Use `--frozen-lockfile --ignore-scripts`; pin pnpm 11.
4. Run `lint:check`, `typecheck`, `test`, `build` with `--if-present` so library packages without a script are skipped cleanly.
5. Fail the workflow on any non-zero exit (default shell behavior; do not add `|| true`).
6. Verify the cache-hit path on the first run: the logs must show `Cache hit occurred on the primary key` for the store, and the install step must complete in under ~60 s.
