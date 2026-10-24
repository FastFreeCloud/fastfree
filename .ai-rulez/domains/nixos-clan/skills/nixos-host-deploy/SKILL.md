---
name: nixos-host-deploy
description: Validate, build, provision, and SSH-deploy NixOS clients (client1 Hyper-V, client2 VPS, client3 local) with post-deploy diagnostics. Use for host deploys and deploy failures.
---

# NixOS Host Deploy

## Decision matrix (run in order, stop at first red)

| Step | Command | Duration | Gate |
|------|---------|----------|------|
| 1. Syntax | `nix-instantiate --parse flake.nix clan.nix machines/*/configuration.nix` (in `apps/fastfree_os`) | seconds | must pass |
| 2. Evaluate | `nix eval .#clan.inventory.machines.clientX` | ~1min | must pass |
| 3. Build (hyperv) | `nix build .#packages.x86_64-linux.client1` (7z) | long | artifact exists |
| 4. Provision VM | Hyper-V Manager: Gen 2 VM, Secure Boot OFF, attach VHDX | minutes | VM boots |
| 5. Deploy VPS | `gh workflow run 10-client2.yaml --ref master` | long | green |
| 6. Switch local | `sudo nixos-rebuild switch --flake .#client3` (on the machine) | minutes | switch ok |
| 7. CI validate | `09-client1.yaml`, `10-client2.yaml` (validate: `nix parse` + `eval`) | minutes | green |

`10-client2` flow: `scp flake.nix/lock/clan.nix/options.nix/cli.sh/machines/modules/` → `podman pull` SPA images → extract
`/srv/fastfree-*` → `nixos-rebuild switch --flake .#client2` → MySQL Frappe-user fix
(parses `site_config.json` db_name/db_password) → restart → embedded diagnose job.

## Secrets (names only — values live with the human, never in files)

`CLIENT2_IP`, `CLIENT2_ROOT_PASSWORD`, `CLIENT2_DEPLOY_KEY`, per-client
`machines/*/configuration.nix` (+ `clan vars` secrets), `FastOS@2026` (7z), backend DB passwords.

## First-aid failures

| Failure | Fix |
|---------|-----|
| `vps`/`local` build=false | skip the build step (only `hyperv` with `build=true` builds) |
| Secure Boot breaks boot | turn Secure Boot OFF for Hyper-V Gen 2 VMs |
| Avahi `.local` unreachable | check firewall + `avahi-daemon.service`; Hyper-V uses `.local`, VPS uses public domains |
| MySQL auth fails after rebuild | rerun the Frappe-user fix section of workflow 10-client2 |

## Boundaries

- Container images themselves → skill `web-backend-release` (workflow 10-client2 consumes them).
- App-level (Quasar/Frappe) bugs → respective domain skills, not host deploy.
- `nixos-rebuild switch` on production → explicit human approval first.
