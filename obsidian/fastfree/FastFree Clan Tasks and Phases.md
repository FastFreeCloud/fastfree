# FastFree Clan — Tasks & Phases

> آخر تحديث: 2026-11-20
> المصدر: مراجعة الكود + ملاحظات Obsidian + Kanban

## Phase 0 — التأسيس
- [x] إنشاء حزمة fastfree_clan
- [x] هيكلة lib/src (config, generator, audit, sync, list, manager, data, domain, presentation, nix)
- [x] توثيق README وAPI Surface
- [x] ملاحظات Obsidian: Overview, Journey/Goal/Lifecycle

## Phase 1 — Backend Core
- [x] ClanGenerator: توليد 7 ملفات (nix.yaml, flake.nix, clan.yaml, users.yaml, perms.yaml, nodes.yaml, services.yaml)
- [x] ClanAudit: تدقيق YAML
- [x] ClanSync: نسخ الملفات إلى الأهداف
- [x] ClanList: سرد الملفات
- [x] ClanManager: generate/audit/list/sync/run
- [x] CLI: generate/audit/list/sync/run
- [x] 12 اختبارًا

## Phase 2 — SDUI
- [x] Clan data layer (network → memory → asset fallback)
- [x] Domain models (ClanConfig/ClanNode/ClanUser/ClanService)
- [x] Presentation: ClanFlowController + Dashboard/Nodes/Roles/Services/Users screens
- [x] SduiClanScreen + SSE realtime reload

## Phase 3 — Hardening (Remaining)
- [ ] توحيد قائمة ملفات audit مع generator (إضافة flake.nix)
- [ ] إزالة fileList غير المستخدم وClanSync.list المكرر
- [ ] إدخال إعدادات حقيقية بدل المحتوى hardcoded في generator
- [ ] توليد shell.nix أو إزالة الإشارة إليه من flake.nix
- [ ] تحسين ClanAudit (تحقق من YamlMap، valid أقوى، إعادة تسمية projects_count)
- [ ] دعم sync للتعارض/الحذف/المجلدات الفرعية
- [ ] اختبارات تكامل لـ run() وCLI

## Phase 4 — Integration (Remaining)
- [ ] ربط SduiClanScreen بالـ backend الفعلي (Dox) والتحقق من JSON contract
- [ ] إضافة اختبارات UI/SDUI
- [ ] توثيق عقد الـ API بين fastfree_clan وfastfree_panel
- [ ] إضافة observability/logging

## Phase 5 — Ops & Knowledge
- [x] Obsidian Context Source متصل بـ OmniRoute
- [x] Obsidian MCP tools (22) تم اختبارها
- [x] Omnigent → OmniRoute → Obsidian smoke test
- [x] Auto-start: OmniRoute + Obsidian + Omnigent
- [ ] WebDAV sync للـ vault
- [ ] إعداد Obsidian AI plugins (Copilot/Smart Connections)
- [ ] Auto-Combo combos في OmniRoute
- [ ] تحديث ملاحظات الحزم (Accounting/Panel/Purchase/Sales/SDUI) عند اكتمالها

## Status Summary
| المرحلة | الحالة |
|---|---|
| Phase 0 | Done |
| Phase 1 | Done |
| Phase 2 | Done |
| Phase 3 | Remaining |
| Phase 4 | Remaining |
| Phase 5 | Partially Done |
