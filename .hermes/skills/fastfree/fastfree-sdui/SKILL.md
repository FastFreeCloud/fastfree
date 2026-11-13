---
name: fastfree-sdui
description: "Use when advancing the FastFree SDUI platform."
version: 1.0.0
author: FastFree (fastfree), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [fastfree, sdui, server-driven-ui, opencode, board, quasar, tauri]
    related_skills: [fastfree-board, fastfree-development, fastfree-frontend]
---

# FastFree SDUI — Server-Driven UI platform

Building a stac.dev-like platform for FastFree: Vue 3 + Quasar + Tauri apps render screens delivered as JSON from a FastFree server, updatable without rebuilds. Self-hosted, MIT, Arabic-first RTL.

## When to Use

- Any task on `packages/fastfree_sdui/` or the SDUI runtime in `packages/fastfree_lowcode/src/runtime/sdui/`
- Advancing the SDUI roadmap (contract → delivery server → client loader → console/CLI → push)
- Executing `SDUI-*` tasks on the OpenCode board

## Read first

- `docs/sdui/PLAN.md` — full roadmap (P0→P4), architecture, API, phases, current status.
- `docs/sdui/MISSION.md` — the mission brief every board agent reads.
- `packages/fastfree_lowcode/src/runtime/sdui/types.ts` — the existing `SduiScreen`/`SduiNode` contract.

## Execution via the board

The user's standing requirement: execute SDUI work through **OpenCode fastfree_board**, not headless. Load `fastfree-board` and drive it there:

- Put each deliverable on the board as a card (`SDUI-NN`); description = mission + deliverable + acceptance criteria.
- `board_start` from a session whose model has quota — OpenCode never fails over on 429.
- The board's auto-lifecycle advances cards: backlog → ready → progress → review → done.

## Contract package

`packages/fastfree_sdui/contract/` holds the canonical types + Zod schema + widget catalog, shared by server and client. `packages/fastfree_lowcode` re-exports it type-only for compatibility.

**Pitfall:** new packages under `packages/*` are Vitest projects in the root config — run their tests with `npx vitest run --project <package-name>`, not `node --test`. Node type-stripping needs explicit `.ts` extensions; Vitest resolves extensionless imports. A `node --test` failure on extensionless imports is a runner mismatch, not a code bug.

## Rules that hold for every SDUI task

1. **Never break `SduiNode`** (`type/props/children/events/model`) — extend via `meta` and new layers only; the existing screens must keep passing.
2. **Security first**: server-driven JSON is executable — action allowlist, HMAC-signed screens, closed component registry, no `v-html`/`eval` of server content.
3. **Arabic-first + RTL**: new text is `{ar,en}`; use logical CSS properties.
4. **Free/open only**: Bun/Hono/SQLite/Zod/Vue/Quasar/Dexie.
5. **Verify before claiming done**: run the real tests and report the output.
6. **No `npm publish`** for the board plugin.

## Pitfalls

- The SDUI runtime has no automated tests of its own; the contract tests are the gate.
- `SduiCacheManager.getOrFetch(id, fetcher)` is the only delivery seam — remote loading plugs in there, don't fork the cache.
- Expressions use `new Function` + `with(state)`; treat server payloads as trusted-only until the sandbox lands.
- Board writes need OpenCode Desktop open and connected; `opencode run` sessions are not board-linked unless created via `board_start`.
