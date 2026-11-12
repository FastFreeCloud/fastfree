# Upstream provenance and merge path — fastfree_board

This directory is a fork of the original **opencode-board** plugin, embedded as plain
content in the FastFree monorepo (`plugins/fastfree_board`).

## Provenance

- Upstream repository: https://github.com/dbpolito/opencode-board
- Cloned at upstream commit: `95bb1a5` ("Release v0.2.4 fixing menu listener cleanup compatibility with Node 24")
- Our fork baseline: v0.3.0 (was 0.2.4 at fork time), branch `master`
- License: MIT (unchanged) — see `LICENSE`; original author credit kept in file headers (shells out to `dbpolito`).

## Why it lives here (not as a submodule / nested repo)

The FastFree repo is a single-git monorepo with a GitHub remote; a plain-content
embed keeps history and CI uniform, at the cost of losing the nested clone. All
FastFree changes live in files here and are diffable with `git diff`.

## What changed vs upstream (non-exhaustive)

- `plugins/fastfree_board` (this dir) is the whole plugin, renamed: `package.json`
  name `opencode-board` -> `fastfree_board`, bumped to 0.3.0.
- **Internal plugin id** renamed: server `id: "opencode-board"` -> `"fastfree_board"`,
  RPC id `opencode-board.bridge` -> `fastfree_board.bridge` (and the globalThis
  Symbol keys). This is deliberately **not** storage-compatible on the plugin-id
  axis: the saved board (storage key `kanban-v2`) IS preserved, but the panel tab
  id / menu item etc. re-register under the new id.
- New module `src/gui/hindsight.ts`: optional Hindsight (hindsight.vectorize.io)
  integration via the host `fetch` API. Recall a markdown block on create (UI + agent),
  retain a compact memory per task when it auto-moves progress -> review.
- New module `src/gui/auto-move.ts`: hard rule — a card in `progress` whose linked
  sessions all reached `idle` with outcome `succeeded` moves to `review`.
- `src/gui/i18n.ts`: catalogs `en`/`ar` and built-in `ctx.t`/`ctx.plural` wiring;
  Arabic RTL layout support (`Dir`, logical CSS properties, Arabic font stack,
  RTL hit-tests in column reorder/resizer interactions).
- `taskPrompt()` enriched: opt-in rules via labels — `worktree` (isolated git
  worktree per card), `profile:<name>` (delegate to a Hermes profile),
  `mirror` (sync card status to the Hermes `fastfree-erp` kanban),
  `hindsight`/`memory` (recall before work, retain after).
- Settings page gains an optional Hindsight section (API key + Bank ID) stored in
  plugin storage `hindsight-v1`; the key is never committed or logged.
- UI string coverage: ~150 literals localized to `ar`.

## Re-attaching upstream for a merge

```powershell
cd plugins\fastfree_board
git init
git remote add upstream https://github.com/dbpolito/opencode-board.git
git fetch upstream
git reset --soft upstream/master   # or merge upstream/master into this content and resolve
```

Note: src is `bun run build:server` + `vite build` (`bun run build`). Run
`node --test tests/*.test.mjs` from the repo root here to validate.
