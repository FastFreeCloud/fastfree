# FastFree SDUI delivery server

Hono + SQLite (`node:sqlite`) server that serves versioned SDUI screens with
ETag / `versionHash` support (docs/sdui/PLAN.md §6, task SDUI-03).

## Run

```bash
cd packages/fastfree_sdui/server
SDUI_PORT=4000 node src/server.ts
```

Environment variables:

| Variable | Default | Meaning |
|---|---|---|
| `SDUI_HOST` | `127.0.0.1` | Bind address |
| `SDUI_PORT` | `4000` | Bind port |
| `SDUI_DB_PATH` | `./sdui.db` | SQLite database file |
| `SDUI_NO_AUTOSTART` | unset | `1` disables built-in `serve()` (for tests) |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/v1/screens/:id?channel=&version=` | Fetch screen + `ETag` + `versionHash` (304 on `If-None-Match`) |
| GET | `/v1/screens/:id/versions` | Version history |
| POST | `/v1/screens` | Create/update a draft (`{ screen, id?, channel?, targeting? }`) |
| POST | `/v1/screens/:id/publish` | Publish a draft to a channel (`{ channel?, version? }`) |

## Tests

```bash
npm test
```

Uses `node:test` against the TypeScript sources.