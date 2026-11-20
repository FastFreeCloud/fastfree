---
tags: [dart, lsp, opencode, tooling, knowledge]
date: 2026-11-20
status: unverified
verified_by: "لا تحقق آلي في هذه الجلسة — لا shell ولا scope للبحث/الجلب"
---

# Dart LSP in OpenCode

> [!warning] تنبيه صريح عن حالة هذه الملاحظة
> لم أتمكن من التحقق من هذه الملاحظة آليًا: `omniroute_web_search` و `omniroute_web_fetch`
> محجوبان بـ `Missing: execute:search`، ولا يوجد shell/OS read في هذه الجلسة، ولا
> browser renderer. لذلك كل ما يلي **موسوم** بحسب درجة الثقة:
> - 🟢 **مؤكد من المشروع/بيئة FastFree** (من ملاحظات الـ vault وسلوك الأدوات).
> - 🟡 **معروف عام وسائد** لكنه يحتاج تأكيدًا مقابل إصدار OpenCode المستخدم.
> - 🔴 **مفتوح/غير مؤكد** — يجب التحقق قبل الاعتماد عليه.
> لا تحذف هذا التنبيه حتى يتم التحقق.

## ما هو

- **LSP** = Language Server Protocol: بروتوكول JSON-RPC يجعل المحرّر/الوكيل يسأل خادم لغة عن
  التشخيصات (diagnostics)، الإكمال، التعريف، المراجع، وإعادة التسمية.
- **Dart LSP** = خادم اللغة الرسمي من فريق Dart (`analysis_server`)، ويُشغَّل من الـ SDK نفسه.
- **OpenCode** = وكيل برمجة في الـ terminal/IDE. لا يملك فهمًا للأنواع في Dart إذا لم يكن
  LSP مربوطًا؛ فيتحول إلى تخمين نصي. ربط Dart LSP يمنحه أخطاء المُحلِّل الحقيقية.

> 🟢 مؤكد من بيئة FastFree: المشروع يستخدم `dart analyze` كمرجع للتشخيص، ومعيار القبول
> `No issues found!` — راجع [[Dev/Dart Analyze]]. LSP يعطي نفس التشخيصات لكن حيًّا داخل الجلسة.

## التشغيل اليدوي لخادم Dart (الأساس لكل إعداد)

الـ Dart SDK يوفّر خادم LSP مدمجًا:

```bash
# 🟡 صيغة الأمر — تحقّق بـ `dart --help` / `dart language-server --help`
dart language-server --protocol=lsp
```

- 🟢 يجب أن يكون `dart` على `PATH`.
- 🟡 في مشاريع Flutter، استخدم Dart المُرفَق مع Flutter
  (`<flutter>/bin/cache/dart-sdk/bin/dart`) لا نسخة SDK مستقلة، لتجنّب تعارض الإصدارات.
- 🟡 الخادم يحتاج `pubspec.yaml` في جذر مساحة العمل، وإلا فشل التحليل.

## الربط مع OpenCode

🟡 العنصر المسؤول في إعداد OpenCode هو القسم `lsp` داخل `opencode.json` / `opencode.jsonc`.

> 🔴 **الشكل الدقيق للـ schema غير مُتحقَّق منه في هذه الجلسة.** لا تنسخ أي مفتاح من هنا
> قبل تأكيده. المرجع الوحيد الموثوق: توثيق OpenCode للإصدار المثبَّت + `opencode --help`.

الخطوات الآمنة للتحقق (بدون تخمين):

```bash
opencode --version                     # حدّد الإصدار أولًا
opencode config --help                 # هل توجد أوامر إدارة إعداد؟
ls ~/.config/opencode/                 # أو مشروعك: ./opencode.json
dart --version                         # أي SDK يُستخدم فعلًا؟
which dart
```

ثم:

1. افتح إعداد OpenCode المستخدم فعليًا (`./opencode.json(c)` أو `~/.config/opencode/`).
2. أضف/فعّل خادم LSP لامتداد `.dart` بأمر `dart language-server --protocol=lsp`.
3. أعد تشغيل OpenCode من **جذر المشروع** الذي يحتوي `pubspec.yaml`.
4. تحقّق: افتح ملف `.dart` فيه خطأ متعمد، واطلب من الوكيل قراءة التشخيصات.

## أخطاء شائعة (Pitfalls)

| # | الخطأ | الأثر | الصواب |
|---|---|---|---|
| 1 | نسخة Dart مستقلة + نسخة Flutter مختلفة | تشخيصات متناقضة مع `flutter analyze` | استخدم Dart المُرفَق مع Flutter |
| 2 | `dart` غير موجود على `PATH` للوكيل | LSP لا يُشغَّل بصمت (لا رسالة واضحة) | مرّر مسارًا مطلقًا إن لزم، وتحقّق بـ `dart --version` |
| 3 | تشغيل OpenCode من مجلد فرعي بلا `pubspec.yaml` | لا تحليل / لا تشخيصات | شغّله من جذر الحزمة |
| 4 | عدم تشغيل `dart pub get` (أو `flutter pub get`) | أخطاء "Target of URI doesn't exist" وهمية | `pub get` قبل الاعتماد على التشخيصات |
| 5 | monorepo / melos `resolution: workspace` | تحليل الحزمة وحدها يفشل أو يخطئ | حلّل من جذر الـ workspace، وربط حزم `path` صحيح |
| 6 | الاعتماد على LSP للتحقق من التنسيق | LSP ≠ `dart format` | `dart format` مهمة منفصلة |
| 7 | افتراض أن LSP يغطي YAML/JSON/Nix | لا | لكل لغة خادمها؛ FastFree Clan يولّد YAML/Nix — تحقّق يدويًا |
| 8 | حدّ التشخيصات (diagnostics cap) | أخطاء كثيرة تُخفى | عالج الأخطاء على دفعات، أو استخدم `dart analyze` للمسح الكامل |
| 9 | تجاهل الـ `analysis_options.yaml` | LSP يعرض تحذيرات لا يراها الـ CI (أو العكس) | اتساق: نفس الجذر ونفس الخيارات |

## مثال قصير (تحقق من التشخيصات عبر LSP مقابل `dart analyze`)

```bash
# 1) من جذر الحزمة
cd packages/fastfree_clan
dart pub get

# 2) خادم اللغة يعمل؟
dart language-server --protocol=lsp --help

# 3) المرجع النصي (نفس ما يفترض LSP أن يعرضه)
dart analyze          # 🟢 المتوقع: 0 error · بعض التحذيرات (انظر Dev/Dart Analyze)

# 4) داخل OpenCode: اطلب من الوكيل
#    "اقرأ تشخيصات LSP لـ lib/src/presentation/clan_users_screen.dart#L69"
#    المتوقع: deprecated_member_use على Switch.activeColor
```

## روابط رسمية

- Dart LSP / analysis server: `https://github.com/dart-lang/sdk/tree/main/pkg/analysis_server`
- `dart` CLI: `https://dart.dev/tools/dart-tool`
- LSP spec: `https://microsoft.github.io/language-server-protocol/`
- OpenCode: `https://opencode.ai/docs/` (وإن لم يظهر قسم LSP فابحث في مستودع GitHub)
- Flutter + Dart SDK المُرفَق: `https://docs.flutter.dev/`

> ⚠️ **لم يُتحقق من أي من هذه الروابط آليًا في هذه الجلسة.** أضف مقتطفات مؤكدة عند توفر
> `execute:search`، وحدّث حالة الـ frontmatter من `unverified` إلى `verified`.

## أسئلة مفتوحة (تحتاج تحققًا)

- 🔴 ما الاسم الدقيق لمفتاح تهيئة LSP في إصدار OpenCode المثبَّت؟
- 🔴 هل OpenCode يكتشف Dart LSP تلقائيًا عندما يجد `pubspec.yaml`؟
- 🔴 كيف يتعامل OpenCode مع monorepo melos (`resolution: workspace`)؟
- 🔴 هل توجد حاجة إلى `analysis_options.yaml` مخصّص للـ LSP؟

## مراجع داخل الـ vault

- [[Dev/Dart Analyze]] — نتيجة `dart analyze` الحقيقية لحزمة `fastfree_clan` (SDK 3.13.5).
- [[OmniRoute/OpenCode Integration]] — ربط OpenCode بـ OmniRoute (provider `omniroute`, نموذج `auto`).
- [[Knowledge/FastFree Clan Core]] — بنية الحزمة وطبقة العرض.

## إضافات لاحقة

- (سجّل هنا نتيجة التحقق: الإصدار، الشكل الصحيح للـ schema، ومقتطف التوثيق.)
