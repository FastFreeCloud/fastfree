# AGENTS.md — FastFree Monorepo

## أوامر الفحص (لازم تتشغل من apps/fastfree_ledger)

```bash
# TypeCheck — صفر أخطاء
cd apps/fastfree_ledger && npx vue-tsc --noEmit

# Lint Check — صفر violations
cd apps/fastfree_ledger && npm run lint:check

# Lint + Auto Fix
cd apps/fastfree_ledger && npm run lint

# Dev Server
cd apps/fastfree_ledger && npm run dev
```

## حالة المشروع

| البكج | الحالة | شاشات | خدمات | ترجمة | TS Errors |
|-------|--------|-------|-------|-------|-----------|
| fastfree_lowcode | ✅ | 12 | — | 383 | 0 |
| fastfree_auth | ✅ | 5 | 3 | 131 | 0 |
| fastfree_accounting | ✅ | 8 | 7 | 117 | 0 |
| fastfree_inventory | ✅ | 8 | 5 | 80 | 0 |
| fastfree_sales | ✅ | 7 | 6 | 150 | 0 |
| fastfree_purchase | ✅ | 7 | 5 | 140 | 0 |
| fastfree_hr | ✅ | 7 | 9 | 114 | 0 |
| fastfree_crm | ✅ | 6 | 8 | 108 | 0 |
| **المجموع** | ✅ | **60** | **43** | **1253** | **0** |

## سجل الإصلاحات

### 2026-08-07 — جلسة تحسين شاملة

#### Auth (6 إصلاحات حرجة)
1. `groups.authentication` — مفتاح ترجمة مفقود
2. UsersManager — edit name/email يبعت للسيرفر
3. Password reset — نقل لـ user.service.ts
4. updateUserRole — يستخدم Has Role child table
5. RolesManager — permission IDs بدل labels
6. N+1 query — batch fetch للـ roles

#### Accounting (12 إصلاحاً)
1. Form validation في 5 فورمات
2. Error handling مع $q.notify
3. translatePaymentType — fix camelCase
4. translateStatus للـ badges
5. 5 مفاتيح ترجمة validation جديدة

#### Inventory (14 إصلاحاً)
1. Form validation في 5 فورمات
2. `@submit.prevent` + `type="submit"`
3. v-close-popup — close programmatically
4. translateStatus — 3 مفاتيح مُعاد إضافتها
5. Error handling في كل save functions
6. ProductForm dropdowns من Store

#### Lowcode (5 إصلاحات)
1. RTL: `right` → `inset-inline-end`
2. RTL: `left/right` → `inset-inline-start/end`
3. Locale ديناميكي في useExcelExport
4. Locale ديناميكي في usePrint
5. hardcoded English fallback في useThemeStore

#### تحسينات عامة
1. 52 aria-label في 17 ملف
2. 11 console.log اتمسحت
3. 40+ TypeScript any أُصلحت
4. 20 TS error أُصلحت
5. 34 مفتاح ميت تأكد إنها مش موجودة

### 2026-08-07 — جلسة بناء sales + purchase (135 مشكلة → 0)

#### fastfree_sales (7 شاشات)
1. إنشاء Types كاملة (Customer, Quotation, SalesOrder, SalesInvoice, DeliveryNote)
2. 6 خدمات (customer, quotation, salesOrder, salesInvoice, delivery, report)
3. 7 شاشات (CustomerList, CustomerForm, QuotationList, SalesOrderList, SalesInvoiceList, DeliveryNoteList, SalesReportScreen)
4. 120 مفتاح ترجمة (EN + AR)
5. Boot file + quasar.config integration

#### fastfree_purchase (7 شاشات)
1. إنشاء Types كاملة (Supplier, PurchaseOrder, PurchaseReceipt, PurchaseInvoice)
2. 5 خدمات (supplier, purchaseOrder, purchaseReceipt, purchaseInvoice, report)
3. 7 شاشات (PurchaseDashboard, SupplierList, SupplierForm, PurchaseOrderList, PurchaseReceiptList, PurchaseInvoiceList, PurchaseReportScreen)
4. 110 مفتاح ترجمة (EN + AR)
5. Boot file + quasar.config integration

#### إصلاحات المراجعة (135 مشكلة)
**Sales fixes:**
1. إضافة 30 مفتاح ترجمة مفقود (status keys, confirmations, messages)
2. تصحيح field names في Types (quotation_date→transaction_date, etc.)
3. تحديث screen columns لتتوافق مع Types
4. إزالة 13 console.error من catch blocks
5. إضافة ARIA labels على الأزرار
6. تصحيح imports في Screens (aliased imports)

**Purchase fixes:**
1. إنشاء 5 شاشات مفقودة (SupplierList, PurchaseOrderList, PurchaseReceiptList, PurchaseInvoiceList, PurchaseReportScreen)
2. تصحيح import paths في register.ts
3. إضافة dependencies لـ package.json
4. إضافة total field لـ PurchaseReceipt type
5. تصحيح type exports (ApiResponse, PurchaseSummary)
6. إضافة ARIA labels + form validation لـ SupplierForm

### 2026-08-07 — جلسة تحسين الجودة الشاملة (169 مشكلة → 0)

#### Form Submissions (4 إصلاحات)
1. StockEntryForm — @submit.prevent wired + buttons inside form
2. CategoryList — @submit.prevent wired + buttons inside form
3. WarehouseList — @submit.prevent wired + buttons inside form
4. SupplierList — @submit.prevent wired + buttons inside form

#### Error Handling (7 إصلاحات)
1. FiscalYearList — try/catch في closeFiscalYear
2. CostCenterList — try/catch في deleteCostCenter
3. PaymentEntryList — try/catch في submit + delete
4. JournalEntryList — try/catch في submit + cancel
5. AccountingDashboard — Promise.all لـ 3 API calls

#### Save Success Checks (5 إصلاحات)
1. ProductForm — else branch بعد result.success
2. CategoryList — capture result + check success
3. WarehouseList — capture result + check success
4. SupplierList — capture result + check success
5. StockEntryForm — else branch بعد result.success

#### File Splitting (3 إصلاحات)
1. auth/init.ts — 474→79 سطر (83%↓) — فصل locales + screenRegistration
2. accounting/init.ts — 383→39 سطر (90%↓) — فصل locales + screens
3. lowcode/config.ts — 1450→60 سطر (96%↓) — فصل types + messages + defaults

#### Type Safety + SSR (6 إصلاحات)
1. auth/api.service.ts — return type أُضيف email field
2. auth/auth.service.ts — email: userRes.data.email (كان user)
3. accounting/PaymentEntryForm — Record<string, unknown> → Partial<PaymentEntry>
4. inventory/StockEntryForm — Record<string, unknown> → Partial<StockEntry>
5. lowcode/useThemeStore — SSR guards لـ document/localStorage
6. lowcode/GroupWorkspace — SSR guard لـ window

#### Performance (3 إصلاحات)
1. AccountingDashboard — Promise.all بدال sequential calls
2. useThemeStore — batch CSS updates بدال setProperty individual
3. ChartOfAccounts — watch(filteredTree) بدال computed side-effect

### 2026-08-08 — جلسة بناء fastfree_hr (17 مشكلة → 0)

#### fastfree_hr (7 شاشات)
1. Types كاملة (Employee, Department, Designation, Attendance, LeaveApplication, HolidayList, SalarySlip, HrSummary)1. 9 خدمات (employee, department, designations, attendance, leaveApplication, holiday, salarySlip, payroll, report)
2. 7 شاشات (EmployeeList, EmployeeForm, DepartmentForm, DesignationList, AttendanceList, LeaveApplicationList, PayrollScreen)
3. 114 مفتاح ترجمة (EN + AR)
4. useHrStore (Pinia) بـ 6 fetch methods
5. Boot file + quasar.config integration

#### إصلاحات TypeCheck (17 → 0)
1. `attendance.service.ts` — filters من array → Record object
2. `salarySlip.service.ts` — filters من array → Record object
3. `screens.ts` — أضافة AsyncComponentLoader type annotation
4. `AttendanceList.vue` — handler signature conflict fix
5. `EmployeeForm.vue` — exactOptionalPropertyTypes fixes (7 errors)
6. `PayrollScreen.vue` — string|undefined → string fix

#### fastfree_crm (6 شاشات)
1. Types كاملة (Lead, Opportunity, Contact, Address, Campaign, CrmSummary)
2. 8 خدمات (lead, opportunity, contact, address, campaign, leadSource, crmDashboard, report)
3. 6 شاشات (LeadList, LeadForm, OpportunityList, OpportunityForm, ContactList, CrmDashboard)
4. 108 مفتاح ترجمة (EN + AR)
5. useCrmStore (Pinia) بـ 4 fetch methods
6. Boot file + quasar.config integration
7. vue-tsc: 0 errors | lint:check: 0 violations

### 2026-08-08 — جلسة إصلاح شاملة (54 شاشة، 6 وكلاء، 0 أخطاء)

#### Shared Utilities (2 composable جديدة)
1. `useFormatNumber.ts` — تنسيق أرقام/locale-aware بدل 12+ دالة مكررة
2. `useStatusHelpers.ts` — translateStatus + statusColor مشتركة بدل 8+ دالة مكررة

#### Accounting (5 إصلاحات)
1. CostCenterList — إزالة console.error
2. FiscalYearList — إزالة console.error
3. JournalEntryList — إزالة 2x console.error
4. PaymentEntryList — إزالة 2x console.error
5. AccountingDashboard + FinancialReports + GeneralLedger — إضافة try/catch + loading state

#### Auth (3 إصلاحات)
1. AuthLogin — try/catch في handleLogin
2. LicenseInfo — try/catch في fetchLicense
3. UserProfile — try/catch + loading في fetchProfile

#### Inventory (3 إصلاحات)
1. InventoryDashboard — try/catch + loading + Promise.all
2. ProductList — try/catch/finally + $q.notify في handleDelete
3. StockEntryList — try/catch/finally + $q.notify في executeAction

#### Sales (7 إصلاحات)
1. QuotationList — إصلاح زر الإلغاء (cancel → confirm) + shared utils
2. SalesOrderList — نفس الإصلاح + shared utils
3. SalesInvoiceList — نفس الإصلاح + shared utils
4. DeliveryNoteList — نفس الإصلاح + shared utils
5. SalesReportScreen — try/catch + loading + shared utils
6. locales/en.ts — إضافة status keys
7. locales/ar.ts — إضافة status keys

#### Purchase (8 إصلاحات)
1. PurchaseReportScreen — إعادة كتابة كشاشة تقارير مميزة (بديل 100% copy)
2. SupplierForm — ترجمة supplierTypeOptions
3. PurchaseDashboard — shared formatNumber
4. PurchaseOrderList — shared utils (formatNumber + statusHelpers)
5. PurchaseReceiptList — shared utils
6. PurchaseInvoiceList — shared utils
7. locales/en.ts — إضافة 15 مفتاح جديد
8. locales/ar.ts — إضافة 15 مفتاح جديد

#### HR (5 إصلاحات)
1. EmployeeForm — نقل import { computed } إلى الأعلى
2. PayrollScreen — استبدال hardcoded values بـ refs + shared formatNumber
3. LeaveApplicationList — فحص result.success + shared statusHelpers
4. AttendanceList — shared statusHelpers
5. EmployeeList — shared statusHelpers

#### CRM (5 إصلاحات)
1. OpportunityList — ترجمة status badge + shared statusHelpers
2. ContactList — ترجمة "Designation" label
3. CrmDashboard — Promise.all + shared formatNumber + إزالة getCampaigns غير المستخدمة
4. locales/en.ts — إضافة 13 status key
5. locales/ar.ts — إضافة 13 status key

#### Ledger (1 إصلاح)
1. index.vue — إزالة window.location.reload() + استخراج SPLASH_DURATION constant

#### lowcode Shared Exports (2 إصلاح)
1. useFormatNumber.ts — تصحيح import path
2. useStatusHelpers.ts — تصحيح import path + fallback color

## سكربتات PowerShell (`scripts/`)

> كل السكربتات تشتغل من **جذر المشروع** (`C:\Users\fastfree\Desktop\fastfree-lowcode-roadmap\fastfree`)

| السكربت | الوظيفة | الاستخدام |
|---------|---------|-----------|
| `scripts\fastfree_push.ps1` | **رفع المشروع على GitHub** — يتحقق من git repo، يسوي stage + commit + push تلقائي مع timestamp | `.\scripts\fastfree_push.ps1` أو مع رسالة `.\scripts\fastfree_push.ps1 -Message "msg" -Force` |
| `scripts\fastfree_deploy.ps1` | **نشر على السيرفر (VPS client3)** — يرفع الكود، يشغل workflow `Deploy client3`، ينتظر انتهائه، ثم يشغل `Diagnose client3` تلقائي | `.\scripts\fastfree_deploy.ps1` |
| `scripts\fastfree_cleanup.ps1` | **حذف_runs الفاشلة** من GitHub Actions — يجيب كل الـ runs اللي status=failure أو cancelled ويحذفها | `.\scripts\fastfree_cleanup.ps1 -All` أو `-DryRun` للتجربة |
| `scripts\fastfree_rebuild.ps1` | **إعادة بناء كل الصور** (ERP, Ledger, HR, POS, Website) محلياً ثم رفعها على GHCR عبر skopeo | `.\scripts\fastfree_rebuild.ps1` |

### استخدام سريع

```powershell
# رفع سريع
.\scripts\fastfree_push.ps1 -Force

# رفع + نشر على السيرفر
.\scripts\fastfree_deploy.ps1

# تنظيف الـ runs الفاشلة
.\scripts\fastfree_cleanup.ps1 -All

# إعادة بناء الصور محلياً
.\scripts\fastfree_rebuild.ps1
```

## Log Files

- `TYPECHECK_LOG.md` — سجل TypeCheck
- `LINT_LOG.md` — سجل Lint
- `packages/fastfree_lowcode/AGENTS.md` — تفاصيل lowcode
- `packages/fastfree_auth/AGENTS.md` — تفاصيل auth
- `packages/fastfree_accounting/AGENTS.md` — تفاصيل accounting
- `packages/fastfree_inventory/AGENTS.md` — تفاصيل inventory
- `packages/fastfree_sales/AGENTS.md` — تفاصيل sales
- `packages/fastfree_purchase/AGENTS.md` — تفاصيل purchase
- `packages/fastfree_hr/AGENTS.md` — تفاصيل hr
- `packages/fastfree_crm/AGENTS.md` — تفاصيل crm

## ترتيب التشغيل (Boot Order)

```
fastfree-auth-init        →  API client + auth initialized
fastfree-accounting-init  →  Accounting groups + screens registered
fastfree-inventory-init  →  Inventory groups + screens registered
fastfree-sales-init      →  Sales groups + screens registered
fastfree-purchase-init   →  Purchase groups + screens registered
fastfree-hr-init         →  HR groups + screens registered
fastfree-crm-init        →  CRM groups + screens registered
i18n                     →  Translations loaded AFTER all packages register their messages
register-service-worker  →  PWA registration (last)
```
