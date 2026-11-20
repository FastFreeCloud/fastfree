# FastFree Clan �?" Project Overview

## What is FastFree Clan?
FastFree Clan is a module of the FastFree ERP that provides **Clan** (Nix-based) infrastructure management.

## Architecture
- **Backend (Dart)** �?" generates clan/*.yaml, 
ix.yaml, lake.nix using the 
ix package.
- **Stac SDUI (Flutter)** �?" renders UI from JSON via Stac.fromNetwork with fallback assets.

## Generated Files (clan/)
| File | Purpose |
|------|---------|
| 
ix.yaml | Nix configuration |
| lake.nix | Nix flake |
| clan.yaml | Clan machines config |
| users.yaml | Users |
| perms.yaml | Permissions |
| 
odes.yaml | Nodes (machines) |
| services.yaml | Services |

## CLI Commands
- dart run bin/cli.dart generate <project-root> �?" generate clan config
- dart run bin/cli.dart audit <project-root> �?" audit YAML

## Packages
- astfree_clan �?" core clan module
- astfree_layout, astfree_hr, astfree_splash �?" other packages

## Links
- Repo: fastfree
- Vault: fastfree/obsidian/fastfree