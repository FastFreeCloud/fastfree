import 'dart:io';
import 'package:yaml/yaml.dart';
import 'package:path/path.dart' as p;

/// نسخة معدلة من NixConfig لمكتبة FastFree Clan.
///
/// تضيف حقول مخصصة للـ Clan:
/// - [clanName]: اسم القائد (leader)
/// - [clusterId]: معرف الجلسة
/// - [roles]: الصلاحيات
class ClanNixConfig {
  final String projectName;
  final FlutterConfig flutter;
  final String flakePath;
  final Map<String, PlatformConfig> platforms;
  final Map<String, ProfileConfig> profiles;
  final String clanName;
  final String clusterId;
  final Map<String, List<String>> roles;

  ClanNixConfig({
    required this.projectName,
    required this.flutter,
    required this.flakePath,
    required this.platforms,
    required this.clanName,
    required this.clusterId,
    required this.roles,
    this.profiles = const {},
  });

  factory ClanNixConfig.fromYaml(YamlMap yaml) {
    return ClanNixConfig(
      projectName: (yaml['project'] as YamlMap?)?['name'] as String? ??
          p.basename(Directory.current.path),
      flutter: FlutterConfig(
        version: yaml['flutter']?['version'] as String? ?? '',
        channel: yaml['flutter']?['channel'] as String? ?? 'stable',
        checksumMacosX64: (yaml['flutter']?['checksums'] as YamlMap?)?['macos_x64'] as String? ?? '',
        checksumMacosArm64: (yaml['flutter']?['checksums'] as YamlMap?)?['macos_arm64'] as String? ?? '',
        checksumLinuxX64: (yaml['flutter']?['checksums'] as YamlMap?)?['linux_x64'] as String? ?? '',
        checksumLinuxArm64: (yaml['flutter']?['checksums'] as YamlMap?)?['linux_arm64'] as String? ?? '',
      ),
      flakePath: (yaml['nix'] as YamlMap?)?['flake'] as String? ?? 'nix',
      platforms: (yaml['platforms'] as YamlMap? ?? YamlMap())
          .entries
          .map((e) =>
              MapEntry(
                e.key as String,
                PlatformConfig.fromYaml(e.key as String, e.value as YamlMap),
              ))
          .fold<Map<String, PlatformConfig>>(
            {},
            (map, entry) => map..[entry.key] = entry.value,
          ),
      clanName: yaml['clan']?['name'] as String? ?? 'clan',
      clusterId: yaml['cluster']?['id'] as String? ?? 'cluster',
      roles: yaml['roles'] != null
          ? (yaml['roles'] as YamlMap).map(
              (k, v) => MapEntry(k as String, (v as List).map((e) => e as String).toList()),
            )
          : {},
      profiles: (yaml['profiles'] as YamlMap? ?? YamlMap())
          .entries
          .map((e) =>
              MapEntry(
                e.key as String,
                ProfileConfig.fromYaml(e.value as YamlMap),
              ))
          .fold<Map<String, ProfileConfig>>(
            {},
            (map, entry) => map..[entry.key] = entry.value,
          ),
    );
  }

  String get normalizedFlakePath =>
      flakePath.endsWith('/') ? flakePath.substring(0, flakePath.length - 1) : flakePath;

  String get flakeRef {
    final path = normalizedFlakePath;
    if (path.isEmpty) return './.';
    if (p.isAbsolute(path) || _looksLikeExternalFlakeRef(path)) return path;
    final normalized = p.posix.normalize(path.replaceAll("\\", "/"));
    if (normalized == '.') return './.';
    if (normalized.startsWith('./') || normalized.startsWith('../')) return normalized;
    return './$normalized';
  }

  String get toolkitRoot {
    final dir = p.dirname(normalizedFlakePath);
    return dir.isEmpty ? '.' : dir;
  }

  String scriptPath(String scriptName) => p.join(toolkitRoot, 'scripts', scriptName);

  PlatformConfig? platformFor(String name) {
    if (platforms.containsKey(name)) return platforms[name];
    final profile = profiles[name];
    if (profile != null && platforms.containsKey(profile.platform)) {
      final base = platforms[profile.platform]!;
      return PlatformConfig(
        name: base.name,
        shell: base.shell,
        sdk: base.sdk,
        buildCommand: profile.command,
        buildOutput: profile.output ?? base.buildOutput,
      );
    }
    return null;
  }

  List<String> get platformNames => platforms.keys.toList();
}

bool _looksLikeExternalFlakeRef(String value) =>
    RegExp(r'^[A-Za-z][A-Za-z0-9+.-]*:').hasMatch(value);

/// نسخ من FlutterConfig من المكتبة الأصلية (nix)
class FlutterConfig {
  final String version;
  final String channel;
  final String checksumMacosX64;
  final String checksumMacosArm64;
  final String checksumLinuxX64;
  final String checksumLinuxArm64;

  const FlutterConfig({
    required this.version,
    required this.channel,
    this.checksumMacosX64 = '',
    this.checksumMacosArm64 = '',
    this.checksumLinuxX64 = '',
    this.checksumLinuxArm64 = '',
  });
}

/// نسخ من PlatformConfig من المكتبة الأصلية (nix)
class PlatformConfig {
  final String name;
  final String shell;
  final Map<String, String> sdk;
  final String buildCommand;
  final String buildOutput;

  const PlatformConfig({
    required this.name,
    required this.shell,
    this.sdk = const {},
    required this.buildCommand,
    required this.buildOutput,
  });

  factory PlatformConfig.fromYaml(String name, YamlMap yaml) {
    final sdkYaml = yaml['sdk'] as YamlMap?;
    final buildYaml = yaml['build'] as YamlMap? ?? YamlMap();
    final defaultShell = name == 'macos' ? 'default' : name;

    return PlatformConfig(
      name: name,
      shell: yaml['shell'] as String? ?? defaultShell,
      sdk: sdkYaml != null
          ? Map<String, String>.fromEntries(
              sdkYaml.entries.map((e) => MapEntry(e.key as String, '${e.value}')),
            )
          : {},
      buildCommand: buildYaml['command'] as String? ?? 'flutter build $name --release',
      buildOutput: buildYaml['output'] as String? ?? 'build/',
    );
  }
}

/// نسخ من ProfileConfig من المكتبة الأصلية (nix)
class ProfileConfig {
  final String platform;
  final String command;
  final String? output;

  const ProfileConfig({
    required this.platform,
    required this.command,
    this.output,
  });

  factory ProfileConfig.fromYaml(YamlMap yaml) {
    return ProfileConfig(
      platform: yaml['platform'] as String,
      command: yaml['command'] as String,
      output: yaml['output'] as String?,
    );
  }
}
