import 'dart:io';

import 'package:fastfree_clan/fastfree_clan.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Directory tempDir;

  setUp(() {
    tempDir = Directory.systemTemp.createTempSync('fastfree_clan_test_');
  });

  tearDown(() {
    if (tempDir.existsSync()) {
      tempDir.deleteSync(recursive: true);
    }
  });

  group('ClanGenerator', () {
    test('generates all clan files into <root>/clan', () async {
      final generator = ClanGenerator(projectRoot: tempDir.path);
      await generator.generate();

      final clanDir = Directory('${tempDir.path}/clan');
      expect(clanDir.existsSync(), isTrue);

      for (final name in [
        'nix.yaml',
        'flake.nix',
        'clan.yaml',
        'users.yaml',
        'perms.yaml',
        'nodes.yaml',
        'services.yaml',
      ]) {
        expect(File('${clanDir.path}/$name').existsSync(), isTrue,
            reason: '$name should exist');
      }
    });

    test('nix.yaml uses the nix library schema', () async {
      final generator = ClanGenerator(projectRoot: tempDir.path);
      await generator.generate();

      final nixYaml = File('${tempDir.path}/clan/nix.yaml').readAsStringSync();
      expect(nixYaml, contains('project:'));
      expect(nixYaml, contains('flutter:'));
      expect(nixYaml, contains('nix:'));
      expect(nixYaml, contains('platforms:'));
    });

    test('audit reports every generated file as valid', () async {
      final generator = ClanGenerator(projectRoot: tempDir.path);
      await generator.generate();

      final results = await generator.audit();
      expect(results.keys.length, 7);
      for (final entry in results.entries) {
        final map = entry.value as Map<String, dynamic>;
        expect(map['valid'], isTrue, reason: '${entry.key} should be valid');
      }
    });

    test('listFiles returns generated file names', () async {
      final generator = ClanGenerator(projectRoot: tempDir.path);
      await generator.generate();

      final files = generator.listFiles();
      expect(files, contains('clan.yaml'));
      expect(files, contains('nix.yaml'));
    });

    test('throws when project root does not exist', () async {
      final generator =
          ClanGenerator(projectRoot: '${tempDir.path}/does-not-exist');
      expect(() => generator.generate(), throwsA(isA<FileSystemException>()));
    });
  });

  group('ClanAudit', () {
    test('flags a missing file as invalid', () async {
      final audit = ClanAudit(File('${tempDir.path}/missing.yaml'));
      final result = await audit.audit();
      expect(result['exists'], isFalse);
      expect(result['valid'], isFalse);
    });

    test('flags invalid YAML as invalid', () async {
      final file = File('${tempDir.path}/broken.yaml');
      file.writeAsStringSync('{{{ not yaml');
      final audit = ClanAudit(file);
      final result = await audit.audit();
      expect(result['valid_yaml'], isFalse);
    });

    test('detects clan and roles keys', () async {
      final file = File('${tempDir.path}/clan.yaml');
      file.writeAsStringSync('clan:\n  name: test\nroles:\n  admin: [read]\n');
      final audit = ClanAudit(file);
      final result = await audit.audit();
      expect(result['has_clan'], isTrue);
      expect(result['has_roles'], isTrue);
      expect(result['has_project'], isFalse);
    });
  });

  group('ClanConfig', () {
    test('parses nodes, users, services and roles', () {
      final config = ClanConfig.fromJson({
        'clan': {'name': 'test', 'cluster_id': 'c1', 'leader': 'root'},
        'nodes': [
          {'name': 'n1', 'type': 'local', 'roles': ['admin'], 'services': ['api']}
        ],
        'users': [
          {'name': 'admin', 'role': 'admin', 'active': true}
        ],
        'services': [
          {'name': 'api', 'port': 8080, 'type': 'http'}
        ],
        'roles': {
          'admin': ['clan:read', 'clan:write']
        },
      });

      expect(config.clanName, 'test');
      expect(config.clusterId, 'c1');
      expect(config.leader, 'root');
      expect(config.nodes.single.name, 'n1');
      expect(config.users.single.role, 'admin');
      expect(config.services.single.port, 8080);
      expect(config.roles['admin'], contains('clan:read'));
    });

    test('round-trips through toJson', () {
      const config = ClanConfig(
        clanName: 'round',
        nodes: [ClanNode(name: 'n1')],
        users: [ClanUser(name: 'u1')],
      );
      final json = config.toJson();
      final restored = ClanConfig.fromJson(json);
      expect(restored.clanName, 'round');
      expect(restored.nodes.single.name, 'n1');
      expect(restored.users.single.name, 'u1');
    });
  });

  group('ClanManager', () {
    test('run() generates, audits and syncs', () async {
      final manager = ClanManager(projectRoot: tempDir.path);
      final result = await manager.run(['packages/fastfree_clan/example']);

      expect(result['generated'], isTrue);
      final audit = result['audit'] as Map<String, dynamic>;
      expect(audit.keys.length, 7);
      expect(result['synced_to'], contains('packages/fastfree_clan/example'));

      final synced = File(
          '${tempDir.path}/packages/fastfree_clan/example/clan.yaml');
      expect(synced.existsSync(), isTrue);
    });
  });

  group('nix library schema', () {
    test('NixConfig exposes platforms and flake ref', () {
      final generator = ClanGenerator(projectRoot: tempDir.path);
      final config = generator.buildNixConfig();

      expect(config.projectName, 'fastfree_clan');
      expect(config.flutter.version, '3.38.2');
      expect(config.flakePath, 'nix');
      expect(config.platformNames, contains('linux'));
      expect(config.flakeRef, './nix');
      expect(config.platformFor('linux')?.buildCommand,
          'flutter build linux --release');
    });
  });
}
