---
name: fastfree-opencode
description: "Develop fastfree_board and connect Hermes↔OpenCode."
version: 1.0.0
author: FastFree (fastfree), Hermes Agent
license: MIT
platforms: [windows, linux, macos]
metadata:
  hermes:
    tags: [fastfree, opencode, plugin, kanban, hermes, bridge, rpc]
    related_skills: [fastfree-development, hermes-agent]
---

# FastFree OpenCode Plugin & Hermes Bridge

Develop `plugins/fastfree_board` (the OpenCode Desktop kanban plugin) and the
bridge that lets Hermes and OpenCode drive each other.

## When to Use

- Extending or debugging `plugins/fastfree_board`
- Connecting Hermes ↔ OpenCode: board sync, session control, MCP, CLI
- Adding agent tools or RPC methods to the plugin
- Diagnosing an OpenCode MCP entry or plugin RPC call that fails

## Architecture (read before editing anything)

| Path | Role |
| --- | --- |
| `src/server.ts` | Server part — runs inside the OpenCode server process. Registers RPC (`ctx.rpc.register`), agent tools (`ctx.tool.transform`), session hooks (`ctx.session.hook`), and server-side storage (`ctx.storage`). |
| `src/rpc.ts` | The RPC contract, imported verbatim by both server and GUI. A method added here is exposed to the Desktop GUI **and** to external HTTP clients. |
| `src/gui/` | SolidJS GUI in the Desktop renderer. **Owns the authoritative board store** (`kanban-v2`, opened with `ctx.storage.store`). The server never mutates the board directly. |
| `src/bridge-queue.ts` | The only writer path: callers enqueue a request, the GUI polls (`poll`), applies it via `applyBoardRequest`, and reports back (`complete`). Reuse it for every new mutation. |
| `src/board-tools.ts` | Pure board operations + `toolSchemas`; the single source of truth for operation input shapes. |
| `src/hindsight-server.ts` | Outbound bridge to the local Hindsight daemon. |

## Connection layers (how Hermes reaches the board)

| Layer | Where | Role |
| --- | --- | --- |
| 1. Board | `plugins/fastfree_board` (OpenCode Desktop plugin) | The board itself: `kanban-v2` store, `board_*` agent tools, GUI. |
| 2. OpenCode HTTP API | `opencode api` (official, documented) | Sessions, prompts, messages. **The official external surface — prefer it over any private bridge.** |
| 3. MCP server | `mcp-server.mjs` (plugin root), registered in `opencode.json` under `mcp.servers` as `fastfree_board` and in Hermes `config.yaml` under `mcp_servers` | Wraps `opencode api`; gives Hermes the `fastfree_board_*` tools. |
| 4. Plugin RPC | `src/rpc.ts` (`fastfree_board.bridge`) | The transport under both: GUI ↔ server, and MCP → server. |

Path: `Hermes → MCP server → opencode api → OpenCode server → board_* tools → Desktop GUI → kanban-v2`.

The Hermes kanban mirror (`hermes-mirror.ts`, `mirror-plan.ts`, `gui/mirror-move.ts`) has been
removed — card moves no longer spawn `hermes kanban`. Do not reintroduce it unless asked.

## Standing rule: execute the work through fastfree_board

Track multi-step work on the board itself — create a card, move it `ready` when you
start, `review` when you finish. The user reviews execution through the board, so work
done off-board is invisible to them. A single focused refactor with no intermediate
steps is the only exception.

Two standing expectations from the user:

- **Prefer the official path.** When connecting Hermes/OpenCode/board, use the
  documented surface (OpenCode HTTP API, MCP) rather than a hand-rolled private
  bridge. The user asks for "the best official way" by default.
- **Verify tasks actually ran.** After starting a card, confirm real output (a session
  id, a log line, a test result) — never report a task as done from the plan alone.
  Before deleting a card as obsolete, grep the source for the symbol it names; an
  unused symbol means the work is already gone.

## Build & test

```bash
cd C:/Users/FastFree/Desktop/fastfree/plugins/fastfree_board
bun run check                  # typecheck + build + all unit tests — the gate
bun run build                  # vite (GUI) + bun (server/RPC) -> dist/
node --test tests/*.test.mjs   # tests only
```

- `dist/` is the loadable artifact; Desktop loads it through the junction
  `~/.config/opencode/plugins/fastfree_board`. Rebuild and restart Desktop after
  editing `src/`.
- The GUI has no automated render tests — verify UI changes in Desktop.

## Calling plugin RPC from outside OpenCode (verified)

Any registered RPC method is reachable over the OpenCode Server HTTP API:

```
POST {baseUrl}/api/rpc/{rpcID}/{method}
Authorization: Basic base64({username}:{password})
Content-Type: application/json

{"input": <method input>}

→ 200 {"output": <method output>}
```

- `baseUrl` — `opencode service status` (e.g. `http://127.0.0.1:<port>`).
- Credentials — HTTP Basic, username `opencode`, password from
  `~/.config/opencode/service.json` (`{"port":…,"password":…}`). Unauthenticated
  calls get `UnauthorizedError`.
- `rpcID` — the contract `id` in `src/rpc.ts` (e.g. `fastfree_board.bridge`).
- **Wrap the input under `"input"`.** Posting the raw input returns
  `rpc.invalid_input: Expected object`.
- The OpenAPI spec is at `/openapi.json` — not `/api/openapi.json`, and `/doc`
  serves the web UI HTML rather than the spec.
- Methods that accept a location can be scoped with a `location` query param.
- TypeScript client: `@opencode/client` → `OpenCode.make({ baseUrl, headers })`,
  then `client.rpc(BoardBridge)`.

## OpenCode HTTP API (`opencode api`) — the official external surface

`opencode api` is the documented way to drive a running OpenCode server. It
discovers the server and password automatically (reads the Desktop lockfile /
`service.json`), so no `--server` or `OPENCODE_PASSWORD` is normally needed.

```bash
opencode api GET  /api/info                                  # server identity + URLs
opencode api POST /api/session            -d '{}'             # create a session → data.id
opencode api POST /api/session/<id>/prompt -d '{"text":"…"}' # send a prompt
opencode api GET  /api/session/<id>/message                   # read messages
opencode api POST /api/session/<id>/interrupt -d '{}'         # stop a running turn
```

- The prompt body key is **`text`** — a `message` key returns
  `InvalidRequestError: Missing key at ["text"]`.
- Wait for the assistant: poll `/api/session/<id>/message` until the last message
  has `type: "idle"`; assistant text is in `content[].text` (filter `type: "text"`).
- The session's agent loop is what actually calls the `board_*` tools — the API is a
  thin transport, so a board tool call costs one full agent turn (~10–60s).
- Routes are under `/api/...`; `/doc` serves the web UI HTML, not the spec.
- `opencode api` prints a version-mismatch warning when the Desktop server and the
  CLI differ; it still works.

## MCP server for Hermes (`mcp-server.mjs`)

The plugin-root `mcp-server.mjs` speaks MCP over stdio and wraps `opencode api`.
It keeps one reusable OpenCode session for its lifetime and exposes:
`fastfree_board_list|get|create|update|move|remove|summary|start`.

- Register in Hermes: `hermes mcp add fastfree_board --command "C:/Program Files/nodejs/node.exe" --args "<plugin>/mcp-server.mjs"` then confirm `Y`.
- Register in OpenCode: `opencode.json` → `mcp.servers.fastfree_board.command`.
  **Keep both paths in sync** — a stale path makes the server spawn a deleted file.
- After adding, run `/reload-mcp` or start a new Hermes session; tools are not live mid-session.
- `board.mjs <tool> [json]` is a thin CLI wrapper for testing the MCP server by hand.

## Hermes-side connection options

1. **MCP server** — `mcp-server.mjs` (plugin root), registered in `opencode.json` and
   Hermes `config.yaml`; Hermes calls the `fastfree_board_*` tools.
2. **OpenCode HTTP API** — `opencode api` (official); see the section above.
3. **Plugin RPC** — call any method in `src/rpc.ts` over the OpenCode HTTP API (above).
4. **Hermes as an MCP server for OpenCode** — install the `mcp-serve` plugin
   (`hermes plugins install mcp-serve`); it is not a core command. See the
   `hermes-agent` skill.
5. **Headless runs** — `opencode run -m <model> --auto --archived "<prompt>"`.
   Free models: `opencode/beam-free`, `opencode-go/beam-free`.
6. **Automatic lifecycle** (this skill's section above) — the GUI starts sessions from the
   columns; no manual `hermes kanban` calls needed.

## Pitfalls

- **Check for concurrent edits before writing.** Another session or subagent may
  be editing the same files. Search for the symbol with `search_files` and check
  `git status` first; `write_file` refuses on a stale read, so re-read and merge
  instead of overwriting. Adding a duplicate RPC method or bridge module is the
  common collision.
- **Untracked integration files are unrecoverable.** The MCP server and its bridge
  lived untracked in git; `rm -rf` destroyed the only copy and there was no backup.
  Run `git ls-files <path>` before deleting anything — if it prints nothing, the file
  is untracked and `rm` is permanent. Copy it aside first.
- **Two different systems are called "kanban".** Hermes kanban lives in
  `.hermes/hermes-agent/` (`hermes_cli/kanban*.py`, `gateway/kanban_*.py`,
  `apps/desktop/src/plugins/kanban/`) and is **not** part of the FastFree ERP repo —
  it is a separate git checkout, so deletions there are recoverable with
  `git checkout`. fastfree_board is the OpenCode Desktop plugin at
  `plugins/fastfree_board/`. Name which one you mean before deleting or "cleaning" either.
- **Never mutate the board from the server part.** Route mutations through the
  bridge queue so the Desktop GUI stays the single writer; a server-side write is
  overwritten on the next GUI sync.
- **`opencode run` fails with "Failed to change directory" when the shell cwd is
  an MSYS-translated path** (`/c/Users/...`). Run it from a native directory (the
  repo root works).
- **Board mutations require Desktop to be running.** The queue times out when no
  GUI client is connected; reading the last cached snapshot still works.
- **A hung Desktop renderer looks like a board outage.** The renderer log fills with
  `[server-request-queue] server thrashing detected` and
  `Failed to read server terminal support: The server took too long to answer`, and
  the board bridge stops answering even though `opencode api` still works. Restart the
  Desktop app (kill `OpenCode*`, relaunch) — do not keep retrying the bridge. The
  renderer also hangs if a spawned MCP server never exits, so kill stray
  `node ... mcp-server.mjs` processes after a failed probe.
- **Keep the MCP registration paths in sync.** `opencode.json` → `mcp.servers.fastfree_board.command`
  and Hermes `config.yaml` → `mcp_servers.fastfree_board.args` must both point at the
  live `mcp-server.mjs`. A stale path makes the server spawn a deleted file and the
  Desktop logs fill with plugin-load warnings.
- **`stale: true` on the snapshot means the GUI has not pushed recently** — the board
  data is still readable, but it is the last known state, not live. Reopen/restore the
  Desktop window to resume pushes.
- **Delete cards whose feature was removed.** When a subsystem is deleted (e.g. the
  Hermes bridge), grep the board for cards naming it and remove them; leaving them
  makes the board a TODO list of things that can never be done. Verify with
  `grep -rn "<symbol>" src/` before deleting — an unused symbol means the card is
  obsolete.
- **Do not hand-edit `dist/`** — rebuild.
- **Free-first** — use the free `opencode/beam-free` / `opencode-go/*-free` models for
  headless runs; never enable paid providers.

## Automatic lifecycle (verified)

`src/gui/auto-lifecycle.ts` links the Kanban columns to OpenCode sessions:

| column | effect |
| --- | --- |
| `ready` | starts a **work** session on the card's project (pref `autoStart`). |
| `review` | starts a **review** session and records it in `reviewSessions`. |

A card is started at most once and only when it has no linked sessions (`starting` set + `taskLinks`). Failures surface as toasts, never break the effect. The default model is `opencode/glm-5.3-flash-free` (`DEFAULT_AUTO_MODEL` in `settings-model.ts`); override per-board in the settings UI (`autoModel`) and read the shared `settings-v1` store (`boardSettings` → `BOARD_SETTINGS_KEY`).

### End-to-end workflow
1. Edit `src/gui/auto-lifecycle.ts`, `src/settings-model.ts`, `src/settings.tsx`.
2. Rebuild and verify: `bun run check` (typecheck + build + all unit tests).
3. Restart Desktop so `dist/` reloads.
4. Move a card to `ready` to start a work session; the log prints
   `[fastfree_board] auto-lifecycle started <cardId> <sessionId>`.
5. Move a card to `review` to start a review session; the lifecycle records
   `reviewSessions.set(cardId, sessionId)`; the `review → done` transition completes once
   that session succeeds. `fastfree_board_list` with `column_id` is the diagnostic to watch
   (cards with `session: ""` and no links are the lifecycle's queue).
6. Run `node --test tests/*.test.mjs` and keep the 109-tests green; `dist/` is reloaded
   and must not be hand-edited.

## Verification

- `bun run check` passes.
- A new RPC method answers over HTTP:
  `curl -u opencode:$PW -X POST "$BASE/api/rpc/fastfree_board.bridge/<method>" -H 'Content-Type: application/json' -d '{"input":{…}}'`
- The MCP server answers: `printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node mcp-server.mjs`
- A board tool round-trip works end to end: `node board.mjs fastfree_board_list '{"limit":5}'`
- `git diff` shows only intended changes.
