# Fastfree Clan Panel — private API backend

Private Node/Hono API that wraps the `clan` CLI (ClanOS, clan-core 26.05).
The Quasar SPA never executes Clan and never receives server secrets; every
privileged call goes through this process.

> **Loopback only.** This backend must never be exposed publicly. It binds to
> `127.0.0.1` by default and is designed to sit behind a trusted reverse proxy
> that serves the SPA on `/` and forwards `/api/` to it. Do not open this port
> to a network, do not put it behind a public hostname, and do not weaken the
> bearer-token check to "make it reachable".

## Run (inside the Flox environment — `clan` is only on PATH there)

```bash
CLAN_DIR=/home/fastfree/Desktop/fastfree/apps/fastfree_os \
  pnpm -C /home/fastfree/Desktop/fastfree/apps/fastfree_panel/backend run dev
```

Other scripts: `run build` (tsc → `dist/`), `run start` (node `dist/server.js`),
`run typecheck`.

## Endpoints (all under `/api/v1`)

| Method | Path           | Clan command        | Returns                        |
| ------ | -------------- | ------------------- | ------------------------------ |
| GET    | `/health`      | none                | process health (booleans only) |
| GET    | `/machines`    | `clan machines list` | `{ machines: MachineSummary[] }` |
| GET    | `/global/show` | `clan show`         | `{ name, description, domain }` |

Success envelope: `{ "data": ... }`. Errors: `{ "error": { "code", "message" } }`
with stable codes — `NOT_CONFIGURED`, `TIMEOUT`, `UPSTREAM_ERROR`,
`VALIDATION_ERROR`, `FORBIDDEN`, `INTERNAL`. **Raw stderr, stack traces and
filesystem paths never appear in a response.**

## Environment variables

| Variable                        | Default     | Meaning                                        |
| ------------------------------- | ----------- | ---------------------------------------------- |
| `CLAN_DIR`                      | _unset_     | Clan repository root. Unset ⇒ `NOT_CONFIGURED`. |
| `CLAN_PANEL_API_HOST`           | `127.0.0.1` | Bind address. Changing it needs a real review. |
| `CLAN_PANEL_API_PORT`           | `9099`      | Bind port.                                     |
| `CLAN_PANEL_TOKEN`              | _unset_     | Bootstrap bearer token. Never log or echo it.  |
| `CLAN_PANEL_COMMAND_TIMEOUT_MS` | `20000`     | Per-command wall-clock limit.                  |
| `CLAN_PANEL_MAX_OUTPUT_BYTES`   | `1048576`   | Output cap per command; exceeding kills it.    |
| `CLAN_PANEL_MAX_CONCURRENCY`    | `4`         | Simultaneous `clan` commands.                  |
| `CLAN_PANEL_API_NO_AUTOSTART`   | _unset_     | `1` disables the built-in `serve()` (tests).   |

A bootstrap token alone is **not** a complete production multi-user security
model; use a reviewed session design plus a reverse proxy in production.

## Command allowlist (`src/clan/allowlist.ts`)

Fixed argv templates, frozen. `assertAllowed()` must pass before any spawn:

| Id                     | argv                          |
| ---------------------- | ----------------------------- |
| `machines.list`        | `machines list`               |
| `global.show`          | `show`                        |
| `network.overview`     | `network overview`            |
| `network.list`         | `network list`                |
| `secrets.groups.list`  | `secrets groups list`         |

### Denylisted forever (`DENYLIST`)

`machines install`, `machines delete`, `machines create`,
`machines update-hardware-config`, `machines init-hardware-config`,
`flash write`, `backups restore`, `vars get`, `vars set`, `secrets get`,
`secrets set`, `secrets remove`, `templates apply`, `update --no-check`.

Each entry is matched as an argv **prefix**, so trailing arguments cannot
smuggle a forbidden command through. `secrets groups list` is the only secrets
command exposed and it returns group **names** only.

### Verified deviations from the original plan

- **`clan global show` does not exist in clan-core 26.05.** The meta command is
  the top-level `clan show`.
- **`clan services list` does not exist** — 26.05 has no `services` subcommand.
  It is intentionally not in the allowlist.
- **`clan` has no `--json` flag** (`clan machines list --json` →
  `unrecognized arguments`), so `src/clan/parse.ts` parses the real text output.

## Execution rules (`src/clan/exec.ts`)

- `execFile` with an argv array. Never `exec`, never a shell, never a string.
- Allowlist assertion before every spawn.
- Timeout, output cap and concurrency cap always applied.
- `validateMachineName` enforces `/^[a-z0-9][a-z0-9-]{0,62}$/i` — the only value
  a caller may ever contribute.