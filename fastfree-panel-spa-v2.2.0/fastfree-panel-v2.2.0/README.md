# Fastfree Panel + Clan — SPA handoff package v2.2.0

Updated: 2026-10-14. Target: Clan 26.05, Quasar CLI with Vite (`@quasar/app-vite` v3), Flox.

## Required decisions

- **Package name:** `fastfree` (lowercase) in root `package.json`.
- **Frontend:** Quasar SPA, not SSR middleware. Standard scripts are `quasar dev` and `quasar build`; the default production output is `dist/spa`.
- **First screen:** `Machines / الأجهزة`, default route `/machines`. The device list opens first; Overview is secondary.
- **Login UI:** deleted. There is no Login design, Login route, or browser token form. The API must still be protected by server-enforced authorization or a trusted reverse proxy/session.
- **Safety:** begin with Phase 0 inspection; do not replace or modify the user's existing project without reviewing its actual files.

## Contents
| Path | Purpose |
|---|---|
| `package.json` | Requested lowercase package name and SPA command contract; dependency ranges reflect the documented Quasar CLI Vite v3 family. This handoff still lacks the real `src/` and Quasar config, so it is not a complete runnable app. |
| `PLAN.md` | Phases 0–7 with acceptance checks. Execute one phase at a time. |
| `CLAUDE.md` | Agent instructions, required screen order, auth/security and workflow rules. |
| `docs/research.md` | Active research, command reference, screen verification and the approved SPA direction. |
| `docs/spa-architecture.md` | SPA/API separation, routes, deployment and safety checks. |
| `docs/archive/research-v2.1.0-ssr-exploration.md` | Full earlier research archive, including superseded SSR proposals; archive only, do not implement it. |
| `design/` | 17 bilingual screen references and `canvas.json`; Machines appears first. Login mockup removed. |
| `CHANGELOG.md`, `VERSION` | Version and revision history. |

## How to use

1. Extract this archive separately and inspect your actual Fastfree Panel repository first. Do not copy over the live project blindly.
2. Read `CLAUDE.md`, `PLAN.md`, and `docs/spa-architecture.md`; use the research file for supporting context. Treat `docs/archive/` as history only.
3. In Flox, check the existing `package.json`, lockfile, Quasar configuration, Node/pnpm versions, `src/`, backend and Clan version before installing anything. Do not add a second package manager or lockfile without justification.
4. Build the real Quasar app from the existing project, preserving its source files. The manifest in this ZIP records the requested package naming and command direction; because this is a handoff package and has no `src/` or Quasar config, it is not independently runnable yet.
5. Start at Phase 0 and stop for review at each phase acceptance check.

## Current status

This is the updated full design/research/implementation-plan package, not a compiled application. It contains all 17 remaining screen references, removes the Login design, makes Machines first, and records `fastfree` as the lowercase package name. Live device data requires the backend/API phase and verified Clan CLI outputs.
