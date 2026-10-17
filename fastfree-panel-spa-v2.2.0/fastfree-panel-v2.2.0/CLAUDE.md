# Project: Fastfree Panel + Clan (Quasar SPA)

A web control panel for machines managed by Clan (clan-core 26.05), package name `fastfree` (lowercase) in `package.json`, with a Quasar CLI (Vite, @quasar/app-vite v3) SPA frontend and a separate Node.js API backend that wraps the `clan` CLI. The default route and initial screen are `/machines` (Machines / الأجهزة). The Login page has been deleted and must not be recreated. Do not use SSR middleware for the API. The backend must remain private and the browser must never execute Clan or receive server secrets. Verify the current Clan API/SDK status against official docs before asserting that none exists.

## Sources of truth (read before working)
- `docs/research.md`: verified findings, command reference, architecture, security rules. Items marked **[تحقق]** are UNVERIFIED.
- `PLAN.md`: the phases. Work on ONE phase at a time.
- `design/`: visual reference for the 17 screens (Machines first; no Login screen) (see `design/README.md`).
- Official docs: https://clan.lol/docs/26.05 and https://quasar.dev

## How to work
1. Read `PLAN.md`, find the first phase with unchecked tasks, and do only that phase.
2. Tick tasks in `PLAN.md` as you finish them. At the end of the phase, run the acceptance checks, then STOP and report. Do not start the next phase until the user says so.
3. Never guess the output of a `clan` command. Anything marked [تحقق]: run the command (read-only ones only), save the real output under `docs/verified-outputs/<command>.txt`, and write the parser from that file.
4. If the docs and reality disagree, tell the user and update `docs/research.md`. Do not silently pick one.
5. Small commits, one concern each. Run lint and the dev build before every commit.
6. Reply to the user in Egyptian Arabic. Code, comments and commit messages in English.

## Hard safety rules (do not relax)
- Backend runs `clan` only via `execFile`/`spawn` with an argument array. Never a shell, never string concatenation.
- Commands come from a fixed allowlist in code. User input may only be a machine name, and it must be validated against the real machine list (`clan select`) before use.
- NEVER expose or implement: `machines install`, `machines delete`, `machines create`, `machines update-hardware-config`, `machines init-hardware-config`, `flash write`, `backups restore`, `vars get`, `vars set`, `secrets get/set/remove`, `templates apply`, `update --no-check`.
- Secrets are always masked in API responses and UI.
- Operations that change state (update, backups create, vars fix) require an explicit confirmation step in the UI and run as background jobs with a log.
- `machines update` and `machines generations` need `--host-key-check tofu` because the default `ask` can hang. Confirm `tofu` is accepted before relying on it.
- Bind the backend to 127.0.0.1 by default. Auth must be server-enforced; a bootstrap bearer token may come from `CLAN_PANEL_TOKEN` (constant-time compare) but is not by itself a complete production multi-user security model. Never hardcode it, bundle it into the SPA, or commit it.
- Do not run any state-changing `clan` command yourself while developing. Ask the user first.

## Environment
- `clan` must be in PATH (Flox/Nix environment). `CLAN_DIR` points to the Clan repository and is backend-only.
- Frontend: `quasar dev` and `quasar build` in SPA mode, after confirming the existing Quasar configuration and installed version. Default output is `dist/spa` unless configured otherwise.
- Backend: a separate Node.js process (proposed location `backend/`), bound to `127.0.0.1` by default. The Quasar dev server proxies `/api` to it; production reverse proxy serves the SPA and forwards `/api` to the private backend.
- Do not add SSR middleware or put backend secrets in `VITE_*` variables/client bundles. See `docs/spa-architecture.md`.

## UI rules
- Start at `/machines` and show the device list first; Overview is secondary.
- Do not create a Login view, route, or token-input form. Keep API authorization enforced server-side or by a trusted reverse proxy/session.
- The package name must remain exactly `fastfree` in lowercase.
- Every label is bilingual: English first, Arabic beside it (`dir="rtl"` on the Arabic text). Use vue-i18n and keep keys for both.
- Follow the layout and wording of `design/`. Use Quasar components, not copied HTML.
- Status is never color only. Touch targets at least 44px.
