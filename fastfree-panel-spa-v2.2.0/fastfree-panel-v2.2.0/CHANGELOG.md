# Changelog

## 2.2.0 (2026-10-14)
- Made `Machines / الأجهزة` the first/landing screen and set `/machines` as the required default route.
- Deleted `design/Login.dc.html`, removed Login from the canvas and updated the design count from 18 to 17.
- Set root package name to exactly `fastfree` (lowercase) in `package.json`.
- Confirmed the target architecture as Quasar SPA plus a separate private Node.js API; no SSR middleware.
- Clarified that deleting the Login UI does not remove server-side API authorization.
- Updated the active plan and design/agent docs; archived the prior SSR exploration as historical-only material to avoid losing previous research.

## 2.1.0 (2026-10-14)
- Updated the implementation plan for a Quasar SPA frontend with a separate private Node.js API backend.
- Added `docs/spa-architecture.md` covering development proxy, production routing, command execution, authentication, and security checks.
- Updated agent instructions and README to avoid SSR middleware and preserve the existing Fastfree Panel repository.

## 2.0.0 (2026-10-09)
- 18 bilingual screen references. 10 new: Inventory, Services, Build, Generations, State, Vars health, Secrets, Access, Monitoring, Settings.
- Added the full research file, agent instructions, and phase-based implementation plan.

## 1.0.0 (2026-10-08)
- First research file and 8 English screens.
