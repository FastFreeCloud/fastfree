# AGENTS.md — FastFree Purchase

## ملاحظات سريعة

- **الحزمة:** `fastfree-purchase` v0.0.1
- **النوع:** ESM (`"type": "module"`)
- **نقطة الدخول:** `src/index.ts`
- **أوامر الفحص:**
  ```bash
  cd apps/fastfree_ledger && npx vue-tsc --noEmit
  cd apps/fastfree_ledger && npm run lint:check
  ```
- **حالة текущая:** `vue-tsc: 0 errors | lint: 0 violations`
- **Boot Order:** الحزمة تتطلب `fastfree-auth-init` و `fastfree-lowcode-init` قبلها
- **المسار:** `packages/fastfree_purchase/`

---

## وصف الحزمة

حزمة إدارة المشتريات (Purchase Management) ضمن نظام FastFree Lowcode. توفر:
- إدارة الموردين (Suppliers) — CRUD كامل
- أوامر الشراء (Purchase Orders) — إنشاء / ترحيل / إلغاء / حذف
- سندات الاستلام (Purchase Receipts) — إنشاء / ترحيل / إلغاء / حذف
- فواتير الشراء (Purchase Invoices) — إنشاء / ترحيل / إلغاء / حذف
- تقارير المشتريات (Purchase Reports) — ملخص + تصدير CSV + طباعة
- لوحة معلومات (Dashboard) — إحصائيات سريعة

---

## هيكل الملفات

```
packages/fastfree_purchase/
├── package.json
└── src/
    ├── index.ts                          # Entry point — barrel export
    ├── init.ts                           # Boot function — register messages + screens
    ├── locales/
    │   ├── en.ts                         # English translations (115 keys)
    │   └── ar.ts                         # Arabic translations (115 keys)
    ├── screens/
    │   ├── index.ts                      # Screen barrel export
    │   ├── register.ts                   # Screen registration with lowcode
    │   ├── PurchaseDashboard.vue         # Dashboard — 3 KPI cards
    │   ├── SupplierList.vue              # Supplier list + delete confirmation
    │   ├── SupplierForm.vue              # Supplier create/edit dialog
    │   ├── PurchaseOrderList.vue         # Purchase orders list + submit/cancel/delete
    │   ├── PurchaseReceiptList.vue       # Purchase receipts list + submit/cancel/delete
    │   ├── PurchaseInvoiceList.vue       # Purchase invoices list + submit/cancel/delete
    │   └── PurchaseReportScreen.vue      # Reports — date filter + summary + CSV export
    ├── services/
    │   ├── index.ts                      # Service barrel export
    │   ├── supplier.service.ts           # Supplier CRUD (5 functions)
    │   ├── purchaseOrder.service.ts      # Purchase Order CRUD + submit/cancel (7 functions)
    │   ├── purchaseReceipt.service.ts    # Purchase Receipt CRUD + submit/cancel (7 functions)
    │   ├── purchaseInvoice.service.ts    # Purchase Invoice CRUD + submit/cancel (7 functions)
    │   └── report.service.ts             # Purchase summary report (1 function)
    └── types/
        └── index.ts                      # TypeScript type definitions
```

**المجموع:** 18 ملف (1 init + 1 index + 2 locales + 9 screens + 6 services + 1 types)

---

## الأنواع (Types)

### `src/types/index.ts`

| النوع | الوصف | الحقول |
|-------|-------|--------|
| `SupplierType` | نوع المورد | `'Company' \| 'Individual'` |
| `Supplier` | بيانات المورد | `name, supplierName, supplierType, mobileNo?, email?, address?, disabled` |
| `PurchaseOrderStatus` | حالة أمر الشراء | `'Draft' \| 'Submitted' \| 'Cancelled' \| 'Received'` |
| `PurchaseOrderItem` | صنف أمر الشراء | `itemCode, itemName, qty, rate, amount, receivedQty` |
| `PurchaseOrder` | أمر الشراء | `name, supplier, supplierName, transactionDate, items, total, status, docstatus` |
| `PurchaseReceiptStatus` | حالة سند الاستلام | `'Draft' \| 'Submitted' \| 'Cancelled'` |
| `PurchaseReceiptItem` | صنف سند الاستلام | `itemCode, itemName, qty, receivedQty` |
| `PurchaseReceipt` | سند الاستلام | `name, supplier, supplierName, postingDate, purchaseOrder?, items, total, status, docstatus` |
| `PurchaseInvoiceStatus` | حالة فاتورة الشراء | `'Draft' \| 'Submitted' \| 'Cancelled' \| 'Paid'` |
| `PurchaseInvoiceItem` | صنف فاتورة الشراء | `itemCode, itemName, qty, rate, amount` |
| `PurchaseInvoice` | فاتورة الشراء | `name, supplier, supplierName, postingDate, dueDate?, purchaseOrder?, purchaseReceipt?, items, total, outstandingAmount, status, docstatus` |
| `PurchaseSummary` | ملخص التقارير | `totalPurchases, totalInvoices, totalSuppliers` |
| `ApiResponse<T>` | استجابة API عامة | `success, data?, error? { code, message, details? }` |

**المجموع:** 13 نوع

---

## الخدمات (Services)

### `src/services/supplier.service.ts` — 5 دوال

| الدالة | الخطوة | الوصف |
|--------|--------|-------|
| `getSuppliers()` | `getDocList` | جلب جميع الموردين (حد أقصى 500) — ترتيب حسب `supplier_name` |
| `getSupplier(name)` | `getDoc` | جلب مورد واحد بالاسم |
| `createSupplier(data)` | `createDoc` | إنشاء مورد جديد |
| `updateSupplier(name, data)` | `updateDoc` | تعديل بيانات مورد |
| `deleteSupplier(name)` | `deleteDoc` | حذف مورد |

### `src/services/purchaseOrder.service.ts` — 7 دوال

| الدالة | الخطوة | الوصف |
|--------|--------|-------|
| `getPurchaseOrders()` | `getDocList` | جلب أوامر الشراء (حد أقصى 500) — ترتيب حسب `transaction_date` — حقول: name, supplier, transaction_date, grand_total, status |
| `getPurchaseOrder(name)` | `getDoc` | جلب أمر شراء واحد |
| `createPurchaseOrder(data)` | `createDoc` | إنشاء أمر شراء جديد |
| `updatePurchaseOrder(name, data)` | `updateDoc` | تعديل أمر شراء |
| `deletePurchaseOrder(name)` | `deleteDoc` | حذف أمر شراء |
| `submitPurchaseOrder(name)` | `callPost('frappe.client.submit_single')` | ترحيل أمر شراء |
| `cancelPurchaseOrder(name)` | `callPost('frappe.client.cancel')` | إلغاء أمر شراء |

### `src/services/purchaseReceipt.service.ts` — 7 دوال

| الدالة | الخطوة | الوصف |
|--------|--------|-------|
| `getPurchaseReceipts()` | `getDocList` | جلب سندات الاستلام (حد أقصى 500) — ترتيب حسب `posting_date` — حقول: name, supplier, posting_date, grand_total, status |
| `getPurchaseReceipt(name)` | `getDoc` | جلب سند استلام واحد |
| `createPurchaseReceipt(data)` | `createDoc` | إنشاء سند استلام جديد |
| `updatePurchaseReceipt(name, data)` | `updateDoc` | تعديل سند استلام |
| `deletePurchaseReceipt(name)` | `deleteDoc` | حذف سند استلام |
| `submitPurchaseReceipt(name)` | `callPost('frappe.client.submit_single')` | ترحيل سند استلام |
| `cancelPurchaseReceipt(name)` | `callPost('frappe.client.cancel')` | إلغاء سند استلام |

### `src/services/purchaseInvoice.service.ts` — 7 دوال

| الدالة | الخطوة | الوصف |
|--------|--------|-------|
| `getPurchaseInvoices()` | `getDocList` | جلب فواتير الشراء (حد أقصى 500) — ترتيب حسب `posting_date` — حقول: name, supplier, posting_date, grand_total, outstanding_amount, status |
| `getPurchaseInvoice(name)` | `getDoc` | جلب فاتورة شراء واحدة |
| `createPurchaseInvoice(data)` | `createDoc` | إنشاء فاتورة شراء جديدة |
| `updatePurchaseInvoice(name, data)` | `updateDoc` | تعديل فاتورة شراء |
| `deletePurchaseInvoice(name)` | `deleteDoc` | حذف فاتورة شراء |
| `submitPurchaseInvoice(name)` | `callPost('frappe.client.submit_single')` | ترحيل فاتورة شراء |
| `cancelPurchaseInvoice(name)` | `callPost('frappe.client.cancel')` | إلغاء فاتورة شراء |

### `src/services/report.service.ts` — 1 دالة

| الدالة | الخطوة | الوصف |
|--------|--------|-------|
| `getPurchaseSummary()` | `callGet('purchase.report.purchase_summary')` | جلب ملخص المشتريات |

**المجموع:** 27 دالة خدمة

---

## الشاشات (Screens)

### `src/screens/register.ts` — تسجيل الشاشات

- **المجموعة:** `purchase.purchase` — أيقونة: `mdi-cart`
- **الشاشة:** `purchase-dashboard`, `purchase-suppliers`, `purchase-orders`, `purchase-receipts`, `purchase-invoices`, `purchase-reports`
- **التسجيل:** عبر `defineAsyncComponent` (lazy loading)

### الشاشات التفصيلية

#### 1. `PurchaseDashboard.vue` — لوحة المعلومات
- **المسار:** `screens/PurchaseDashboard.vue`
- **الأيقونة:** `mdi-view-dashboard`
- **المحتوى:** 3 بطاقات KPI (إجمالي المشتريات، إجمالي الفواتير، إجمالي الموردين)
- **المكتبات:** `useLcI18n`, `useFormatNumber`, `getPurchaseSummary`
- **الوظائف:** `loadSummary()` — تحميل البيانات عند `onMounted`

#### 2. `SupplierList.vue` — قائمة الموردين
- **المسار:** `screens/SupplierList.vue`
- **الأيقونة:** `mdi-truck`
- **المحتوى:** جدول موردين + بحث + إضافة + تعديل + حذف مع تأكيد
- **الاعمدة:** `supplierName`, `supplierType` (badge), `email`, `mobileNo`, `actions`
- **المكتبات:** `useLcI18n`, `getSuppliers`, `apiDeleteSupplier`, `SupplierForm`
- **الوظائف:** `fetchSuppliers()`, `openAdd()`, `editSupplier()`, `deleteSupplier()`, `confirmDeleteSupplier()`, `onSaved()`, `translateSupplierType()`
- **النماذج:** `SupplierForm` dialog

#### 3. `SupplierForm.vue` — نموذج المورد
- **المسار:** `screens/SupplierForm.vue`
- **النوع:** `q-dialog` مع `q-form`
- **المكتبات:** `useLcI18n`, `createSupplier`, `updateSupplier`
- **الحقول:** `supplierName` (مطلوب), `supplierType` (select), `mobileNo`, `email` (email validation), `address`
- **الوظائف:** `save()`, `close()`, `resetForm()`
- **الـ Props:** `modelValue` (boolean), `supplier?` (Supplier | null)
- **الـ Events:** `update:modelValue`, `saved`

#### 4. `PurchaseOrderList.vue` — قائمة أوامر الشراء
- **المسار:** `screens/PurchaseOrderList.vue`
- **الأيقونة:** `mdi-cart-check`
- **المحتوى:** جدول أوامر شراء + بحث + ترحيل + إلغاء + حذف مع تأكيد
- **الاعمدة:** `name`, `supplier`, `transactionDate`, `total` (formatNumber), `status` (badge), `actions`
- **المكتبات:** `useLcI18n`, `useFormatNumber`, `useStatusHelpers`, `getPurchaseOrders`, `apiSubmitPurchaseOrder`, `apiCancelPurchaseOrder`, `apiDeletePurchaseOrder`
- **الوظائف:** `fetchOrders()`, `submitOrder()`, `confirmSubmitOrder()`, `cancelOrder()`, `confirmCancelOrder()`, `deleteOrder()`, `confirmDeleteOrder()`
- **النماذج:** 3 dialogs (submit, cancel, delete confirmation)

#### 5. `PurchaseReceiptList.vue` — قائمة سندات الاستلام
- **المسار:** `screens/PurchaseReceiptList.vue`
- **الأيقونة:** `mdi-package-down`
- **المحتوى:** جدول سندات استلام + بحث + ترحيل + إلغاء + حذف مع تأكيد
- **الاعمدة:** `name`, `supplier`, `postingDate`, `total` (formatNumber), `status` (badge), `actions`
- **المكتبات:** `useLcI18n`, `useFormatNumber`, `useStatusHelpers`, `getPurchaseReceipts`, `apiSubmitPurchaseReceipt`, `apiCancelPurchaseReceipt`, `apiDeletePurchaseReceipt`
- **الوظائف:** `fetchReceipts()`, `submitReceipt()`, `confirmSubmitReceipt()`, `cancelReceipt()`, `confirmCancelReceipt()`, `deleteReceipt()`, `confirmDeleteReceipt()`
- **النماذج:** 3 dialogs (submit, cancel, delete confirmation)

#### 6. `PurchaseInvoiceList.vue` — قائمة فواتير الشراء
- **المسار:** `screens/PurchaseInvoiceList.vue`
- **الأيقونة:** `mdi-receipt`
- **المحتوى:** جدول فواتير شراء + بحث + ترحيل + إلغاء + حذف مع تأكيد
- **الاعمدة:** `name`, `supplier`, `postingDate`, `total` (formatNumber), `outstandingAmount` (formatNumber), `status` (badge), `actions`
- **المكتبات:** `useLcI18n`, `useFormatNumber`, `useStatusHelpers`, `getPurchaseInvoices`, `apiSubmitPurchaseInvoice`, `apiCancelPurchaseInvoice`, `apiDeletePurchaseInvoice`
- **الوظائف:** `fetchInvoices()`, `submitInvoice()`, `confirmSubmitInvoice()`, `cancelInvoice()`, `confirmCancelInvoice()`, `deleteInvoice()`, `confirmDeleteInvoice()`
- **النماذج:** 3 dialogs (submit, cancel, delete confirmation)

#### 7. `PurchaseReportScreen.vue` — شاشة التقارير
- **المسار:** `screens/PurchaseReportScreen.vue`
- **الأيقونة:** `mdi-chart-bar`
- **المحتوى:** فلتر تاريخ + 4 بطاقات KPI + جدول ملخص حسب الحالة + طباعة + تصدير CSV
- **الاعمدة:** `status`, `count`
- **المكتبات:** `useLcI18n`, `useFormatNumber`, `getPurchaseSummary`
- **الوظائف:** `loadSummary()`, `printReport()`, `exportReport()`
- **البيانات:** `totalPurchases`, `totalInvoices`, `totalSuppliers`, `overdueAmount`, `pendingOrders`, `completedOrders`, `overdueOrders`

**المجموع:** 7 شاشات

---

## الـ Store

لا يُستخدم Pinia Store في هذه الحزمة. البيانات تُدار مباشرة عبر Services + `ref()` في كل شاشة.

---

## الترجمات

### `src/locales/en.ts` — 115 مفتاح إنجليزي

| المجموعة | العدد | الأمثلة |
|----------|-------|---------|
| `groups.*` | 1 | `groups.purchase` |
| `screens.*` | 6 | `screens.purchase-suppliers`, `screens.purchase-orders`, `screens.purchase-receipts`, `screens.purchase-invoices`, `screens.purchase-reports`, `screens.purchase-dashboard` |
| `purchase.*` | 50 | `purchase.supplier`, `purchase.suppliers`, `purchase.supplierName`, `purchase.supplierType`, `purchase.mobileNo`, `purchase.email`, `purchase.address`, `purchase.addSupplier`, `purchase.editSupplier`, `purchase.purchaseOrder`, `purchase.purchaseOrders`, `purchase.addPurchaseOrder`, `purchase.transactionDate`, `purchase.total`, `purchase.receivedQty`, `purchase.purchaseReceipt`, `purchase.purchaseReceipts`, `purchase.addPurchaseReceipt`, `purchase.postingDate`, `purchase.purchaseInvoice`, `purchase.purchaseInvoices`, `purchase.addPurchaseInvoice`, `purchase.dueDate`, `purchase.outstandingAmount`, `purchase.totalPurchases`, `purchase.totalInvoices`, `purchase.totalSuppliers`, `purchase.items`, `purchase.itemCode`, `purchase.itemName`, `purchase.quantity`, `purchase.rate`, `purchase.amount`, `purchase.addItem`, `purchase.company`, `purchase.purchaseReports`, `purchase.reportType`, `purchase.submitOrderConfirm`, `purchase.cancelOrderConfirm`, `purchase.orderSubmitted`, `purchase.orderCancelled`, `purchase.submitReceiptConfirm`, `purchase.cancelReceiptConfirm`, `purchase.receiptSubmitted`, `purchase.receiptCancelled`, `purchase.submitInvoiceConfirm`, `purchase.cancelInvoiceConfirm`, `purchase.invoiceSubmitted`, `purchase.invoiceCancelled`, `purchase.overdueAmount`, `purchase.summaryByStatus`, `purchase.count` |
| `purchase.draft/submitted/...` | 8 | `purchase.draft`, `purchase.submitted`, `purchase.cancelled`, `purchase.received`, `purchase.paid`, `purchase.pending`, `purchase.completed`, `purchase.overdue` |
| `purchase.status.*` | 8 | `purchase.status.draft`, `purchase.status.submitted`, `purchase.status.cancelled`, `purchase.status.received`, `purchase.status.paid`, `purchase.status.pending`, `purchase.status.completed`, `purchase.status.overdue` |
| `common.*` | 28 | `common.add`, `common.edit`, `common.delete`, `common.save`, `common.cancel`, `common.submit`, `common.search`, `common.name`, `common.status`, `common.date`, `common.actions`, `common.noData`, `common.confirmDelete`, `common.confirm`, `common.refresh`, `common.error`, `common.draft`, `common.submitted`, `common.cancelled`, `common.paid`, `common.received`, `common.company`, `common.individual`, `common.print`, `common.export`, `common.filter`, `common.dateFrom`, `common.dateTo` |
| `validation.*` | 1 | `validation.fieldRequired` |

### `src/locales/ar.ts` — 115 مفتاح عربي

نفس المفاتيح بالضبط مع الترجمات العربية (المشتريات، الموردون، أوامر الشراء، سندات الاستلام، فواتير الشراء، التقارير).

**المجموع:** 230 مفتاح ترجمة (115 EN + 115 AR)

---

## التبعيات

### من `package.json`

| الحزمة | النوع | الإصدار |
|--------|-------|---------|
| `fastfree-auth` | dependency | `workspace:*` |
| `vue` | dependency | `^3.5.22` |
| `vue-router` | dependency | `^5.0.6` |
| `pinia` | dependency | `^4.0.2` |
| `quasar` | dependency | `^2.23.1` |
| `@quasar/extras` | dependency | `^2.0.0` |

### من الكود (imports)

| المصدر | الاستيراد | الملفات |
|--------|-----------|---------|
| `fastfree-auth` | `getDocList`, `getDoc`, `createDoc`, `updateDoc`, `deleteDoc`, `callPost`, `callGet`, `ApiResponse` | كل services |
| `quasar-app-extension-fastfree-lowcode/.../i18n` | `useLcI18n` | كل screens |
| `quasar-app-extension-fastfree-lowcode/.../useFormatNumber` | `useFormatNumber` | Dashboard, OrderList, ReceiptList, InvoiceList, ReportScreen |
| `quasar-app-extension-fastfree-lowcode/.../useStatusHelpers` | `useStatusHelpers` | OrderList, ReceiptList, InvoiceList |
| `vue` | `ref`, `computed`, `reactive`, `watch`, `onMounted`, `defineAsyncComponent` | كل screens + init |

---

## سجل التغييرات

### 2026-08-08 — الإصدار الحالي
- **18 ملف** في الحزمة
- **27 دالة** خدمة
- **7 شاشات** Vue
- **13 نوع** TypeScript
- **115 مفتاح** ترجمة (EN + AR)
- **0 أخطاء** vue-tsc
- **0 violations** lint
- **Boot:** `initFastFreePurchase()` — تسجيل الترجمات + الشاشات مع lowcode

### 2026-08-08 — جلسة إصلاح شاملة (8 إصلاحات)
1. `PurchaseReportScreen` — إعادة كتابة كشاشة تقارير مميزة (بديل 100% copy)
2. `SupplierForm` — ترجمة `supplierTypeOptions` عبر `common.company/individual`
3. `PurchaseDashboard` — استخدام `useFormatNumber` المشترك
4. `PurchaseOrderList` — `useFormatNumber` + `useStatusHelpers` مشترك
5. `PurchaseReceiptList` — `useFormatNumber` + `useStatusHelpers` مشترك
6. `PurchaseInvoiceList` — `useFormatNumber` + `useStatusHelpers` مشترك
7. `locales/en.ts` — إضافة 15 مفتاح جديد (status keys + report keys)
8. `locales/ar.ts` — إضافة 15 مفتاح جديد (status keys + report keys)

### 2026-08-07 — جلسة بناء purchase (الأصل)
1. إنشاء Types كاملة (Supplier, PurchaseOrder, PurchaseReceipt, PurchaseInvoice)
2. 5 خدمات (supplier, purchaseOrder, purchaseReceipt, purchaseInvoice, report)
3. 7 شاشات (PurchaseDashboard, SupplierList, SupplierForm, PurchaseOrderList, PurchaseReceiptList, PurchaseInvoiceList, PurchaseReportScreen)
4. 110+ مفتاح ترجمة (EN + AR)
5. Boot file + quasar.config integration
