# API Surface Report

## lib/src/clan_manager.dart

**class ClanManager** — Orchestrates generation, auditing, listing, and syncing; holds `projectRoot`, `generator` (ClanGenerator), `syncer` (ClanSync), `fileList` (ClanList).

- `ClanManager({String? projectRoot})` — Defaults project root to `Directory.current.path`.
- `Future<void> generate()` — Delegates to `generator.generate()`.
- `Future<Map<String, dynamic>> audit()` — Audits 6 fixed files in `clan/` (omits `flake.nix`); marks missing files `{exists: false, valid: false}`.
- `List<String> list()` — Returns generated clan file names via generator.
- `Future<void> sync(List<String> targets)` — Delegates to `syncer.sync(targets)`.
- `Future<Map<String, dynamic>> run(List<String> targets)` — Generate → audit → optional sync; returns summary map.

Placeholders/TODOs:
- None literal. `fileList` field is constructed but never used.
- Audit file list hardcoded and inconsistent with generator (no `flake.nix`).

## lib/src/generator.dart

**class ClanGenerator** — Writes the Clan file set into `<projectRoot>/clan/`; holds `projectRoot`.

- `ClanGenerator({String? projectRoot})` — Defaults project root to current directory.
- `Future<void> generate([String? root])` — Creates `clan/` and writes 7 files (nix.yaml, flake.nix, clan.yaml, users.yaml, perms.yaml, nodes.yaml, services.yaml); throws if root missing.
- `NixConfig buildNixConfig()` — Builds a hardcoded NixConfig (project `fastfree_clan`, Flutter 3.38.2, linux platform).
- `Future<Map<String, dynamic>> audit([String? root])` — Existence/size/valid checks for the 7 files (no YAML parsing).
- `List<String> listFiles([String? root])` — Lists files in `clan/`; empty list if absent.

Placeholders/TODOs:
- None literal. All generated content is hardcoded template text (no real config input).
- Arabic doc comments on `generate`/`audit`/`listFiles` (mixed-language docs).
- `flake.nix` references `./shell.nix`, which this generator never writes.

## lib/src/audit.dart

**class ClanAudit** — YAML audit for a single file; holds `file`.

- `ClanAudit(this.file)` — Constructor taking the file to audit.
- `Future<Map<String, dynamic>> audit()` — Parses YAML; returns exists/size/valid_yaml/valid plus project/clan/roles presence and project field count; catches `YamlException`.

Placeholders/TODOs:
- None literal. Casts root to `YamlMap` unchecked — non-map YAML throws an unhandled `TypeError`.
- `projects_count` name is misleading (counts keys under `project`).
- `valid` only checks non-empty trimmed content; header comments alone pass.

## lib/src/sync.dart

**class ClanSync** — Copies files from `clan/` into target dirs under the monorepo; holds `projectRoot`.

- `ClanSync(this.projectRoot)` — Constructor with project root.
- `Future<void> sync(List<String> targets)` — Copies every file in `clan/` into each target dir (creates dirs); throws if `clan/` missing.
- `List<String> list()` — Lists file basenames in `clan/`; empty list if absent.

Placeholders/TODOs:
- None literal. Flat copy only — no deletes, conflict checks, or subdirectory handling.
- `list()` duplicates `ClanGenerator.listFiles()` and is not used by ClanManager.
