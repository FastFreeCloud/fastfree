# FastFree Clan �?" Journey, Goal & Lifecycle

## Goal (ا�"�?دف)
Provide **Clan** (Nix-based) infrastructure management for the FastFree ERP:
- **Backend (Dart)** generates clan/*.yaml, 
ix.yaml, lake.nix using the 
ix package.
- **Stac SDUI (Flutter)** renders UI from JSON via Stac.fromNetwork with fallback assets.

## Journey (ا�"�.رتح�")
1. **Generate** �?" ClanManager.generate() creates all clan files in <project-root>/clan/.
2. **Audit** �?" ClanManager.audit() validates each YAML file (
ix.yaml, clan.yaml, users.yaml, perms.yaml, 
odes.yaml, services.yaml).
3. **List** �?" ClanManager.list() enumerates generated files.
4. **Sync** �?" ClanManager.sync(targets) copies clan files to target directories.
5. **Run** �?" ClanManager.run(targets) = generate + audit + sync (full workflow).

## Lifecycle (د�^رة ا�"ح�Sاة)
`
generate() �?' audit() �?' sync(targets) �?' run(targets)
     �",           �",          �",            �",
     �-�           �-�          �-�            �-�
  clan/*.yaml  valid?   copy to      full workflow
  created      check    targets
`

## Key Classes
- ClanManager �?" orchestrates generate/audit/sync/run.
- ClanGenerator �?" writes YAML + flake.nix.
- ClanAudit �?" validates YAML syntax/structure.
- ClanSync �?" syncs to target dirs.
- ClanList �?" lists generated files.
- ClanNixConfig �?" parses nix.yaml (project, flutter, platforms, profiles, clan, cluster, roles).
- ClanFlowController �?" ChangeNotifier for UI state.

## Packages
- astfree_clan �?" core clan module
- astfree_layout, astfree_hr, astfree_splash �?" dependent packages

## CLI
- dart run bin/cli.dart generate <project-root>
- dart run bin/cli.dart audit <project-root>

## Links
- Repo: fastfree
- Vault: fastfree/obsidian/fastfree