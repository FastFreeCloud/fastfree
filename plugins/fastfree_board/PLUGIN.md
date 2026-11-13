# fastfree_board — Developer Guide

> **Audience:** developers working on the plugin itself (FastFree fork).
> **Not user docs.** See `README.md` for the end-user overview and `docs/` for the
> upstream usage/development/release guides. `UPSTREAM.md` covers fork provenance.
>
> Status markers used below: **verified** (checked in code/tests this session) or
> **unverified** (never exercised live).

---

## 1. What this plugin is

`fastfree_board` is an **OpenCode Desktop plugin** (id `fastfree_board`, version `0.3.0`) that embeds a
Kanban board inside OpenCode Desktop. It is a fork of MIT-licensed
[`opencode-board`](https://github.com/dbpolito/opencode-board) by dbpolito, embedded as plain content in the
FastFree monorepo at `plugins/fastfree_board` (see `UPSTREAM.md`). It is **not published to npm**; OpenCode
Desktop loads it from a local junction (§9).

Defining traits of the FastFree fork:

- **Arabic-first, RTL UI.** First-install locale is Arabic; English is a toggle in Settings.
  Catalogs live in `src/gui/i18n.ts` (`en`/`ar`), resolution in `src/gui/lang.ts`
  (`resolveBoardLang`, default `ar`), and RTL layout support (logical CSS properties,
  mirrored hit-tests for column reorder/resizer) is wired through `src/gui/kanban.css`.
- **Cairo font.** Board styles stack `"Cairo", var(--v2-font-family-sans), "Noto Sans Arabic", ...`
  (`src/gui/kanban.css:51`, plus ~5 other rule sites). Falls back gracefully to sans-serif stacks.
- **Hindsight memory integration** (optional, local-first). See §6.
- **Agent tool surface** for the `board_*` and `hindsight_*` families. See §5.
- Package-level targets: `@opencode/plugin` `2.2.0`, SolidJS, Effect schemas, TypeScript strict, pnpm/bun
  toolchain. The GUI uses OpenCode's **experimental GUI plugin API** (`@opencode/plugin/gui`) and does not
  add a CLI/TUI interface.

The single board (`kanban-v2`) is **global**: shared across projects, sessions, and windows of one Desktop
installation. No durable task data is stored on any OpenCode server.

---

## 2. Build & test

All commands run from the plugin root (`plugins/fastfree_board/`):

```sh
bun install                 # once, fetch deps
bun run build               # vite build (GUI) + bun build --target=node (server/RPC) -> dist/
bun run build:server        # server/RPC bundles only
bun run dev                 # build:server, then vite build --watch (rebuild on change)
bun run typecheck           # tsc --noEmit          (verified: exits 0)
node --test tests/*.test.mjs   # verified: 93 tests, 93 pass
bun run check               # typecheck + build + unit tests (what prepublishOnly runs)
```

Notes:

- `dist/` is the **loadable artifact** Desktop actually loads (`"exports": { ".": "./dist/server.js",
  "./rpc": "./dist/rpc.js", "./gui-experimental": "./dist/gui-experimental.cjs" }` in `package.json`).
  It is git-ignored but packaged (see §10). Do **not** hand-edit it; rebuild instead.
- `dist/server.js` and `dist/rpc.js` are built by `bun build --external @opencode/*`;
  `dist/gui-experimental.cjs` is the vite/solid bundle.
- Running `bun run build` rewrites `dist/`; the unit tests do **not** rebuild (`npm test` does via `bun run build`).
- `tests/plugin.test.mjs` is an integration test: it drives server tool calls through OpenCode's JSON-schema
  RPC validation and JSON serialization into the GUI's setup-owned store (see `docs/development.md`).
  Desktop rendering, real RPC routing, and persistence still need a manual check in OpenCode Desktop.
- `UPSTREAM.md` §"Re-attaching upstream for a merge" documents re-cloning upstream; out of scope here.

---

## 3. Architecture map (file:line)

Line numbers refer to the working tree at the time of writing.

### 3.1 Server part — `src/server.ts` (OpenCode server plugin, runs in the server process)

| What | Lines |
| --- | --- |
| Plugin definition, `id: "fastfree_board"` | `src/server.ts:50-51` |
| `seenMemorySessions` (bounded set, one memory injection per session per process) | `src/server.ts:9-10` |
| `extractUserQuery()` — best-effort extraction of the latest user prompt from raw messages (never throws) | `src/server.ts:13-40` |
| Global singletons shared across location instances: `bridgeQueue()` (Symbol `fastfree_board.bridge.v2`), `toolSettings()` (Symbol `fastfree_board.tool-settings.v1`) | `src/server.ts:42-48` |
| `setup()` | `src/server.ts:52` |
| `ctx.rpc.register(BoardBridge, …)` — registers 5 RPC methods (§3.2) | `src/server.ts:55-80` |
| → `poll` handler (GUI polls for work; optional `toolsEnabled` heartbeat) | `src/server.ts:56-60` |
| → `complete` handler (GUI reports result/error; returns `null`) | `src/server.ts:61-65` |
| → `hindsight_recall` / `hindsight_retain` / `hindsight_reflect` handlers (all delegate to `hindsight-server.ts`) | `src/server.ts:68-79` |
| `ctx.tool.transform(editor => …)` — registers agent tools | `src/server.ts:80-135` |
| → `board_*`: one `editor.add` per operation in `toolSchemas` (9 tools), names `board_${operation}` | `src/server.ts:82-100` |
| → permission gate: all writes go through `ctx.permission.assert` (`board_start_session`/`board_remove`/`board_update`) | `src/server.ts:89-91` |
| → `start_session` origin (sessionID/directory/model inherited from caller) | `src/server.ts:92` |
| → `wait` `timeout_seconds` integer validation (1-3600) | `src/server.ts:93-94` |
| → request hand-off to the bridge queue (15s default; `wait` gets `timeout*1000 + 15s`) | `src/server.ts:96` |
| → `hindsight_recall` tool | `src/server.ts:103-112` |
| → `hindsight_retain` tool (permission-asserted) | `src/server.ts:113-124` |
| → `hindsight_reflect` tool | `src/server.ts:125-134` |
| `ctx.session.hook("context", …)` — injects `FASTFREE_BOARD` instruction into every session's system prompt | `src/server.ts:139-144` |
| → auxiliary-request guard (requests carrying no tools are skipped) | `src/server.ts:140` |
| → `FASTFREE_MEMORY` snapshot: one bounded (512 tokens) Hindsight recall per session, once per process, best effort, **never blocks or fails** | `src/server.ts:145-154` |
| Settings subscribe → `ctx.tool.reload()` on toggle | `src/server.ts:156` |

### 3.2 RPC transport — `src/rpc.ts` (contract shared by server and GUI)

| What | Lines |
| --- | --- |
| `BoardBridge = Rpc.define({...})` | `src/rpc.ts:4` |
| Contract id: **`fastfree_board.bridge`** | `src/rpc.ts:5` |
| Method **`poll`** (input `{clientID, toolsEnabled?}` → delivery `{id, request}` / `{cancel}` / `null`) | `src/rpc.ts:8-26` |
| Method **`complete`** (input `{clientID, id, result?, error?}` → `null`) | `src/rpc.ts:27` |
| Method **`hindsight_recall`** → `{markdown: string\|null}` | `src/rpc.ts:28-31` |
| Method **`hindsight_retain`** → `{detail: string, ok: boolean}` | `src/rpc.ts:32-35` |
| Method **`hindsight_reflect`** → `{text: string}` | `src/rpc.ts:36-39` |

That is the **5-method** contract. The server registers handlers for all five; the GUI client
(`server.client.rpc(BoardBridge)`) calls them.

### 3.3 Request plumbing — `src/bridge-queue.ts` (in-process outbox between server and Desktop)

| What | Lines |
| --- | --- |
| `bridgeQueue(timeout = 15_000)` — **15s default request timeout** | `src/bridge-queue.ts:4` |
| `poll(clientID)` — heartbeat/leader election (5s freshness), **one non-`concurrent` request in flight across windows** (writes must never run twice) | `src/bridge-queue.ts:10-25` |
| `complete(clientID, id, result, error?)` — first window to claim wins; late/duplicate completions ignored | `src/bridge-queue.ts:26-32` |
| `request(req, signal, opts)` — awaits delivery; aborts on caller signal; throws after `timeout` ms ("Desktop did not answer the board request") | `src/bridge-queue.ts:33-62` |
| Delivered-and-timed-out ambiguity: error message says the request *may have been applied*; read the board before retrying | `src/bridge-queue.ts:50` |
| Backpressure cap: ≥100 pending requests rejected | `src/bridge-queue.ts:36` |

### 3.4 Board logic — `src/board-tools.ts` (pure functions, unit-tested)

| What | Lines |
| --- | --- |
| `toolSchemas` (descriptions + JSON schema fragments for the 9 `board_*` tools) | `src/board-tools.ts:5-15` |
| `applyBoardRequest(board, request, server)` — applies an operation to the shared board **synchronously** | `src/board-tools.ts:38` |
| `list` (filter by query/column/label/project_directory) | `src/board-tools.ts:46-57` |
| `create` (first column default; `crypto.randomUUID()`; stamps `updatedAt`) | `src/board-tools.ts:58-62` |
| `update` (`expected_updated_at` conflict guard; `project: null` unassigns and clears links) | `src/board-tools.ts:68-78` |
| `expected_updated_at` mismatch error semantics | `src/board-tools.ts:69` |
| `move` (column/position validation, `moveCard`) | `src/board-tools.ts:79-84` |
| `link_session` (links/unlinks; defaults to calling session/server) | `src/board-tools.ts:85-91` |
| `taskResult()` — task + `links` + computed `position` | `src/board-tools.ts:19-21` |

### 3.5 Server-side Hindsight client — `src/hindsight-server.ts`

| What | Lines |
| --- | --- |
| Defaults: `http://127.0.0.1:9177`, bank `fastfree` | `src/hindsight-server.ts:13-14` |
| Loopback-only guard (`LOOPBACK_HTTP`, overrides validated; never points off-machine) | `src/hindsight-server.ts:15,25-35` |
| Config precedence: validated explicit overrides → `FASTFREE_HINDSIGHT_ENDPOINT` / `FASTFREE_HINDSIGHT_BANK` env → defaults | `src/hindsight-server.ts:25-35` |
| `bankUrl()` — all calls are bank-scoped: `{endpoint}/v1/default/banks/{bank}{path}` | `src/hindsight-server.ts:41-43` |
| `serverRecall()` — best-effort read for the context hook; never throws | `src/hindsight-server.ts:80-88` |
| `toolRecall()` — tool-facing; throws on hard failure | `src/hindsight-server.ts:91-94` |
| `toolRetain()` — persists one item, `update_mode: "append"`, 4kB content cap | `src/hindsight-server.ts:97-114` |
| `toolReflect()` — LLM synthesis over the bank; low budget only | `src/hindsight-server.ts:117-120` |
| `rpcRecall/rpcRetain/rpcReflect()` — GUI bridge helpers; never throw, shaped for the RPC contract | `src/hindsight-server.ts:123-150` |

### 3.6 GUI part — `src/gui/` (SolidJS, experimental GUI API)

| File | Purpose (key lines) |
| --- | --- |
| `src/gui.tsx` | GUI entry; `Plugin.define({ setup })` → `window.tsx` setup |
| `window.tsx` | **Setup-owned shared store wiring.** Stores: board (`globalBoard`, `kanban-v2`), settings (`boardSettings`, `settings-v1`), Hindsight (`hindsightSettings`, `hindsight-local-v2`); registers `SettingsPage`, `Command`s (`kanban`, `layout`), side `Panel`, session-header `Slot`, `ComposerPill` (`src/gui/window.tsx:17-79`). Binds Hindsight RPC transport from connected servers (`:26-29`), registers commands at `:49-57`, panel at `:60-66`, header slot at `:74-77`, pill at `:78` |
| `board-bridge.ts` | **Claims `BoardBridge` requests from connected servers**; polls every 500ms per server; applies board ops to the shared store; `start_session` and `wait` special-cased; agent-create appends recalled Hindsight section best-effort (`:50-65`); agent-driven `move`→`review`/`done` triggers `retain()` (`:67-71`) (`src/gui/board-bridge.ts:11-102`) |
| `kanban-model.ts` | **Columns.** Seed columns: Backlog, Ready, In progress, Review, Done + `hindsight` (`:3-10`); default titles/localization keys (`:26-33`); `BoardSchema`/`CardSchema`; `moveCard`; `taskPrompt()` — including `PROFILE:` instructions emitted for tasks labelled `profile:*` (`:138`) |
| `kanban.tsx` | Board UI: filters, editors, **drag-and-drop** interactions (no Hindsight retain call anywhere here — see §8). ~36 kB / largest GUI file |
| `kanban-storage.ts` | Global board store `kanban-v2` (migrated from `plugin.opencode-desktop-showcase.kanban-v2`) (`src/gui/kanban-storage.ts:4-10`) |
| `kanban.css` | Scoped styles, OpenCode theme tokens, Cairo font stack + RTL support |
| `settings.tsx` | **Settings → Board page.** `SettingsSchema` `{toolsEnabled, locale?, columnsSeeded?, autoStart?, autoReview?, autoPromote?, maxConcurrent?, autoModel?}`, store `settings-v1`, first-install default **Arabic** (`initial: { toolsEnabled: true, locale: "ar" }`, `:15-17`); language toggle Ar/En; layout modes; agent-tools switch; automatic lifecycle toggles; Hindsight section |
| `hindsight.ts` | **GUI-side Hindsight client.** Store `hindsight-local-v2`, default `{enabled: true, bank: "fastfree", endpoint: "http://127.0.0.1:9177"}` (`:48-54`); RPC transport via `bindHindsightTransport` (`:22-25`); `recall()` / `recallSection` / `retain()` (`:73-166`); 25s recall timeout (`:57`); falls back to a direct `fetch` only when no transport is bound (normally fails — see §6) |
| `auto-move.ts` | **Hard rule:** a card in `progress` whose linked sessions all reached `idle` + `succeeded` moves to `review` automatically; retained memory per card is best-effort (`src/gui/auto-move.ts:7-13`, `:14-57`; retain call at `:55`) |
| `auto-lifecycle.ts` | **Full autonomous lifecycle.** Drives `backlog → ready → progress → review → done` end-to-end: promotes from backlog when there is room, starts work sessions for `ready` cards and moves them to `progress`, starts review sessions for `review` cards (`:46-87`) |
| `new-task-dialog.tsx` | **New task / New task from session** dialog. GUI-create path pushes the card (`:51-56`), then appends a recalled Hindsight section to the description best-effort, guarded by "edited meanwhile" check (`:57-69`). Optional session link + generated Markdown description via `session.generate` |
| `kanban-view-v2` handling | Shared handle with `window.tsx:37-41` and `settings.tsx:29-34` (layout mode store) |
| `i18n.ts` / `lang.ts` | `en`/`ar` catalogs (~150 literals); `useBoardLang`; translation at render time |
| `board-shortcut.tsx` / `board-pill.tsx` | Header shortcut (live task count) and composer pill entry points |
| `start-session.ts` | Session creation/linking + prompt dispatch (`start_session` backend path) |
| `board-wait.ts` | `waitForTask()` implementation for `board_wait` (idle + outcome polling) |
| `board-bridge` cleanup | Aborts on window cleanup, clears timers/waits (`board-bridge.ts:100`) |
| `tool-settings.ts` | Server-durable `tools-enabled` preference mirrored from GUI heartbeat (`poll` carries `toolsEnabled`) — shared by every location instance on one server |

### 3.7 Data flow (agent → board)

```
agent calls board_create
  → server.ts:82-100   board_create → queue.request() (15s, bridge-queue.ts:4,33)
  → GUI board-bridge.ts:11 polls (500ms), claims, applies via applyBoardRequest()   (board-tools.ts:38)
  → GUI updates shared store `kanban-v2`; best-effort Hindsight recall appended to new card description
  → GUI → complete() → server returns result to agent
```

Permissions: every non-`list`/`get`/`wait` write goes through `ctx.permission.assert` (`server.ts:89-91`);
`hindsight_retain` is permission-asserted too (`server.ts:121`). Disabling agent tools in Settings stops all
write tools on every location; previously captured tool snapshots are fenced by the executors themselves
(`server.ts:88,95`).

---

## 4. Build/test cheat sheet for tests you may run

- `node --test tests/*.test.mjs` — 13 suites; **93 passing** (verified this writing).
- `tests/plugin.test.mjs` — integration across the JSON-schema RPC boundary; keep the transport boundary in
  mind when changing `rpc.ts` or `board-tools.ts` schemas.
- `tests/bridge-queue.test.mjs`, `board-tools.test.mjs`, `kanban.test.mjs`, `kanban-storage.test.mjs` — core
  logic regression coverage.
- The GUI has **no automated render tests**; verify UI changes manually in Desktop.

---

## 5. Agent tool surface

Nine `board_*` tools (schemas in `board-tools.ts:5-15`) and three `hindsight_*` tools (`server.ts:103-134`):

- `board_list`, `board_get` — read-only, no permission assert.
- `board_create`, `board_update` (with `expected_updated_at` optimistic-concurrency guard), `board_move`,
  `board_link_session`, `board_remove`, `board_start_session`, `board_wait` — permission-asserted writes.
- `hindsight_recall` / `hindsight_retain` / `hindsight_reflect` — memory bank access; retain is
  permission-asserted; recall/reflect are best-effort reads.

`board_wait` is special: it may run for minutes, is excluded from the caller itself, and may be backgrounded
through OpenCode's UI (`board-tools.ts:14`, `board-bridge.ts:30,38-41,78-81`, `board-wait.ts`).

---

## 6. Hindsight integration

**Daemon:** local embedded Hindsight daemon at **`http://127.0.0.1:9177`**, bank **`fastfree`**
(`src/hindsight-server.ts:13-14`, `src/gui/hindsight.ts:48-54`). Defaults match the daemon profile
(`~/.hindsight/profiles/fastfree.env` per inline comment). Overrides via `FASTFREE_HINDSIGHT_ENDPOINT` /
`FASTFREE_HINDSIGHT_BANK` env vars (server part only) or the Settings page (GUI store). Endpoint overrides are
**loopback-only** (`LOOPBACK_HTTP` guard, `hindsight-server.ts:15,29`); a non-loopback endpoint silently
falls back to the default. Bank ids must match `^[a-z0-9][a-z0-9._-]{0,63}$`.

### The CORS limit and the 405 finding

The OpenCode **Desktop renderer cannot fetch the daemon directly**: the embedded Hindsight daemon does not
answer CORS preflight (OPTIONS) requests — the preflight is answered with **405 Method Not Allowed**, so every
renderer fetch to `127.0.0.1:9177` fails before it starts. **Therefore all GUI→daemon traffic is routed
through the plugin server part.** Concretely:

1. `window.tsx:26-29` watches connected servers and calls `bindHindsightTransport()` with the first
   connected server's `BoardBridge` RPC client (`hindsight.ts:33-39`).
2. GUI calls `transport.hindsight_recall/retain/reflect` (`hindsight.ts:79,127`).
3. Server executes them in the Node process (no CORS applies) and hits the daemon
   (`server.ts:67-78` → `hindsight-server.ts:123-150`).
4. Agents bypass the GUI entirely: the server part calls the daemon itself (`hindsight-server.ts:80-120`).

A direct-`fetch` fallback exists in `hindsight.ts:88-115` (recall) and `hindsight.ts:143-156` (retain) but is
only exercised when **no transport is bound**; in practice it hits the same CORS wall. It exists as a
last-resort/headless escape hatch, not a supported path.

### Endpoints used (bank-scoped, all under `/v1/default/banks/{bank}`)

| Endpoint | Used by | Purpose |
| --- | --- | --- |
| `POST /memories/recall` | `serverRecall` (context hook), `toolRecall`, `rpcRecall`, GUI `recall()` | budget `low` recall; top-8 (server) / top-5 (GUI) markdown lines |
| `POST /memories` | `toolRetain`, `rpcRetain`, GUI `retain()` | one compact item, `update_mode: "append"`, tags `[fastfree, agent]` (GUI adds `task:<id>`), `document_id: task:<id>` |
| `POST /reflect` | `toolReflect`, `rpcReflect` | LLM synthesis; `max_tokens ≤ 2000`, budget `low` only |
| `GET /health` | **not used by the plugin.** | Exists on the daemon for manual probing (`curl http://127.0.0.1:9177/health`); the plugin never calls it — do not document it as wired. |

Config summary: no API key (local daemon), loopback only, memory traffic never leaves the machine.
Best-effort reads (`serverRecall`, `rpcRecall`) **never throw**; tool-facing calls throw on hard failure;
GUI `retain()` swallows errors and returns `false`.

### What gets remembered, and when

- **Per session, once:** `FASTFREE_MEMORY` snapshot injected into the system prompt (512 tokens,
  `server.ts:145-154`).
- **Agent create:** description of newly agent-created cards gets a recalled memory section appended
  (`board-bridge.ts:51-65`).
- **Agent create via dialog:** same append, "edited meanwhile" guarded (`new-task-dialog.tsx:57-69`).
- **Agent move → `review`/`done`:** compact memory retained (`board-bridge.ts:67-71`).
- **Auto-move `progress` → `review`:** one memory retained per card (`auto-move.ts:55`).
- **Drag-and-drop does NOT retain** (§8).

---

## 7. Install & layout

- **Local junction:** `~/.config/opencode/plugins/fastfree_board` → `C:\Users\FastFree\Desktop\fastfree\plugins\fastfree_board`
  (Windows directory junction; no admin rights required; verified present). OpenCode Desktop **auto-discovers**
  plugins in the global `plugins/` folder, so no entry is needed in the OpenCode config.
- **`~/.config/opencode/opencode.json`** (the actual file here — not `.jsonc`): contains
  **`"plugins": []`** (verified). The junction mechanism loads the plugin even though the npm plugins list is
  empty. Do not "fix" this by adding an npm specifier; this fork is installed by directory reference only.
- **No build step needed at load time** — but `dist/` must exist and be current. After editing `src/`,
  run `bun run build`, then restart/reload OpenCode Desktop to pick up the new `dist/`.
- **Windows paths:** junction target must keep working directory stable; the plugin dir must remain at
  `C:\Users\FastFree\Desktop\fastfree\plugins\fastfree_board` (junction is absolute).
- **Do not** symlink the repo elsewhere or copy it — the junction is the single source of truth.

---

## 8. Known limitations (honest)

1. **GUI create-and-append is unverified live.** Both append paths (`board-bridge.ts:51-65` agent-create and
   `new-task-dialog.tsx:57-69` dialog-create) are implemented and unit-reviewable, but have **not been
   exercised end-to-end in a live OpenCode Desktop session** — treat the memory-section-on-create feature as
   best-effort and unverified in production.
2. **Drag-and-drop does NOT retain to Hindsight.** Only the two retain call sites above (agent move to
   `review`/`done`, and the `auto-move` rule) write memories. Moving a card with the mouse is silent memory-wise.
4. **Desktop must be open and connected.** All board writes are delivered by the Desktop GUI through the
   bridge queue. With Desktop closed, agents get "Open OpenCode Desktop with fastfree_board enabled …"
   (`bridge-queue.ts:35`). The panel doesn't need to be visible, but the app must be running and the plugin
   enabled/connected to the conversation's server.
5. **Delivery ambiguity on timeout.** If a request is delivered and times out, the error says the write
   **may have been applied**; clients must re-read before retrying (`bridge-queue.ts:50`). One non-`concurrent`
   request (i.e., any board write) is in flight at a time across all windows on one server.
6. **Plugin storage persisted by Desktop.** All board/settings/memory stores are Desktop plugin storage keyed
   under **`plugin.fastfree_board.*`** (e.g. `plugin.fastfree_board.kanban-v2`, `…settings-v1`,
   `…hindsight-local-v2`, `…kanban-view-v2`). They are local to this machine, survive Desktop restarts,
   and do **not** sync across machines. The stores opened with `from:` migrate from the upstream showcase
   keys (`plugin.opencode-desktop-showcase.*`).
7. **Hindsight failure is silent (for users).** Best-effort paths log `console.warn` and continue. Agent
   tools throw on hard failures, but no UI surfaces daemon status (e.g., HTTP 405/unreachable) beyond logs
   and a "no relevant memories" string.
8. **`board_get` links expose other servers' session ids.** By design (needed for cross-window linking);
   read-only, but agents can reference sessions outside the current project.
9. **`/health` is not wired up** (§6); daemon liveness must be checked externally.
10. **Fork-specific docs are thin.** `README.md`/`docs/*` still carry upstream URLs
    (`github.com/dbpolito/opencode-board`), and `docs/releasing.md` describes the upstream release flow —
    none of it should be executed for the FastFree fork.
11. **`publishConfig.access: public` and `.github/workflows/publish.yml` exist** (inherited from upstream;
    the workflow is gated on `github.repository == 'dbpolito/opencode-board'` and OIDC trusted publishing).
    **`npm publish` must not be run for this fork.** Local `publisher` is out of scope.
12. **No automated GUI tests.** Drag/drop, RTL layout, dialogs, and the settings page are manual-check only.
13. **Storage-key caveat:** the plugin id changed `opencode-board` → `fastfree_board`, but store keys were
    kept deliberately (board data preserved). The panel tab id re-registered under the new id.

---

## 9. Packaging (npm pack sanity check)

`npm pack --dry-run` was run in the plugin directory. Summary of the final run (after `PLUGIN.md` was added
to `files` in `package.json`): see the table below, generated from the tool output.

**Package contents policy**

- `files: ["dist", "PLUGIN.md", "UPSTREAM.md"]` — `dist/` is the **loadable artifact** and must ship; it is
  not build cruft. `README.md`, `LICENSE`, and `package.json` are auto-included by npm regardless of `files`.
- `docs/` (incl. `demo.mp4`, ~6.1 MB) is **not** packaged.
- `src/`, `tests/`, `.github/` are **not** packaged.

**Tarball contents (`fastfree_board-0.3.0.tgz`)**

| File | Size | Notes |
| --- | --- | --- |
| `dist/server.js` | 184.1 kB | loadable server entry (`exports["."]`) |
| `dist/gui-experimental.cjs` | 291.8 kB | loadable GUI entry (`exports["./gui-experimental"]`) |
| `dist/rpc.js` | 3.0 kB | shared contract (`exports["./rpc"]`) |
| `package.json` | 1.6 kB | metadata |
| `README.md` | 5.9 kB | auto-included |
| `LICENSE` | 1.1 kB | auto-included |
| `PLUGIN.md` | 26.9 kB | in `files` |
| `UPSTREAM.md` | 3.0 kB | fork provenance, in `files` |

**Result:** package size 145.4 kB, unpacked 517.3 kB, **8 files** (was 6 before `PLUGIN.md`/`UPSTREAM.md`
were added). All `exports` targets resolve into `dist/` and are present in the tarball.

**`prepublishOnly` note.** It runs `bun run check` (typecheck + build + all 93 tests) — the same gate the
upstream publish workflow uses. It is **not** executed by `npm pack` / `npm pack --dry-run` (verified); it
only runs on `npm publish`, which must not happen for this fork. It was deliberately left unchanged.

**Metadata check.** `name` `fastfree_board` (valid), `license: MIT` matches `LICENSE`, `repository`/`homepage`/
`bugs` still point at upstream (`dbpolito/opencode-board`) — accurate for a fork embedded outside that repo on
pack install, but publishing from here is not supported (§8.11). No dependencies were added or removed.

---

## 10. What this file is / is not

- **Is:** the orientation map for hacking on the fork — build/test, architecture, data flow, packaging.
- **Is not:** user docs (`README.md`), the upstream guides (`docs/*.md`), release instructions
  (`docs/releasing.md` — upstream-only), or a promise that any path above has been exercised live.

---

## 11. Automatic lifecycle

The board can drive a card from creation to completion without manual dragging. All automatic steps are gated by
settings in **Settings → Board → Automatic lifecycle** and can be switched off individually.

### Column-driven flow

```
backlog → ready → progress → review → done
```

| Transition | Trigger | Controller |
|---|---|---|
| `backlog → ready` | There is room under the **max concurrent work** limit (`progress` count < `maxConcurrent`) | `auto-lifecycle.ts` |
| `ready → progress` | A work session is started for the card | `auto-lifecycle.ts` |
| `progress → review` | Every linked session reached `idle` with outcome `succeeded` | `auto-move.ts` |
| `review → done` | The review session started by the lifecycle succeeded | `auto-move.ts` + `auto-lifecycle.ts` |

### Settings

| Setting | Default | Effect |
|---|---|---|
| `autoPromote` | on | Move cards from `backlog` to `ready` when there is room |
| `maxConcurrent` | 2 | Maximum cards in `progress` at once (safe default for weak hosts) |
| `autoStart` | on | Start a work session for each `ready` card and move it to `progress` |
| `autoReview` | on | Start a review session for each `review` card |
| `autoModel` | `opencode/glm-5.3-flash-free` | `providerID/modelID` used for automatically opened sessions |

### Limits and safety

- A card is started **at most once** per column (`starting` set + `reviewSessions` map).
- `auto-lifecycle` only starts sessions when the card has no linked sessions in `ready`, and only when no review
  session has been tracked yet in `review`.
- Failures are shown as toasts and do not crash the board.
- Drag-and-drop and agent-driven `board_move` still work; they override or coexist with the automatic rules.

---

Last verified against the working tree on 2026-11-11 (typecheck clean, 93/93 tests pass, `npm pack --dry-run` clean).
