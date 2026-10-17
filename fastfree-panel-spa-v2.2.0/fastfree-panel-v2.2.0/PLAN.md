# Implementation Plan — fastfree package + Clan (Quasar SPA)

**Target:** Clan 26.05 · Quasar CLI with Vite (`@quasar/app-vite` v3) · Flox environment.
**Architecture decision:** Static Quasar SPA frontend + separate Node.js API backend that invokes the Clan CLI. Do not use Quasar SSR middleware. The browser must never execute `clan`, access `CLAN_DIR`, or receive server secrets.

Legend: [ ] todo, [x] done. Work on ONE phase at a time. At each phase's acceptance checks, stop and report in Egyptian Arabic. Do not mark tasks complete without actual evidence.

## Non-negotiable UI decisions
- Default route and first screen: `/machines` (عرض الأجهزة). The screen must load before Overview.
- Delete the Login page/design; do not add a Login route or token input. Removing the UI does not remove server-side API protection. Use a trusted reverse proxy/session or another approved server-enforced auth method.
- Package name in `package.json`: `fastfree` (lowercase only). Frontend is Quasar SPA; do not configure SSR middleware. Use normal `quasar dev` and `quasar build`, with default output `dist/spa`.

## Phase 0 — Inspect and verify (no application changes)
- [ ] Check `git status --short`, current branch, and tracked files; do not overwrite or delete user files.
- [ ] Inventory the actual project: `package.json`, lockfile, Quasar config, `src/`, existing backend/API, tests, and Flox manifests. The supplied handoff ZIP is design/research material, not proof that the running app source is included.
- [ ] Record `node --version`, `pnpm --version`, `quasar info`, and `clan --version` where available. Do not install or upgrade dependencies automatically.
- [ ] Verify Clan 26.05 read-only commands against the configured repository (`CLAN_DIR`): `clan show`, `clan machines list`, `clan select --help`, `clan network --help`, `clan network list`, `clan network overview`, `clan vars check --help`, `clan backups list --help`, `clan machines generations --help`, `clan secrets --help`.
- [ ] Save real command outputs to `docs/verified-outputs/`; redact hostnames, addresses, usernames, and sensitive paths before committing.
- [ ] Confirm current Quasar app mode and version; determine whether this project can safely build SPA without removing existing modes/features.
- [ ] Review `docs/research.md` and the 17 remaining design screens. Resolve [تحقق] items only by executing safe read-only commands.
- [ ] Check whether `clan-app` already covers any proposed screens and record overlap.

**Acceptance:** a written baseline and verified-outputs exist; no source files or dependencies changed; remaining unknowns are explicitly listed.

## Phase 1 — SPA/API foundation (read-only, local only)
- [ ] Configure Quasar's existing project for SPA mode only if Phase 0 confirms this is compatible; preserve existing app modes and scripts unless a deliberate change is approved.
- [ ] Build the frontend with `quasar build` (expected output: `dist/spa`). Keep API URLs relative, e.g. `/api/v1/...`.
- [ ] Add a separate backend service in a clearly isolated directory (proposed: `backend/`) using the project's supported Node version and existing package manager. Do not add a second lockfile/package manager without justification.
- [ ] Add a small API health endpoint (`GET /api/v1/health`) and a documented API error shape. No Clan commands yet.
- [ ] Development: configure Quasar Vite dev-server proxy for `/api` to the local backend. Production: document same-origin reverse-proxy routing (`/` -> `dist/spa`, `/api` -> backend); do not expose the backend directly to the public internet.
- [ ] Bind both development services to loopback by default (`127.0.0.1`). Configure explicit origins only if cross-origin access is unavoidable.
- [ ] Add startup/build instructions that work inside Flox and document required environment variables without storing values.

**Acceptance:** SPA builds; frontend loads; `/api/v1/health` responds through the dev proxy; no secrets or `CLAN_DIR` appear in built assets; no changes to Clan state.

## Phase 2 — Backend security and verified read-only Clan adapter
- [ ] Protect `/api/v1/*` with server-enforced authentication through the approved reverse proxy/session design. Do not add a Login screen or send secrets from the SPA. If a bootstrap token remains necessary for a local-only deployment, keep validation on the backend and do not bundle the token into client assets.
- [ ] Keep `CLAN_DIR` and all command execution server-side. Validate it is a real expected repository path before invoking Clan.
- [ ] Execute commands only with `execFile`/`spawn` argument arrays; never use a shell, interpolate user input into command strings, or accept arbitrary CLI arguments.
- [ ] Use a fixed allowlist of read-only commands. Validate every machine name against the real machine inventory before using it as an argument.
- [ ] Add bounded execution time, output-size limits, safe error mapping, and concurrency limits. Do not return raw stack traces or unfiltered command output to the browser.
- [ ] Implement only endpoints backed by actual outputs recorded in Phase 0. Start with `GET /api/v1/machines`, `GET /api/v1/global/show`, and `GET /api/v1/health`.
- [ ] Mask secret/variable values on the backend before JSON serialization; do not rely on UI masking.
- [ ] Add a short TTL cache for expensive flake-evaluation reads, with explicit invalidation and no caching of authentication data.

**Acceptance:** valid token gets expected read-only data; invalid token gets 401; arbitrary commands and unknown machine names are rejected; secrets and environment values do not leak; backend is loopback-only by default.

## Phase 3 — Connect SPA shell and read-only screens
- [ ] Use the 17 remaining designs as references; build real Quasar/Vue components, not copied static HTML.
- [ ] Make `/machines` the default route and initial screen. Build Machines first, followed by Overview, Machine Detail, Inventory, Services, Settings, then State, Vars (masked), Backups (list only), Generations, Secrets (metadata only), Access, Network, Monitoring, Build, and Jobs (read-only until job execution is approved). Do not create a Login page or route.
- [ ] Add bilingual English/Arabic labels and RTL handling using the project's existing i18n setup if present; avoid introducing duplicate i18n systems.
- [ ] Add loading, empty, timeout, permission-denied, and unreachable-machine states. Status must not rely on color alone; touch targets should be at least 44px.
- [ ] Add route guards for frontend navigation, while treating backend authentication as the actual security boundary.
- [ ] Keep all API response schemas documented and test them against verified CLI output.

**Acceptance:** all implemented screens display live, correctly parsed data; both languages work; no fake data is presented as live; no state-changing Clan command is reachable from the API.

## Phase 4 — Health, network and reliability
- [ ] Add network views only for commands confirmed by `clan network --help` and real output.
- [ ] Add Vars health based on `clan vars check` only after confirming its exact behavior and safe scope.
- [ ] Add reachable/unreachable states with timestamps and clear stale-data indicators.
- [ ] Test API timeout, malformed CLI output, command failure, empty inventory, and concurrent requests.

**Acceptance:** failures are visible and do not crash the app; stale data is labelled; parsers are covered by tests using redacted fixtures.

## Phase 5 — Controlled operations (requires explicit user approval)
Do not implement or execute mutating operations until the user approves the operation scope and the security review is complete.
- [ ] Threat-model every operation and its authorization. Require server-side permission checks, CSRF protection if cookie auth is used, re-authentication/confirmation for risky actions, and an auditable actor/action/time record.
- [ ] Implement a persistent job store, bounded worker queue, cancellation semantics, and redacted logs before exposing any operation UI.
- [ ] Only after approval, consider `clan machines update` with explicit machine selection and host-key verification, `clan machines build --dry-run`, `clan backups create`, and `clan vars fix` as separate opt-in capabilities.
- [ ] Require preview/dry-run where supported, show the exact target and effect, and ask for explicit confirmation before queueing the job.
- [ ] Keep dangerous or secret-revealing commands permanently excluded: machine install/delete/create, hardware config mutation, flash writes, backup restore, vars get/set, secret get/set/remove, templates apply, and `update --no-check`.

**Acceptance:** no operation can be started without authorization and explicit confirmation; dry-run and failure paths are tested; logs redact secrets; no prohibited command is present.

## Phase 6 — Production hardening and delivery
- [ ] Add rate limiting, security headers, strict request validation, dependency audit, and an operator-focused deployment guide.
- [ ] Document TLS/reverse proxy, firewalling, token rotation, backups of application metadata, and service supervision. Do not expose a raw bearer-token API over public HTTP.
- [ ] Add unit tests for parsers/API auth and smoke tests for SPA build and API health; run lint/tests/build using the existing package manager.
- [ ] Review Flox environment reproducibility; pin only versions justified by the project's current manifests and compatibility tests.
- [ ] Document how to package the frontend and backend together operationally. A Quasar App Extension is optional and must not block the working panel.

**Acceptance:** clean build and tests pass; documented deployment serves SPA and API on one origin; security checklist is complete; changes are summarized for review.

## Phase 7 — Future API/SDK migration
- [ ] Monitor official Clan 26.05+ documentation for a supported stable API/SDK.
- [ ] If one becomes available, replace only the backend Clan adapter while preserving the `/api/v1` contract and SPA.

**Workflow rule:** finish one phase, show evidence and files changed, list unresolved issues, then stop and wait for the user's instruction before continuing.
