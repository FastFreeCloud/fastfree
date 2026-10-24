---
description: Validate Clan and Nix Flake configuration
---

# Validate Clan 26.05 Fleet Configuration

Run this command inside a Nix-enabled terminal or remote runner to validate the flake:

```bash
# Parse syntax
nix-instantiate --parse flake.nix apps/fastfree_os/clan.nix

# Check Flake outputs without building
nix flake check --no-build
```
