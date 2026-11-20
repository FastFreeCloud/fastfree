---
tags: [knowledge, index, meta]
date: 2026-11-21
---

# Knowledge — الفهرس

ملاحظات مرجعية مبنية على مصادر رسمية/تشغيلية، مع وسم صريح لدرجة التحقق.

| الملاحظة | الموضوع | حالة التحقق |
|---|---|---|
| [[Knowledge/Project Architecture]] | خريطة المنظومة كاملة · Melos · الحزم · المكتبات · السلالتان · الفجوات G-01…G-20 | ✅ من الملفات + git |
| [[Knowledge/OmniRoute MCP]] | خادم MCP في OmniRoute · أدوات `obsidian_*` · الصلاحيات | ✅ متحقق حيًّا |
| [[Knowledge/Omnigent Harnesses]] | محرّكات التنفيذ · `permission_mode` لكل harness · الأتمتة | ✅ من بيانات التشغيل |
| [[Knowledge/Obsidian Local REST API]] | الـ plugin · المنافذ · المصادقة · واجهة HTTP | ✅ manifest · 🟡 المسارات |
| [[Knowledge/Dart LSP in OpenCode]] | ربط خادم لغة Dart بـ OpenCode | ❌ يحتاج تحققًا |
| [[Knowledge/FastFree Clan Core]] | نواة `fastfree_clan` · دورة الحياة · الديون التقنية | ✅ من المشروع |

## قواعد هذه المساحة

1. لا حذف ولا تعديل لملاحظات خارج `Knowledge/` و`FastFree Clan/`.
2. كل ملاحظة تبدأ بـ: **ما هو · الاستخدام الصحيح · أخطاء شائعة · مثال · روابط رسمية**.
3. عند وجود ملاحظة سابقة: **أضِف** قسمًا جديدًا في نهايتها، لا تستبدلها.
4. أي بند غير متحقق منه يُوسَم صريحًا (✅ / 🟡 / ❌) — لا تُقدَّم الاستنتاجات كحقائق.
5. لا مفاتيح ولا كلمات مرور داخل الـ vault (يُرفع إلى GitHub).

## قيود معروفة في الجلسات الحالية

- `omniroute_web_search` / `omniroute_web_fetch` تفشلان بـ `Insufficient MCP scopes — Missing: execute:search`.
- `obsidian_patch_note` يفشل (400): يتطلب `Markdown-Patch-Version` صريحًا → استخدم `obsidian_write_note` لإعادة كتابة الملف كاملًا.
- أدوات shell على Windows/MSYS: `find` و`sort` تُحجَب بأدوات Windows (`FIND.EXE`, `sort.exe`) → استخدم `/usr/bin/sort` و`ls -R`.
