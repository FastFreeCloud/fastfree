import 'dart:io';

import 'package:yaml/yaml.dart';

/// Audit/verify Clan files after generation.
class ClanAudit {
  final File file;

  ClanAudit(this.file);

  /// فحص ملف YAML (المثالي: nix.yaml أو clan.yaml)
  Future<Map<String, dynamic>> audit() async {
    if (!file.existsSync()) {
      return {'exists': false, 'valid': false};
    }
    final content = await file.readAsString();
    try {
      final yaml = loadYaml(content);
      if (yaml is! YamlMap) {
        return {
          'exists': true,
          'size': file.lengthSync(),
          'valid_yaml': false,
          'valid': false,
          'has_project': false,
          'has_clan': false,
          'has_roles': false,
          'project_keys_count': 0,
          'projects_count': 0, // deprecated alias
        };
      }
      final projectKeys = yaml['project'] is YamlMap
          ? (yaml['project'] as YamlMap).length
          : 0;
      final hasProject = yaml['project'] != null;
      final hasClan = yaml['clan'] != null;
      final hasRoles = yaml['roles'] != null;
      final valid = content.trim().isNotEmpty && (hasProject || hasClan);
      return {
        'exists': true,
        'size': file.lengthSync(),
        'valid_yaml': true,
        'valid': valid,
        'has_project': hasProject,
        'has_clan': hasClan,
        'has_roles': hasRoles,
        'project_keys_count': projectKeys,
        'projects_count': projectKeys, // deprecated alias
      };
    } on YamlException {
      return {
        'exists': true,
        'size': file.lengthSync(),
        'valid_yaml': false,
        'valid': false,
      };
    }
  }
}
