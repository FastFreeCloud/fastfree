---
name: web-backend-release
description: Ship Nix SPA images, the Frappe backend image, and bench scaffolds to GHCR with auto-tags and releases. Use for image builds, release cuts, and release failures.
---

# Web & Backend Release

## Common pipeline (parameterized per image)

```
pnpm lint + vue-tsc  →  nix build .#frontendImage -o frontend-image
→ ./frontend-image > frontend-image.tar
→ skopeo copy docker-archive:frontend-image.tar docker://ghcr.io/fastfreecloud/<IMAGE>:latest
→ skopeo copy ... :sha-<short>
→ auto-tag (<prefix>-v1.0.N) → GitHub Release
```

| Image | Workflow | Tag prefix | Registry path |
|-------|----------|------------|---------------|
| pos/erp/hr/ledger SPA | `02/03/04/05-build-*.yaml` | `pos/erp/hr/ledger-v*` | `ghcr.io/fastfreecloud/fastfree_<app>` |
| website | `06-build-website.yaml` | `website-v*` | `ghcr.io/fastfreecloud/fastfree_website` |
| backend (Frappe) | `07-build-backend.yaml` | `v1.0.*` | GHCR backend image |

Manual equivalent (per app dir):

```powershell
Push-Location apps/fastfree_pos
nix build .#frontendImage -o frontend-image --print-build-logs
./frontend-image > frontend-image.tar
skopeo copy docker-archive:frontend-image.tar docker://ghcr.io/fastfreecloud/fastfree_pos:latest
Pop-Location
```

## Auth & env (no PATs)

- `GITHUB_TOKEN` only (`packages:write`, `contents:write`).
- Backend: `FRAPPE_VERSION=version-15`, `REGISTRY=ghcr.io` (see `07-build-backend.yaml`).
- Bench scaffolding (`bench new-app`, `08-create-frappe-app.yaml`) is one-off — run
  manually per `apps/fastfree_backend/README.md`, not via this skill.

## First-aid failures

| Failure | Fix |
|---------|-----|
| pnpm cache poison | `pnpm store prune`, reinstall |
| `skopeo apt-get` breaks on Chrome list | `rm -f ...google-chrome.list`, retry |
| `actionlint` syntax fail (backend) | fix YAML, rerun workflow |
| GHCR package invisible | check package visibility settings (human) |

## Boundaries

- Host provisioning/OS deploys → skill `nixos-host-deploy` (it consumes these images).
- Android AAB/APK artifacts → skill `android-build-release` (separate pipeline).
- Frappe app code changes → backend README + domain review, then rebuild here.
