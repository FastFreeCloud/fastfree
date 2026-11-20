import 'dart:io';

import 'generator.dart';
import 'sync.dart';

/// Main manager for FastFree Clan.
///
/// Combines generation, configuration, synchronization, and auditing
/// of Clan files using the official `nix` library schema.
class ClanManager {
  final String projectRoot;
  late final ClanGenerator generator;
  late final ClanSync syncer;

  ClanManager({String? projectRoot})
      : projectRoot = projectRoot ?? Directory.current.path {
    generator = ClanGenerator(projectRoot: this.projectRoot);
    syncer = ClanSync(this.projectRoot);
  }

  /// Generate all clan files in the project root
  Future<void> generate() => generator.generate();

  /// Run audit on generated files (delegated to [ClanGenerator.audit]).
  Future<Map<String, dynamic>> audit() => generator.audit();

  /// List clan files
  List<String> list() => generator.listFiles();

  /// Sync clan files to target directories
  Future<void> sync(List<String> targets) => syncer.sync(targets);

  /// Full workflow: generate → audit → sync
  Future<Map<String, dynamic>> run(List<String> targets) async {
    await generate();
    final auditResults = await audit();
    if (targets.isNotEmpty) {
      await sync(targets);
    }
    return {
      'generated': true,
      'audit': auditResults,
      'synced_to': targets,
    };
  }
}
