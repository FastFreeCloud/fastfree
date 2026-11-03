---
title: FastFree OS and Clan 26.05 Architecture
priority: critical
paths:
  - "apps/fastfree_os/**"
  - "flake.nix"
  - "clan.nix"
activation: glob
---

# FastFree OS & Clan 26.05 Standards

When working on `apps/fastfree_os`:
- **Fleet Topology**: All 11 nodes (`client1` through `client11`) are sovereign Hyper-V appliances. `client1` serves as the central mesh controller appliance (with port forwarding UDP 51820 on router/Windows Firewall).
- **Profiles**: Shared system configurations must be in `profiles/base.nix` or `profiles/hyperv.nix`. Keep `machines/<name>/configuration.nix` minimal.
- **Clan Services**: Core Clan services (`wireguard`, `sshd`, `users`, `internet`) must be declared under `inventory.instances` with `module.input = "clan-core"`. Custom services (e.g. `fastfree-erp`) must use `_class = "clan.service"` and be instantiated under `inventory.instances`.
- **WireGuard**: Nodes connect to controller `client1` on UDP port `51820`. Each peer node (`client2..11`) gets an isolated WireGuard instance (`client${n}-network`) on a distinct UDP port (`51820 + n`).
- **Secrets Management**: Never embed plaintext passwords in Nix expressions. Use Clan Vars (`clan vars generate <machine>`).
