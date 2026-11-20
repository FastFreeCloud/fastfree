import 'dart:io';

import 'package:path/path.dart' as p;

/// Rejects paths outside [root] or through symlinks.
bool safeCleanPath(String root, String target) {
  if (!p.isWithin(root, target)) return false;
  var current = root;
  for (final part in p.split(p.relative(target, from: root))) {
    current = p.join(current, part);
    if (FileSystemEntity.typeSync(current, followLinks: false) ==
        FileSystemEntityType.link) {
      return false;
    }
  }
  return true;
}
