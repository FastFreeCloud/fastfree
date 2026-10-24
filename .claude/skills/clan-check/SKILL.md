---
description: Validate Clan and Nix Flake configuration
name: clan-check
user-invocable: true
# Content-Hash: blake3:6bca4303f67d88ea594c190de67e8c3cf09afb63cf6e61082334120d559b774e
---

# Validate Clan 26.05 Fleet Configuration

Run this command inside a Nix-enabled terminal or remote runner to validate the flake:

```bash
# Parse syntax
nix-instantiate --parse flake.nix apps/fastfree_os/clan.nix

# Check Flake outputs without building
nix flake check --no-build
```
