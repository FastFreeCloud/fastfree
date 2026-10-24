---
description: Validate Clan and Nix Flake configuration
# Content-Hash: blake3:7eb3200e7b8e26a3b6ae22e2f9cc5dcd5be8e4cf68c0eaa1672149471038a28e
---

Run this command inside a Nix-enabled terminal or remote runner to validate the flake:

```bash
# Parse syntax
nix-instantiate --parse flake.nix apps/fastfree_os/clan.nix

# Check Flake outputs without building
nix flake check --no-build
```
