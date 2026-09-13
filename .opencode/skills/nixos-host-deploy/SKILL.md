---
name: nixos-host-deploy
description: Validate, build, provision, and SSH-deploy NixOS clients (dev, client1, client2, server, client3) with post-deploy diagnostics. Use for host deploys and deploy failures.
---

# NixOS Host Deploy

## Decision matrix (run in order, stop at first red)

| Step | Command | Duration | Gate |
|------|---------|----------|------|
| 1. Fast tests | `.\scripts\01_test.ps1 -Quick` (in `apps/fastfree_os`) | ~15s, 2 tests | must pass |
| 2. Full tests | `.\scripts\01_test.ps1` (Default 5 / `-Full` 15 tests) | minutes | must pass |
| 3. Build | `.\scripts\02_build.ps1 -Client client1` (`nix build`, 7z) | long | artifact exists |
| 4. Provision VM | `.\scripts\05_setup_vm.ps1 -ClientName client1 -VMName FastFree-Client1` (admin) | minutes | VM boots |
| 5. Check VM | `.\scripts\03_check_vm.ps1` (ports 22,3306,443,51820,8081,8082 + podman) | ~1min | all green |
| 6. Deploy VM | `.\scripts\04_deploy.ps1` (`nixos-rebuild switch`) | minutes | switch ok |
| 7. CI validate | `13-validate-os.yaml` (`nix parse/eval/check`, `flake show`) | minutes | green |
| 8. CI clients | `14-build-client1.yaml`, `15-build-client2.yaml` | long | green |
| 9. Deploy server | `gh workflow run 16-deploy-client3.yaml --ref master` | long | green |

`16-deploy-client3` flow: `scp flake.nix/nix/` → `podman pull` SPA images → extract
`/srv/fastfree-*` → `nixos-rebuild switch --flake .#client3` → MySQL Frappe-user fix
(parses `site_config.json` db_name/db_password) → restart → embedded diagnose job.

## Secrets (names only — values live with the human, never in files)

`CLIENT3_IP`, `CLIENT3_ROOT_PASSWORD`, `CLIENT3_DEPLOY_KEY`, per-client
`nix/clients/*.nix` passwords, `FastOS@2026` (7z), backend DB passwords.

## First-aid failures

| Failure | Fix |
|---------|-----|
| `hostinger build=false` | skip the build step (CI auto-detects `deployType`) |
| Secure Boot breaks systemd-boot | turn Secure Boot OFF, TPM ON |
| Avahi `.local` unreachable | Hyper-V only; on WSL use `localhost:8080/8082` |
| MySQL auth fails after rebuild | rerun the Frappe-user fix section of workflow 16 |

## Boundaries

- Container images themselves → skill `web-backend-release` (workflow 16 consumes them).
- App-level (Quasar/Frappe) bugs → respective domain skills, not host deploy.
- `nixos-rebuild switch` on production → explicit human approval first.
