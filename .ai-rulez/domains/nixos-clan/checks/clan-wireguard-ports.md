---
description: Ensure client WireGuard networks use unique ports 51820 + n
severity: critical
targets:
  - antigravity
  - opencode
  - claude
---

# Clan WireGuard Port Allocation Check

When reviewing NixOS Clan configurations in `apps/fastfree_os` and `clan.nix`:
- Verify that each client appliance (`client2` through `client11`) connects to `client1` using a dedicated WireGuard port calculated as `51820 + n` (e.g. `client2` -> port 51822, `client3` -> port 51823).
- Multiple WireGuard instances sharing a single UDP port on the `client1` controller will cause systemd socket bind failures.
