---
tags: [fastfree-clan, fastfree-erp, dart, nix, sdui, knowledge]
date: 2026-11-20
package: packages/fastfree_clan
status: verified-local
verified_by: "ملاحظات vault الموجودة + تقرير dart analyze الحقيقي (SDK 3.13.5)"
---

# FastFree Clan Core

> [!info] حالة التحقق
> **متحقق من مصادر المشروع نفسه**: [[Dev/Dart Analyze]] (تشغيل `dart analyze` فعلي، SDK 3.13.5)،
> [[FastFree Clan/Overview]]، [[FastFree Clan/Journey, Goal, Lifecycle]]،
> [[FastFree Clan Tasks and Phases]]، [[Project Plan — FastFree Packages]].
> التوثيق الخارجي (Nix / Clan / Melos) **لم يُتحقق منه آليًا** في هذه الجلسة.

## ما هو

**FastFree Clan Core** = الحزمة `packages/fastfree_clan` — نواة وحدة **Clan** في FastFree ERP.
هدفها: إدارة بنية تحتية مبنية على **Nix + Clan** (عُقد، مستخدمين، خدمات، صلاحيات) عبر
توليد ملفات الإعداد والتحقق منها ومزامنتها، ثم عرضها في واجهة **SDUI**.

الفكرة المعمارية: *الـ Core لا يرسم شيئًا*. هو ينتج **ملفات YAML/Nix** ويُصدر **JSON contract**،
والواجهة (Flutter/Stac SDUI أو لوحة Quasar) تستهلك الـ JSON.

### حدود النواة

| لـ Core (هذه الحزمة) | خارج الـ Core |
|---|---|
| توليد `clan/*.yaml` + `nix.yaml` + `flake.nix` | تنفيذ `nix`/`clan` فعليًا على العُقد |
| تدقيق (audit) الـ YAML | مصادقة المستخدمين / IAM |
| مزامنة الملفات إلى أهداف (sync) | واجهة الإدارة (→ `fastfree_panel`) |
| سرد (list) + واجهة CLI | الشاشات العامة (→ `fastfree_layout`, `fastfree_splash`) |
| نماذج domain + JSON للـ SDUI | بقية وحدات ERP (→ `fastfree_hr` …) |

> ⚠️ **حدود مهمة:** الـ Core يولّد **وصفًا** للبنية التحتية ولا يطبّقه. أي كلام عن "نشر"
> أو "provisioning" حقيقي خارج نطاق هذه الحزمة حاليًا.

## الهيكل (lib/src)

```text
packages/fastfree_clan/
├── bin/cli.dart
├── lib/src/
│   ├── config/       إعدادات الحزمة والمولّد
│   ├── generator/    ClanGenerator
│   ├── audit/        ClanAudit
│   ├── sync/         ClanSync
│   ├── list/         ClanList
│   ├── manager/      ClanManager  ← الواجهة الموحّدة
│   ├── nix/          تفاصيل Nix/Flake
│   ├── data/         network → memory → asset fallback
│   ├── domain/       ClanConfig · ClanNode · ClanUser · ClanService
│   └── presentation/ ClanFlowController + 5 شاشات + SduiClanScreen (SSE)
└── test/             12 اختبارًا
```

## دورة الحياة — الاستخدام الصحيح

```text
generate() → audit() → sync(targets) → run(targets)
```

| الخطوة | ما تفعله | المخرج |
|---|---|---|
| `generate()` | يولّد **7 ملفات**: `nix.yaml`, `flake.nix`, `clan.yaml`, `users.yaml`, `perms.yaml`, `nodes.yaml`, `services.yaml` | شجرة `clan/` |
| `audit()` | يقرأ الـ YAML ويتحقق من البنية | تقرير `valid` / أخطاء |
| `list()` | يسرد ملفات Clan | قائمة |
| `sync(targets)` | ينسخ الملفات إلى أهداف | نسخ على القرص |
| `run(targets)` | `generate + audit + sync` | المسار الكامل |

### الأصناف الأساسية

`ClanManager` (الواجهة)، `ClanGenerator`، `ClanAudit`، `ClanSync`، `ClanList`،
`ClanNixConfig`، `ClanFlowController` (SDUI).

### CLI

```bash
dart run bin/cli.dart generate <project-root>
dart run bin/cli.dart audit    <project-root>
dart run bin/cli.dart list     <project-root>
dart run bin/cli.dart sync     <project-root> <target>
dart run bin/cli.dart run      <project-root> <target>
```

### بيئة التشغيل (من `pubspec.yaml`)

| البند | القيمة |
|---|---|
| `environment.sdk` | `^3.6.0` |
| Flutter | `>=3.27.0` |
| Dart المستخدم فعليًا في التحقق | `3.13.5 (stable) — windows_x64` |
| نوع الـ monorepo | **melos workspace** · `resolution: workspace` |

## الاستخدام الصحيح — قواعد عملية

1. **الـ Core يُستدعى من `ClanManager`، لا من المولّد مباشرة** — يضمن الترتيب والتحقق.
2. **`audit` بعد كل `generate`** — المولّد لا يفشل عند إنتاج YAML ناقص.
3. **لا تعدّل ملفات `clan/*.yaml` يدويًا** — ستُفقد عند التوليد التالي؛ عدّل مصدر الإعدادات.
4. **الواجهة تستهلك JSON من `data/`**، مع سلسلة هبوط: **network → memory → asset**؛
   تعطّل الـ backend لا يجب أن يُبيّض الشاشة.
5. **`SduiClanScreen` يستخدم SSE** لإعادة التحميل الحيّة — لا polling.
6. شغّل `dart analyze` من **جذر الحزمة**، و`dart pub get` قبل الاعتماد على التشخيصات.

## الحالة الحقيقية (كما هي، لا كما نتمنى)

| المرحلة | الحالة |
|---|---|
| Phase 0 — التأسيس | ✅ Done |
| Phase 1 — Backend Core | ✅ Done (مولّد + audit + sync + list + manager + CLI + 12 اختبارًا) |
| Phase 2 — SDUI | ✅ Done (data/domain/presentation + SSE) |
| Phase 3 — Hardening | ⏳ Remaining |
| Phase 4 — Integration (Dox) | ⏳ Remaining |
| Phase 5 — Ops & Knowledge | 🟡 جزئيًا |

### ديون تقنية معروفة (مُثبتة بـ `dart analyze`)

| # | النوع | التفصيل |
|---|---|---|
| 1 | `unused_element` × 5 | widgets خاصة ميتة: `_DashboardBody`, `_NodesBody`, `_RolesBody`, `_ServicesBody`, `_UsersBody` (كلها سطر ~26 إلا الأول ~32) |
| 2 | `deprecated_member_use` × 1 | `Switch.activeColor` في `clan_users_screen.dart:69` → بديله `activeThumbColor` |
| — | النتيجة | **0 error** · 5 warnings · 1 info · exit code 0 |

### قائمة Phase 3 (غير منفَّذة)

- توحيد قائمة ملفات `audit` مع `generator` (إضافة `flake.nix`).
- إزالة `fileList` غير المستخدم و`ClanSync.list` المكرر.
- إعدادات حقيقية بدل المحتوى **hardcoded** في المولّد.
- توليد `shell.nix` أو إزالة الإشارة إليه من `flake.nix`.
- تقوية `ClanAudit`: تحقق `YamlMap`، `valid` أقوى، إعادة تسمية `projects_count`.
- دعم `sync` للتعارض/الحذف/المجلدات الفرعية.
- اختبارات تكامل لـ `run()` وCLI.

## أخطاء شائعة (Pitfalls)

| # | الخطأ | الأثر | الصواب |
|---|---|---|---|
| 1 | تعديل `clan/*.yaml` يدويًا | يُمسح عند `generate()` التالي | عدّل مصدر الإعدادات في `config/` |
| 2 | `sync` قبل `audit` | تُنسخ ملفات فاسدة | `run()` أو audit أولًا |
| 3 | توقّع أن `audit` يغطي `flake.nix` | قائمة الـ audit لا تزال غير موحّدة مع المولّد (Phase 3) | تحقّق يدويًا من `flake.nix` |
| 4 | الاعتماد على `ClanSync` للمجلدات الفرعية/الحذف | مدعوم جزئيًا فقط | تحقق من الأثر، أو أكمل Phase 3 |
| 5 | تشغيل `dart analyze` من جذر الـ monorepo | نتائج غير متعلقة بالحزمة | من `packages/fastfree_clan` |
| 6 | افتراض `shell.nix` موجود | `flake.nix` يشير إليه لكنه غير مولَّد | ولّده أو أزل الإشارة (Phase 3) |
| 7 | ربط `SduiClanScreen` بالـ backend دون التحقق من عقد JSON | شاشات فارغة بصمت | تحقق من العقد مع Dox/`fastfree_panel` (Phase 4) |
| 8 | حذف الـ `_*Body` widgets دون التحقق | لا شيء — لكن تأكد أنها **غير مرجعية** في `lib/` و`test/` | `grep` قبل الحذف |
| 9 | افتراض أن الحزمة متتبعة في git | لا سجل تغييرات (كانت `??` untracked) | `git add packages/fastfree_clan` |
| 10 | الاعتماد على fallback assets كأنها بيانات حقيقية | بيانات وهمية في الإنتاج | fallback للعرض فقط، والـ network هو المصدر |

## مثال قصير

```dart
import 'package:fastfree_clan/fastfree_clan.dart';

Future<void> main() async {
  final manager = ClanManager(projectRoot: '/path/to/project');

  await manager.generate();            // 7 ملفات في clan/
  final report = await manager.audit(); // تحقق YAML
  if (!report.valid) {
    for (final e in report.errors) print('✗ $e');
    return;
  }

  await manager.sync(targets);          // نسخ إلى الأهداف
  // أو الكل مرة واحدة:
  // await manager.run(targets);
}
```

```bash
# من packages/fastfree_clan
dart pub get
dart run bin/cli.dart run /path/to/project /path/to/target
dart analyze          # المتوقع حاليًا: 0 error · 5 warnings · 1 info
```

## روابط رسمية / مراجع

- **داخل المشروع:** `packages/fastfree_clan/README.md` · `analysis_options.yaml` (جذر melos)
  · `packages/fastfree_clan/pubspec.yaml` · `test/`.
- **Nix** — `https://nix.dev/` · Flakes: `https://nixos.wiki/wiki/Flakes`
- **Clan** (إطار إدارة البنية بـ Nix) — `https://clan.lol/` · `https://git.clan.lol/clan/clan-core`
- **Dart** — `https://dart.dev/tools/dart-tool` · **Melos** — `https://melos.invertase.dev/`
- **Stac (SDUI)** — `https://stac.dev/`

> ⚠️ الروابط الخارجية أعلاه **لم تُفتح آليًا في هذه الجلسة** (لا `execute:search` ولا shell).
> متحققة فقط من داخل المشروع: أسماء الحزم، SDK، الأصناف، أسماء الملفات، نتيجة `dart analyze`.

## مراجع داخل الـ vault

- [[FastFree Clan/Overview]] · [[FastFree Clan/Journey, Goal, Lifecycle]]
- [[FastFree Clan Tasks and Phases]] · [[FastFree Clan Kanban]] · [[FastFree Clan — Journey, Goal, Lifecycle]]
- [[Dev/Dart Analyze]] — الديون التقنية بالأرقام.
- [[FastFree Clan/FastFree SDUI]] · [[FastFree Clan/FastFree Panel]] · [[FastFree Clan/FastFree HR]]
  · [[FastFree Clan/FastFree Layout]] · [[FastFree Clan/FastFree Splash]]
  · [[FastFree Clan/FastFree Accounting]]
- [[Knowledge/Dart LSP in OpenCode]] — تشخيصات حيّة أثناء التطوير.
- [[Knowledge/OmniRoute MCP]] — كيف يكتب الوكلاء هذه الملاحظات.

## إضافات لاحقة

- (سجّل هنا إنجاز Phase 3/4 وتحديث نتيجة `dart analyze` حتى `No issues found!`.)
