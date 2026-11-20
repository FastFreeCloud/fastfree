# FastFree Clan — Journey, Goal & Lifecycle

## Goal
Provide Clan (Nix-based) infrastructure management for FastFree ERP.

## Journey
1. Generate — ClanManager.generate() creates clan/*.yaml
2. Audit — ClanManager.audit() validates YAML files
3. List — ClanManager.list() enumerates files
4. Sync — ClanManager.sync(targets) copies to targets
5. Run — ClanManager.run(targets) = generate + audit + sync

## Lifecycle
generate() → audit() → sync(targets) → run(targets)

## Key Classes
- ClanManager, ClanGenerator, ClanAudit, ClanSync, ClanList
- ClanNixConfig, ClanFlowController

## CLI
- dart run bin/cli.dart generate <project-root>
- dart run bin/cli.dart audit <project-root>
