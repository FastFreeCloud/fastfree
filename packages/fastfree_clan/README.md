# fastfree_clan

**FastFree Clan** — وحدة النِّقابة (Clan) في منظومة FastFree ERP.

تجمع بين:

- **Backend نقي (Dart)** — توليد وضبط وتدقيق ملفات Clan باستخدام مخطط مكتبة `nix` الرسمية ([pub.dev/packages/nix](https://pub.dev/packages/nix)).
- **واجهة Stac SDUI (Flutter)** — شاشات تُرسم من JSON عبر `Stac.fromNetwork` مع fallback محلي من الأصول.

---

## البنية

```
lib/
├── fastfree_clan.dart              # SduiClanScreen + كل التصديرات
└── src/
    ├── config.dart                 # ClanNixConfig + FlutterConfig/PlatformConfig/ProfileConfig
    ├── generator.dart              # توليد clan/*.yaml + nix.yaml + flake.nix
    ├── audit.dart                  # تدقيق ملفات YAML
    ├── sync.dart                   # نسخ ملفات clan إلى أهداف
    ├── list.dart                   # سرد ملفات Clan
    ├── clan_manager.dart           # يجمع generate / audit / sync / run
    ├── data/                       # جلب الـ SDUI JSON (شبكة → ذاكرة → asset)
    ├── domain/                     # ClanConfig / ClanNode / ClanUser / ClanService
    ├── presentation/               # ClanFlowController (ChangeNotifier)
    └── nix/                        # نسخة مدمجة من مخطط مكتبة nix
        ├── config/nix_config.dart
        ├── nix_runner.dart
        ├── wsl.dart
        ├── filesystem_safety.dart
        ├── flutter_sdk.dart
        ├── tool_scaffold.dart
        └── templates/
```

## التوليد

```bash
dart run bin/cli.dart generate <project-root>
```

يولّد في `<project-root>/clan/`:

| الملف | الوصف |
|-------|-------|
| `nix.yaml` | إعداد البناء بمخطط `nix` |
| `flake.nix` | Nix flake |
| `clan.yaml` | الإعداد الرئيسي للـ Clan |
| `users.yaml` | حسابات المستخدمين |
| `perms.yaml` | الصلاحيات |
| `nodes.yaml` | العقد (الأجهزة) |
| `services.yaml` | الخدمات |

## التدقيق

```bash
dart run bin/cli.dart audit <project-root>
```

يتحقق أن كل ملف YAML موجود وصالح.

## الأوامر

| الأمر | الوظيفة |
|-------|---------|
| `generate [root]` | توليد كل ملفات Clan |
| `audit [root]` | تدقيق الملفات المولّدة |
| `list [root]` | سرد الملفات |
| `sync <target...>` | نسخ الملفات إلى أدلة هدف |
| `run [target...]` | توليد + تدقيق + مزامنة |

## الواجهة (Stac SDUI)

```dart
import 'package:fastfree_clan/fastfree_clan.dart';

SduiClanScreen(
  backendUrl: 'http://localhost:8080/api/v1/clan',
  enableRealtimeReload: true, // SSE
)
```

- يجلب تخطيط JSON من الخلفية.
- عند الفشل يستخدم `assets/fallback/clan_fallback.json`.
- يدعم إعادة التحميل اللحظي عبر SSE.

## الاختبارات

```bash
flutter test
```

12 اختبارًا: التوليد، التدقيق، النماذج، المزامنة، ومخطط `nix`.

## المرجع

- مكتبة `nix`: https://pub.dev/packages/nix
- إطار Dox: https://dartondox.dev/
- Stac SDUI: https://github.com/StacDev/stac
