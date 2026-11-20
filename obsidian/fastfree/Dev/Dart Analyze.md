---
tags: [dart, analyze, fastfree-clan, fastfree-erp]
date: 2026-11-20
package: packages/fastfree_clan
---

# Dart Analyze — `packages/fastfree_clan`

## الملخص التنفيذي

| البند | القيمة |
|---|---|
| الأمر | `dart analyze` (من داخل `packages/fastfree_clan`) |
| Dart SDK | 3.13.5 (stable) — windows_x64 |
| النتيجة | **0 error** · 5 warnings · 1 info · **6 issues total** |
| Exit code | 0 (لا أخطاء حاجبة للبناء) |

## تفصيل المشاكل الست

### 1) `unused_element` × 5 — تحذيرات

كلها من نوع "class خاص (private) معرّف ولا يُستخدم" في طبقة العرض (presentation).
السبب: الشاشات تستخدم `Stac.fromNetwork` (SDUI) وتعرض JSON من الـ backend، لكن بقايا
widgets محلية (`_*Body`) ظلّت في نفس الملفات بدون أي مرجع.

| # | الملف | السطر | العنصر |
|---|---|---|---|
| 1 | `lib/src/presentation/clan_dashboard_screen.dart` | 32 | `_DashboardBody` |
| 2 | `lib/src/presentation/clan_nodes_screen.dart` | 26 | `_NodesBody` |
| 3 | `lib/src/presentation/clan_roles_screen.dart` | 26 | `_RolesBody` |
| 4 | `lib/src/presentation/clan_services_screen.dart` | 26 | `_ServicesBody` |
| 5 | `lib/src/presentation/clan_users_screen.dart` | 26 | `_UsersBody` |

تم التأكد بـ `grep` أن لا وجود لأي استخدام لهذه الأصناف في `lib/` ولا في `test/`
— أي أنها **كود ميت فعليًا** (dead code).

### 2) `deprecated_member_use` × 1 — info

| الملف | السطر | التفصيل |
|---|---|---|
| `lib/src/presentation/clan_users_screen.dart` | 69 | `Switch.activeColor` مهجور بعد `v3.31.0-2.0.pre` → استخدم `activeThumbColor` |

## قراءة النتائج (Read)

- **لا يوجد أي `error`** — الحزمة تُحلَّل بنجاح وتحلّ تبعياتها من الـ workspace
  (`resolution: workspace`).
- التحذيرات الخمسة ليست أعطالًا وظيفية: مسار العرض الفعلي هو Stac SDUI، والـ widgets
  الميتة مجرد نسخ سابقة من الواجهة قبل التحول إلى SDUI.
- تحذير الـ deprecation سطحي (تغيير اسم وسيط واحد) لكنه يتضاعف مع تحديثات Flutter القادمة.

## خطة الإصلاح المقترحة (لم تُنفَّذ بعد)

1. حذف الأصناف الخمسة غير المستخدمة (أو نقلها إلى `lib/src/presentation/_legacy/`
   إن كان هناك نية لإعادة تفعيلها).
2. تغيير `activeColor: Colors.green` → `activeThumbColor: Colors.green`
   في `clan_users_screen.dart:69`.
3. إعادة تشغيل `dart analyze` للوصول إلى `No issues found!`.

> ملاحظة: الحزمة `packages/fastfree_clan` ما زالت غير متتبعة في git (`??` — untracked)
> على الفرع الحالي، لذا لا يظهر لها سجل تغييرات.

## المراجع

- `analysis_options.yaml` في جذر الـ monorepo (melos workspace).
- `packages/fastfree_clan/pubspec.yaml` — `environment.sdk: ^3.6.0`, Flutter `>=3.27.0`.
