import 'dart:io';

import 'package:args/command_runner.dart';
import 'package:fastfree_clan/src/clan_manager.dart';

/// `fastfree_clan generate` — generate clan files from the nix schema.
class GenerateCommand extends Command<int> {
  @override
  final String name = 'generate';

  @override
  final String description = 'Generate clan/*.yaml + nix.yaml + flake.nix';

  @override
  final String invocation = 'fastfree_clan generate [project root]';

  @override
  Future<int> run() async {
    final root = argResults!.rest.isNotEmpty
        ? argResults!.rest.first
        : Directory.current.path;
    final manager = ClanManager(projectRoot: root);
    await manager.generate();
    return 0;
  }
}

/// `fastfree_clan audit` — verify generated clan files.
class AuditCommand extends Command<int> {
  @override
  final String name = 'audit';

  @override
  final String description = 'Audit generated clan files for correctness';

  @override
  final String invocation = 'fastfree_clan audit [project root]';

  @override
  Future<int> run() async {
    final root = argResults!.rest.isNotEmpty
        ? argResults!.rest.first
        : Directory.current.path;
    final manager = ClanManager(projectRoot: root);
    final results = await manager.audit();

    if (results.isEmpty) {
      stderr.writeln('✗ No clan files found in $root/clan');
      return 1;
    }

    var allValid = true;
    results.forEach((name, value) {
      final map = value as Map<String, dynamic>;
      final ok = map['valid'] == true;
      if (!ok) allValid = false;
      stdout.writeln('  ${ok ? '✓' : '✗'} $name');
    });
    return allValid ? 0 : 1;
  }
}

/// `fastfree_clan list` — list generated clan files.
class ListCommand extends Command<int> {
  @override
  final String name = 'list';

  @override
  final String description = 'List generated clan files';

  @override
  final String invocation = 'fastfree_clan list [project root]';

  @override
  Future<int> run() async {
    final root = argResults!.rest.isNotEmpty
        ? argResults!.rest.first
        : Directory.current.path;
    final manager = ClanManager(projectRoot: root);
    final files = manager.list();
    if (files.isEmpty) {
      stdout.writeln('(no clan files)');
      return 0;
    }
    for (final file in files) {
      stdout.writeln(file);
    }
    return 0;
  }
}

/// `fastfree_clan sync <target...>` — copy clan files into target dirs.
class SyncCommand extends Command<int> {
  @override
  final String name = 'sync';

  @override
  final String description = 'Copy clan files into target directories';

  @override
  final String invocation = 'fastfree_clan sync <target dir> [target dir...]';

  @override
  Future<int> run() async {
    final targets = argResults!.rest;
    if (targets.isEmpty) {
      stderr.writeln('usage: fastfree_clan sync <target dir> [target dir...]');
      return 64;
    }
    final manager = ClanManager();
    await manager.sync(targets);
    stdout.writeln('✓ Synced clan files to: ${targets.join(', ')}');
    return 0;
  }
}

/// `fastfree_clan run <target...>` — generate + audit + sync.
class RunCommand extends Command<int> {
  @override
  final String name = 'run';

  @override
  final String description = 'Generate, audit, and sync clan files';

  @override
  final String invocation = 'fastfree_clan run [target dir...]';

  @override
  Future<int> run() async {
    final root = argResults!['root'] as String? ?? Directory.current.path;
    final targets = argResults!.rest;
    final manager = ClanManager(projectRoot: root);
    final result = await manager.run(targets);

    final audit = result['audit'] as Map<String, dynamic>;
    var allValid = true;
    audit.forEach((name, value) {
      final map = value as Map<String, dynamic>;
      if (map['valid'] != true) allValid = false;
    });
    stdout.writeln(allValid
        ? '✓ Full workflow completed (all files valid)'
        : '✗ Full workflow completed with invalid files');
    return allValid ? 0 : 1;
  }
}

/// FastFree Clan CLI.
class FastFreeClanCLI extends CommandRunner<int> {
  FastFreeClanCLI()
      : super('fastfree_clan',
            'FastFree Clan — generate/configure/audit Clan files (nix library).') {
    argParser.addOption(
      'root',
      help: 'Project root (defaults to the current directory)',
    );
    addCommand(GenerateCommand());
    addCommand(AuditCommand());
    addCommand(ListCommand());
    addCommand(SyncCommand());
    addCommand(RunCommand());
  }
}

Future<int> main(List<String> args) async {
  try {
    final cli = FastFreeClanCLI();
    final result = await cli.run(args);
    return result ?? 0;
  } catch (e, stack) {
    stderr.writeln('Error: $e');
    if (args.contains('--verbose')) stderr.writeln(stack);
    return 1;
  }
}
