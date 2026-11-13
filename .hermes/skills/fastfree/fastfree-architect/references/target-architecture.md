# FastFree Target Architecture — one backend, one Tauri client, JSON/SDUI UI

## The target

FastFree is a **single sovereign stack**, not 8 separate apps:

- **One node** (NixOS / Clan 26.05): WireGuard mesh (`clan-core` service), MariaDB/PostgreSQL,
  **one** FastFree backend (Frappe, all modules' data), Caddy reverse proxy + Avahi subdomains.
- **One client** (Tauri → Windows + Android) whose UI is 100% JSON/SDUI.
- **One installer** (Tauri) that provisions the node and installs the client.

`packages/fastfree_*` are **libraries / Quasar app extensions**, not standalone apps. The only full
Quasar app today is `fastfree_panel` (node control panel, port 5173). Modules expose screens as JSON schemas
(`src/schemas/*.json`) or register Vue screens in their own `screens.ts`.

## Lifecycle

| Stage | What happens | Where |
|---|---|---|
| Install | User runs the installer; it discovers/creates the Hyper-V VM | `apps/fastfree_installer` |
| Provision | WireGuard + DB + Frappe backend + Caddy come up | `packages/fastfree_os/flake.nix`, `modules/*` |
| Deploy client | Installer installs the Tauri client on the user machine | installer → client |
| Boot | Client splash → connect to backend over WireGuard | client |
| Render | Client fetches the screen catalog (JSON) and renders via SDUI | `fastfree_sdui` runtime |
| Interact | `SduiAction` → `tauri:invoke` / API → backend | client ↔ backend |
| Update | Screen catalog updates from the backend without rebuilding the client | SDUI cache + ETag |

## Forking clan.lol

`packages/fastfree_os` is already a clan fork:

- `flake.nix` — inputs: `nixpkgs` (nixos-26.05), `disko`, `clan-core` (26.05 tarball)
- `clan.nix` + `inventory.json` — machines + service instances (WireGuard, sshd, users, fastfree-erp)
- `modules/` — NixOS modules: `fastfree_backend.nix`, `fastfree_ledger.nix`, `fastfree_pos.nix`,
  `fastfree_erp.nix`, `fastfree_hr.nix`, `fastfree_panel.nix`, `caddy.nix`, `mariadb.nix`, `dbgate.nix`, ...

To customize:

1. Point `inputs.clan-core.url` at your fork (or keep the official 26.05 tarball).
2. Add your own `clanServices` under `services/<name>/default.nix` and reference them from `inventory.json`
   with `module = { name = "<name>"; input = "self"; }`.
3. Prefer `clanServices` / `inventory.instances` (new) over `clanModules` / `inventory.services` (deprecated).
4. Machines are declared in `inventory.json`; `clan.nix` maps them to profiles and identity.

## Installer vs client

| Installer | Client |
|---|---|
| Provisioning logic (Clan CLI) | SDUI engine (`SduiNode`, `SduiCacheManager`) |
| VM creation + node install | Screen catalog (JSON) |
| Downloads/installs the client | Backend access (API + auth) |
| Mandatory update gate | Themes + i18n (ar/en) |

## Building a screen as JSON/SDUI

Contract: `packages/fastfree_sdui/contract/types.ts`.

- `SduiScreen` = `{ id, title?, root: SduiNode, state?, meta? }`
- `SduiNode` = `{ type, props?, children?, events?, model? }` — `type` is a component key (`QCard`, `QBtn`, `div`, ...)
- `SduiAction` = `{ type: 'tauri:invoke' | 'state:set' | 'notify' | 'navigate', command?, payload? }`

Developer workflow: write the JSON schema → validate against the Zod contract → publish on the backend →
client fetches, caches and renders it. No Vue template is written for module screens.

Example (ledger screen):

```json
{
  "id": "accounting_ledger",
  "title": { "ar": "دفتر الأستاذ", "en": "General Ledger" },
  "root": {
    "type": "QCard",
    "children": [
      { "type": "QInput", "props": { "label": "الحساب", "outlined": true } },
      { "type": "QBtn", "props": { "label": "عرض", "color": "primary" },
        "events": { "click": { "type": "tauri:invoke", "command": "accounting.get_ledger" } } }
    ]
  }
}
```

## Current gaps

- The SDUI delivery server (screen catalog + ETag + publish) is planned, not built.
- The client still launches apps via `openUrl()` (OS browser) instead of rendering SDUI in-app.
- Only 4 packages ship JSON schemas; the rest still register Vue screens.
