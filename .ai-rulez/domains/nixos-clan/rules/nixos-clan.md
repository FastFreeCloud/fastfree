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
- **Fleet Topology**: `client1` is the single central public VPS. `client2` through `client11` are customer Hyper-V appliances.
- **Profiles**: Shared system configurations must be in `profiles/base.nix`, `profiles/vps.nix`, or `profiles/hyperv.nix`. Keep `machines/<name>/configuration.nix` minimal.
- **Clan Services**: Official Clan services (`wireguard`, `sshd`, `users`, `internet`) must be declared under `inventory.instances` with `module.input = "clan-core"`.
- **WireGuard**: Each client machine (`client2..11`) gets an isolated WireGuard instance (`client${n}-network`) on a distinct UDP port (`51820 + n`), connecting to controller `client1`.
- **Secrets Management**: Never embed plaintext passwords in Nix expressions. Use Clan Vars (`clan vars generate <machine>`).
