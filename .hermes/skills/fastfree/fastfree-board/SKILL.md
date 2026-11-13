---
name: fastfree-board
description: "Use when working on the board Kanban plugin lifecycle."
version: 1.0.0
author: FastFree (fastfree), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [fastfree, board, kanban, lifecycle, opencode, plugin]
    related_skills: [fastfree-development, fastfree-pm]
---

# fastfree_board — Lifecycle & Architecture

`plugins/fastfree_board` is an OpenCode Desktop plugin (id `fastfree_board`, v0.3.0), a fork of MIT `opencode-board`
by dbpolito. It embeds a single **global** Kanban board (`kanban-v2`) inside OpenCode Desktop, shared across
projects/sessions/windows of one install. Not published to npm; loaded via a directory junction.

## When to Use

- Any task touching `plugins/fastfree_board/` (lifecycle, columns, card ops, agent tools, Hindsight)
- Debugging why a card moved (or did not move) automatically
- Changing auto-lifecycle settings, default model, or concurrency
- Reviewing board data flow / bridge queue / RPC contract

## Board model

- **Seed columns** (`src/gui/kanban-model.ts:3-10`): `backlog`, `ready`, `progress`, `review`, `done`, plus a
  `hindsight` column. Defaults are localizable (`columnDefaults`/`columnKeys`); user-renamed columns render verbatim.
- **Card** (`CardSchema`): `id, title, description (Markdown), labels (comma string), status, session, sessions?,
  links?: [{server,id}], project?: {server,directory,name?}, updatedAt?`.
- **One board store**: `kanban-v2`, global scope, migrated from `plugin.opencode-desktop-showcase.kanban-v2`
  (`src/gui/kanban-storage.ts`). All stores live under `plugin.fastfree_board.*` and are Desktop-plugin local
  (survive restart, no cross-machine sync).
- **Settings store**: `settings-v1` (`src/gui/settings-model.ts`), initial `{ toolsEnabled: true, locale: "ar" }`.

## Lifecycle — two layers

### 1. Manual lifecycle (default UI behavior)

- Create via **New task**, column **+**, or agent `board_create` (defaults to first column, no session started).
- Drag/reorder cards; `board_move` for programmatic moves. `board_update` with `expected_updated_at` is the
  optimistic-concurrency guard. `project: null` unassigns and clears links.
- **Start session** from a card (or `board_start_session`) creates a linked session and sends `taskPrompt()`
  (title, task_id, Markdown description, "mark checkboxes as you complete"). It does **not** move the card.
- `board_link_session` links/unlinks conversations; linked sessions are never created/stopped/deleted by the board.
- `board_wait` waits for linked sessions (excludes the calling conversation), returns outcomes/replies, no move.
- `board_remove` deletes the card + links only; sessions keep running.
- Task status stays **manual** unless the automatic lifecycle is enabled.

### 2. Automatic lifecycle (`src/gui/auto-lifecycle.ts`, `src/gui/auto-move.ts`)

The columns drive execution end-to-end when enabled (all default **on**):

```
backlog → ready    autoPromote: when progress count < maxConcurrent (default 2)
ready   → progress autoStart: opens a work session, then moves the card
progress → review  auto-move: all linked sessions idle + outcome "succeeded"
review  → done     autoReview: opens a review session; auto-move completes it
```

Details that matter:

- **autoPromote**: promotes `backlog` cards to `ready` only while `progress` count < `maxConcurrent`
  (`Math.max(1, maxConcurrent ?? 2)`). Skips if no `ready` column or card no longer `backlog`.
- **autoStart**: for each `ready` card with **no links** and not already `starting`, launches a session
  (`launch(..., {open:false})`), then moves it to `progress`. `starting` is a per-card once-per-column guard.
- **autoReview**: for each `review` card without an entry in the module-level `reviewSessions` map, launches a
  review session and records `reviewSessions.set(card.id, session_id)`.
- **auto-move progress→review**: requires ≥1 link and **every** linked session `idle` with last idle message
  `outcome === "succeeded"`. Disconnected server or missing idle message ⇒ no move (it asks the host to sync).
- **auto-move review→done**: only when the card's `reviewSessions` id is linked and succeeded. Then the map
  entry is deleted.
- **User re-plan wins**: auto-move re-checks current status inside the store update; if the user changed the
  card meanwhile, the move is skipped.
- **Failures** surface as toasts (`ctx.toast.show`, variant `error`); they never break the board or the effect.
- **Model**: `autoModel` setting as `providerID/modelID`, default `DEFAULT_AUTO_MODEL` =
  `opencode/glm-5.3-flash-free` (`settings-model.ts:24`). Parsed by `parseAutoModel`; invalid ⇒ no auto sessions.
- **Server/directory resolution**: card's `project.server`/`project.directory`, else the first connected server
  and its default directory. No connected server ⇒ error toast.

### Settings UI (Settings → Board, `src/gui/settings.tsx:100-164`)

Toggles: `autoStart`, `autoReview`, `autoPromote` (each `!== false` = on). Inputs: `maxConcurrent` (default 2,
clamped ≥1), `autoModel` (default `DEFAULT_AUTO_MODEL`). All live in `SettingsSchema`.

## Hindsight memory hooks (best-effort)

- Per session once: `FASTFREE_MEMORY` snapshot in the system prompt (512 tokens, `server.ts`).
- The system prompt also carries a standing `FASTFREE_BOARD` workflow (OPEN → RECALL → PLAN → VERIFY →
  TRACK → PERSIST) plus board-reliability guidance (re-read before retry, use `board_status`).
- `taskPrompt()` adds opt-in rules by label: `verify`/`tested`, `plan`/`designed`, `workflow`/`smart`.
  Plain cards stay byte-identical — never add default rules; a test asserts the exact output.
- Agent `create`: recalled section appended to the new card description in the background (`board-bridge.ts:54-69`).
- Agent `move` → `review`/`done`: compact memory retained (`board-bridge.ts:73-76`).
- Auto-move `progress`→`review`: one memory retained per card (`auto-move.ts:67`).
- **Drag-and-drop does NOT retain** — only the two call sites above write memories.
- Daemon `http://127.0.0.1:9177`, bank `fastfree`; GUI traffic is routed through the plugin server because the
  daemon fails CORS preflight (405). Endpoint overrides are loopback-only.

## Agent tool surface (10 `board_*`)

`board_list`, `board_get` (read-only, no permission) · `board_create`, `board_update`, `board_move`,
`board_link_session`, `board_remove`, `board_start_session`, `board_wait` (permission-asserted writes) ·
`board_status` (server-side liveness probe — no Desktop round-trip).
Schemas in `src/board-tools.ts:5-15`; pure apply logic `applyBoardRequest()` at `board-tools.ts:38`.

## Driving the board externally (Hermes / CI)

**Model quota is the #1 board blocker — solve it with a fallback chain, not by hand.** A session is bound to one model; on `429` (daily free limit or the 5-hour Go limit) the run just fails. Install the `opencode-runtime-fallback` plugin so OpenCode switches models automatically instead of dying:

```json
{ "plugins": [{ "package": "opencode-runtime-fallback", "options": { "fallback_models": ["<working-model>", "<next>", "..."] } }] }
```

- `opencode plugin add opencode-runtime-fallback` installs and registers it (needs v0.3.1+ on V2).
- Put the model that currently has quota **first** in `fallback_models`; the plugin walks the chain on retryable errors and cooldowns the failed model. Restart Desktop after editing `opencode.json`.
- `retryable_error_patterns` must cover the OpenCode quota messages, which are text-based, not just status codes: `["rate.?limit", "usage limit", "quota", "hosted outside", "trains on request data", "model unavailable"]`.
- Verify the chain end to end: `opencode run --model <exhausted-model> "Reply with exactly: OK"` should print the fallback model name and then succeed.
- **Two quota pools**: `opencode/*` (free, daily `429 provider.free-limit`) and `opencode-go/*` (5-hour `429 provider.go-limit`). Both can be exhausted in the same day. Probe with a trivial prompt before dispatching real work: `opencode run --auto --format json -m <model> "Reply with exactly: OK"`.
- **`board_start` inherits the calling session's model** — always issue `board_start` from a session whose model has quota; the child session copies `providerID/modelID`.
- Direct drive: `opencode run --auto --format json -m <working-model> "<prompt with a board_* tool call>"` — the build agent has the board tools.
- MCP bridge: `plugins/fastfree_board/mcp-server.mjs` (8 tools `fastfree_board_*`), stdio JSON-RPC; set `FASTFREE_BOARD_MODEL=<working-model>`.
- `opencode api GET /api/session` lists sessions; board writes require OpenCode Desktop running (bridge queue delivers to the GUI).
- Root `opencode.json` points the MCP entry at a missing `hermes-bridge/` path — use the plugin-root `mcp-server.mjs` instead.
- Keep prompts explicit (exact tool name + JSON input) for reliable board mutations.
- To make auto-lifecycle survive quota gaps, set `autoModel` in Settings → Board to a model with quota (or connect another provider via `opencode auth login`).
- Recipe and session-inspection commands: `references/opencode-execution.md`.

**Read the board without the GUI.** The store lives in `%APPDATA%/ai.opencode.desktop/drafts.sqlite`, table `state`, key `plugin.fastfree_board.kanban-v2` (JSON: `columns[]` + `cards[]` with `status`/`links`/`updatedAt`). Query it with Python `sqlite3` whenever the Desktop renderer is hung — inspecting board state never requires the GUI, only writing does. Settings are the sibling key `plugin.fastfree_board.settings-v1`.

## Data flow (agent → board)

```
agent tool call → server.ts queue.request() (60s default, FASTFREE_BOARD_TIMEOUT_MS, bridge-queue.ts)
  → GUI board-bridge.ts polls (500ms/server), claims, applies via applyBoardRequest()
  → shared store kanban-v2 updates → GUI → rpc.complete() → result back to agent
```

Bridge queue: one non-`concurrent` request in flight across windows; ≥100 pending rejected; timeout error says
the write **may have been applied** — re-read before retrying.

**Robustness contract (bridge v3):**
- **Timeout 60s** (was 15s) — the GUI may be busy launching a session or rendering; 15s produced spurious
  "Desktop did not answer" failures. Override with `FASTFREE_BOARD_TIMEOUT_MS`.
- **No leader gate** — any window may poll; the `owner` flag is the single source of truth. The old
  `leader`/`seen < 5s` gate let one busy window stall the whole board.
- **Claim lease (30s)** — a window that claims a request and goes silent releases it after the lease, so one
  stuck window cannot wedge the board. A reaper interval also releases stale claims when nothing polls.
- **Liveness** — `heartbeat`/`status` RPCs plus the `board_status` agent tool let agents distinguish
  "Desktop is closed" from "Desktop is busy" and fail fast.
- **Idempotency** — `request({ idempotencyKey })` caches the completed result; a retry with the same key
  returns it instead of applying the write twice.
- **GUI never blocks** — `board-bridge.ts` backgrounds every response and enforces a 45s
  `RESPONSE_TIMEOUT_MS`, so a slow `start_session`/`wait` cannot stop the poll loop.

## Gotchas / pitfalls

- **Desktop must be open and connected** for any board write; otherwise agents get "Open OpenCode Desktop…".
- **The bridge queue is a `globalThis` singleton keyed by `Symbol.for("fastfree_board.bridge.v3")`.** After
  changing `bridge-queue.ts`, bump the symbol version — a reloaded plugin reuses the old queue instance, so
  new methods are `undefined` (symptom: HTTP 500 `queue.heartbeat is not a function` in the OpenCode log while
  the GUI keeps beating). Rebuild `dist/` and let Desktop reload.
- **The GUI hot-reloads on `dist/` changes, the server bundle does not always** — after a rebuild, confirm in
  the OpenCode log that the new server code loaded (no new RPC errors) before blaming the client.
- `board_get` links can expose other servers' session ids (by design, read-only).
- No automated tests for `auto-lifecycle.ts`/`auto-move.ts` — verify changes manually in Desktop.
- `dist/` is the loadable artifact; rebuild with `bun run build` after editing `src/` and restart Desktop.
- Store keys were kept from upstream (`opencode-board` → `fastfree_board`) to preserve board data.
- `npm publish` must not be run for this fork.
- Auto-lifecycle only runs in the GUI (SolidJS effects); headless/agent-only runs do not advance cards.
- `reviewSessions` is in-memory only — a Desktop restart forgets which review session belongs to a card, so a
  `review` card may not auto-complete until re-entered/reviewed again.

## Key files

| File | Role |
|---|---|
| `src/gui/auto-lifecycle.ts` | autoPromote + autoStart + autoReview orchestration |
| `src/gui/auto-move.ts` | progress→review and review→done rules + retain |
| `src/gui/kanban-model.ts` | columns, schemas, `moveCard`, `taskPrompt` |
| `src/gui/settings-model.ts` | `SettingsSchema`, `DEFAULT_AUTO_MODEL` |
| `src/gui/settings.tsx` | Settings → Board page (lifecycle toggles) |
| `src/gui/board-bridge.ts` | GUI claim/apply loop, create enrich, move retain |
| `src/gui/board-wait.ts` | `waitForTask` implementation |
| `src/board-tools.ts` | tool schemas + `applyBoardRequest` |
| `src/bridge-queue.ts` | server↔Desktop request outbox |
| `src/server.ts` | plugin entry, RPC handlers, tool registration, context hook |
| `src/gui/hindsight.ts` | GUI Hindsight client (recall/retain) |

## Verification

- `cd plugins/fastfree_board && bun run typecheck` → exits 0
- `node --test tests/*.test.mjs` → 98/98 pass (run it fresh; the count drifts as suites are added and PLUGIN.md lags it)
- Junction: `ls -la ~/.config/opencode/plugins/fastfree_board` → must be a junction to `C:/Users/FastFree/Desktop/fastfree/plugins/fastfree_board`
- Lifecycle behavior: manual check in OpenCode Desktop (no render tests)
