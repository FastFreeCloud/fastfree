// Domain models for the Clan module (Nix-backed).
//
// A "Clan" is a group of machines (nodes) managed with Nix/Clan.lol.
// This layer models the state used by the SDUI screen and the Nix
// generator/auditor in `fastfree_clan`.

/// A machine in the clan.
class ClanNode {
  const ClanNode({
    required this.name,
    this.type = 'local',
    this.host,
    this.roles = const [],
    this.services = const [],
  });

  final String name;
  final String type;
  final String? host;
  final List<String> roles;
  final List<String> services;

  factory ClanNode.fromJson(Map<String, dynamic> json) => ClanNode(
        name: json['name'] as String? ?? '',
        type: json['type'] as String? ?? 'local',
        host: json['host'] as String?,
        roles: (json['roles'] as List?)?.cast<String>() ?? const [],
        services: (json['services'] as List?)?.cast<String>() ?? const [],
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'type': type,
        if (host != null) 'host': host,
        'roles': roles,
        'services': services,
      };
}

/// A user account in the clan.
class ClanUser {
  const ClanUser({
    required this.name,
    this.role = 'user',
    this.email,
    this.active = true,
  });

  final String name;
  final String role;
  final String? email;
  final bool active;

  factory ClanUser.fromJson(Map<String, dynamic> json) => ClanUser(
        name: json['name'] as String? ?? '',
        role: json['role'] as String? ?? 'user',
        email: json['email'] as String?,
        active: json['active'] as bool? ?? true,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'role': role,
        if (email != null) 'email': email,
        'active': active,
      };
}

/// A service exposed by the clan.
class ClanService {
  const ClanService({
    required this.name,
    required this.port,
    this.type = 'http',
    this.config = const {},
  });

  final String name;
  final int port;
  final String type;
  final Map<String, dynamic> config;

  factory ClanService.fromJson(Map<String, dynamic> json) => ClanService(
        name: json['name'] as String? ?? '',
        port: json['port'] as int? ?? 0,
        type: json['type'] as String? ?? 'http',
        config: (json['config'] as Map?)?.cast<String, dynamic>() ?? const {},
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'port': port,
        'type': type,
        'config': config,
      };
}

/// Everything the clan module manages.
class ClanConfig {
  const ClanConfig({
    this.clanName = 'fastfree_clan',
    this.clusterId = 'default',
    this.leader = 'admin',
    this.nodes = const [],
    this.users = const [],
    this.services = const [],
    this.roles = const {},
  });

  final String clanName;
  final String clusterId;
  final String leader;
  final List<ClanNode> nodes;
  final List<ClanUser> users;
  final List<ClanService> services;
  final Map<String, List<String>> roles;

  factory ClanConfig.fromJson(Map<String, dynamic> json) => ClanConfig(
        clanName: json['clan']?['name'] as String? ?? 'fastfree_clan',
        clusterId: json['clan']?['cluster_id'] as String? ?? 'default',
        leader: json['clan']?['leader'] as String? ?? 'admin',
        nodes: (json['nodes'] as List?)
                ?.map((e) => ClanNode.fromJson((e as Map).cast<String, dynamic>()))
                .toList() ??
            const [],
        users: (json['users'] as List?)
                ?.map((e) => ClanUser.fromJson((e as Map).cast<String, dynamic>()))
                .toList() ??
            const [],
        services: (json['services'] as List?)
                ?.map((e) =>
                    ClanService.fromJson((e as Map).cast<String, dynamic>()))
                .toList() ??
            const [],
        roles: (json['roles'] as Map?)?.map(
              (k, v) => MapEntry(k.toString(), (v as List).cast<String>()),
            ) ??
            const {},
      );

  Map<String, dynamic> toJson() => {
        'clan': {
          'name': clanName,
          'cluster_id': clusterId,
          'leader': leader,
        },
        'nodes': nodes.map((e) => e.toJson()).toList(),
        'users': users.map((e) => e.toJson()).toList(),
        'services': services.map((e) => e.toJson()).toList(),
        'roles': roles,
      };
}

/// Result of a Nix file generation + audit run.
class ClanAuditResult {
  const ClanAuditResult({required this.files, required this.generatedAt});

  final Map<String, dynamic> files;
  final DateTime generatedAt;

  bool get allValid =>
      files.values.every((f) => f is Map && f['valid'] == true);
}

/// Backwards-compatible placeholder symbol kept for existing imports/tests.
const String clanDomainStatus = 'Clan Domain Layer implemented';
