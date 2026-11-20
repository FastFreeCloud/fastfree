import 'dart:io';

import 'package:path/path.dart' as p;

/// Sync clan files with target directories in the monorepo.
class ClanSync {
  final String projectRoot;

  ClanSync(this.projectRoot);

  /// نسخ ملفات clan إلى الأدلة الهدف
  Future<void> sync(List<String> targets) async {
    final source = Directory(p.join(projectRoot, 'clan'));
    if (!source.existsSync()) {
      throw FileSystemException('clan directory not found', source.path);
    }
    final files = source.listSync().whereType<File>().toList();

    for (final target in targets) {
      final targetDir = Directory(p.join(projectRoot, target));
      if (!targetDir.existsSync()) {
        targetDir.createSync(recursive: true);
      }
      for (final file in files) {
        final dest = File(p.join(targetDir.path, p.basename(file.path)));
        await file.copy(dest.path);
      }
    }
  }
}
