---
title: FastFree Multi-Agent Operating Environment
priority: high
---

# Multi-Agent Operating Environment with Herdr

المشروع يدار بواسطة وكلاء ذكاء اصطناعي متعددين يعملون بالتوازي داخل طرفيات **Herdr** (`herdr.dev` مع `HERDR_ENV=1`):
- **الوكلاء النشطون**: Antigravity (`agy`), OpenCode (`opencode`), Claude Code (`claude`).
- **المهارة المشتركة المعتمدة**: [FastFree Guide Skill](file:///.agents/skills/fastfree-guide/SKILL.md).
- **أدوات MCP المتوفرة للوكلاء**:
  1. `ai-rulez`: خادم إدارة الحوكمة الذكي والقواعد والأوامر والفاحصات الحتمية.
  2. `quasar`: مكونات وإضافات Quasar UI.
  3. `playwright`: اختبارات المتصفح وفحص E2E وأخذ لقطات.
  4. `firecrawl-mcp`: استخراج وتلخيص محتوى الويب المتقدم.
  5. `sequential-thinking`: التفكير المنطقي المتسلسل وحل المشكلات المعقدة.
  6. `context7`: توثيق المكتبات الخارجي الحي.
  7. `grep` & `exa`: البحث البرمجي والدلالي.
  8. `midscene-web`: الفحص البصري التلقائي للواجهات.

---

## المتطلبات التقنية الأساسية

| الأداة | الإصدار الأدنى | ملاحظة |
|--------|----------------|--------|
| **Node.js** | **>= 22.22.0** | إلزامي لـ `@quasar/app-vite` 3.10.2 لإنشاء مجلد `.quasar` ومنع أخطاء TS2307 |
| **pnpm** | ^11.11.0 | مدير الحزم المعتمد للمستودع |
| **Git** | أي إصدار حديث | إدارة التفرعات وتثبيت التعديلات |

---

## أوامر الفحص والتشغيل المباشرة

```bash
# fastfree_panel (Quasar 2 + Vite)
cd apps/fastfree_panel
npx quasar prepare
npx vue-tsc --noEmit
npx eslint -c ./eslint.config.js "./src*/**/*.{ts,js,cjs,mjs,vue}"

# fastfree_ledger (Accounting + Sales + Inventory)
cd apps/fastfree_ledger
npx quasar prepare
npx vue-tsc --noEmit
npx eslint -c ./eslint.config.js "./src*/**/*.{ts,js,cjs,mjs,vue}"

# فحص كافة حزم packages/ دفعة واحدة:
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
foreach($p in @('fastfree_lowcode','fastfree_auth','fastfree_accounting','fastfree_inventory','fastfree_sales','fastfree_purchase','fastfree_hr','fastfree_crm')){
  cd "C:\Users\FastFree\Desktop\fastfree\packages\$p"
  Write-Output "$p = $((npx vue-tsc --noEmit 2>&1 | Select-String 'error TS' | Measure-Object).Count)"
}
```

---

## ترتيب تهيئة النظام (Boot Order)

```
fastfree-auth-init        → API client + auth initialized
fastfree-accounting-init  → Accounting groups + screens registered
fastfree-inventory-init   → Inventory groups + screens registered
fastfree-sales-init       → Sales groups + screens registered
fastfree-purchase-init    → Purchase groups + screens registered
fastfree-hr-init          → HR groups + screens registered
fastfree-crm-init         → CRM groups + screens registered
i18n                      → Translations loaded AFTER all packages register their messages
register-service-worker   → PWA registration (last)
```
