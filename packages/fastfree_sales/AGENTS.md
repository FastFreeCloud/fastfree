# AGENTS.md — FastFree Sales

## ملاحظات سريعة
- TypeCheck: `cd apps/fastfree_ledger && pnpm vue-tsc --noEmit`
- Lint: `cd apps/fastfree_ledger && pnpm eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"`

## وصف الحزمة
حزمة `fastfree-sales` مسؤولة عن إدارة دورة مبيعات كاملة: العملاء، عروض الأسعار، أوامر البيع، فواتير المبيعات، سندات التسليم، وتقارير المبيعات. تتواصل مع السيرفر عبر API الخاص بـ Frappe (fastfree-auth).

- **الإصدار:** 0.0.1
- **نوع الوحدة:** ESM (`"type": "module"`)
- **نقطة الدخول:** `src/index.ts`
- **التبعيات:** fastfree-auth (workspace), vue, vue-router, pinia, quasar, @quasar/extras

## هيكل الملفات
```
packages/fastfree_sales/
├── package.json
└── src/
    ├── index.ts                          # التصديرات العامة
    ├── init.ts                           # تهيئة الحزمة وتسجيل الشاشات والترجمات
    ├── screens.ts                        # تسجيل الشاشات في lowcode registry
    ├── types/
    │   └── index.ts                      # تعريف الأنواع (Customer, Quotation, SalesOrder, SalesInvoice, DeliveryNote)
    ├── services/
    │   ├── index.ts                      # إعادة تصدير الخدمات
    │   ├── customer.service.ts           # CRUD للعملاء
    │   ├── quotation.service.ts          # CRUD + submit/cancel لعروض الأسعار
    │   ├── salesOrder.service.ts         # CRUD + submit/cancel لأوامر البيع
    │   ├── salesInvoice.service.ts       # CRUD + submit/cancel لفواتير المبيعات
    │   ├── delivery.service.ts           # CRUD + submit/cancel لسندات التسليم
    │   └── report.service.ts             # تقارير المبيعات
    ├── screens/
    │   ├── index.ts                      # إعادة تصدير الشاشات
    │   ├── CustomerList.vue              # شاشة قائمة العملاء
    │   ├── CustomerForm.vue              # شاشة إضافة/تعديل العميل
    │   ├── QuotationList.vue             # شاشة قائمة عروض الأسعار
    │   ├── SalesOrderList.vue            # شاشة قائمة أوامر البيع
    │   ├── SalesInvoiceList.vue          # شاشة قائمة فواتير المبيعات
    │   ├── DeliveryNoteList.vue          # شاشة قائمة سندات التسليم
    │   └── SalesReportScreen.vue         # شاشة تقارير المبيعات
    ├── stores/
    │   └── useSalesStore.ts              # Pinia store لإدارة حالة المبيعات
    └── locales/
        ├── en.ts                         # ترجمات إنجليزية (127 مفتاح)
        └── ar.ts                         # ترجمات عربية (127 مفتاح)
```

## الأنواع (Types)
جميع الأنواع في `src/types/index.ts`:

| النوع | الوصف | الحقول الرئيسية |
|-------|-------|-----------------|
| `CustomerType` | نوع العميل | `'Individual' \| 'Company'` |
| `Customer` | بيانات العميل | name, customer_name, customer_type, email, phone, address, city, country, tax_id, default_currency, is_active |
| `QuotationItem` | بند عرض السعر | name, item_code, item_name, quantity, rate, amount, discount_percentage, discount_amount, net_amount |
| `Quotation` | عرض سعر | name, customer, customer_name, transaction_date, valid_till, status, items, total, total_discount, grand_total, currency |
| `SalesOrderItem` | بند أمر البيع | name, item_code, item_name, quantity, rate, amount, discount_percentage, discount_amount, net_amount, delivered_qty, pending_qty |
| `SalesOrder` | أمر بيع | name, customer, customer_name, transaction_date, delivery_date, status, items, total, total_discount, grand_total, currency |
| `SalesInvoiceItem` | بند فاتورة المبيعات | name, item_code, item_name, quantity, rate, amount, discount_percentage, discount_amount, net_amount |
| `SalesInvoice` | فاتورة مبيعات | name, customer, customer_name, posting_date, due_date, status, items, total, total_discount, grand_total, currency |
| `DeliveryNoteItem` | بند سند التسليم | name, item_code, item_name, quantity, delivered_qty, rate, amount |
| `DeliveryNote` | سند تسليم | name, customer, customer_name, posting_date, sales_order, status, items, total, currency |

**حالات الحالة (Status):**
- Quotation: `Draft | Submitted | Cancelled | Expired | Rejected`
- SalesOrder: `Draft | Submitted | Cancelled | Partially Delivered | Delivered`
- SalesInvoice: `Draft | Submitted | Cancelled | Paid | Partially Paid`
- DeliveryNote: `Draft | Submitted | Cancelled`

## الخدمات (Services)

### customer.service.ts
| الدالة | الوصف | المعاملات |
|--------|-------|-----------|
| `getCustomers()` | جلب جميع العملاء | — |
| `getCustomer(name)` | جلب عميل واحد | name: string |
| `createCustomer(data)` | إنشاء عميل جديد | Partial\<Customer\> |
| `updateCustomer(name, data)` | تحديث بيانات العميل | name: string, Partial\<Customer\> |
| `deleteCustomer(name)` | حذف العميل | name: string |

### quotation.service.ts
| الدالة | الوصف | المعاملات |
|--------|-------|-----------|
| `getQuotations()` | جلب جميع عروض الأسعار | — |
| `getQuotation(name)` | جلب عرض سعر واحد | name: string |
| `createQuotation(data)` | إنشاء عرض سعر جديد | Partial\<Quotation\> |
| `updateQuotation(name, data)` | تحديث عرض السعر | name: string, Partial\<Quotation\> |
| `deleteQuotation(name)` | حذف عرض السعر | name: string |
| `submitQuotation(name)` | ترحيل عرض السعر | name: string |
| `cancelQuotation(name)` | إلغاء عرض السعر | name: string |

### salesOrder.service.ts
| الدالة | الوصف | المعاملات |
|--------|-------|-----------|
| `getSalesOrders()` | جلب جميع أوامر البيع | — |
| `getSalesOrder(name)` | جلب أمر بيع واحد | name: string |
| `createSalesOrder(data)` | إنشاء أمر بيع جديد | Partial\<SalesOrder\> |
| `updateSalesOrder(name, data)` | تحديث أمر البيع | name: string, Partial\<SalesOrder\> |
| `deleteSalesOrder(name)` | حذف أمر البيع | name: string |
| `submitSalesOrder(name)` | ترحيل أمر البيع | name: string |
| `cancelSalesOrder(name)` | إلغاء أمر البيع | name: string |

### salesInvoice.service.ts
| الدالة | الوصف | المعاملات |
|--------|-------|-----------|
| `getSalesInvoices()` | جلب جميع فواتير المبيعات | — |
| `getSalesInvoice(name)` | جلب فاتورة مبيعات واحدة | name: string |
| `createSalesInvoice(data)` | إنشاء فاتورة مبيعات جديدة | Partial\<SalesInvoice\> |
| `updateSalesInvoice(name, data)` | تحديث فاتورة المبيعات | name: string, Partial\<SalesInvoice\> |
| `deleteSalesInvoice(name)` | حذف فاتورة المبيعات | name: string |
| `submitSalesInvoice(name)` | ترحيل فاتورة المبيعات | name: string |
| `cancelSalesInvoice(name)` | إلغاء فاتورة المبيعات | name: string |

### delivery.service.ts
| الدالة | الوصف | المعاملات |
|--------|-------|-----------|
| `getDeliveryNotes()` | جلب جميع سندات التسليم | — |
| `getDeliveryNote(name)` | جلب سند تسليم واحد | name: string |
| `createDeliveryNote(data)` | إنشاء سند تسليم جديد | Partial\<DeliveryNote\> |
| `updateDeliveryNote(name, data)` | تحديث سند التسليم | name: string, Partial\<DeliveryNote\> |
| `deleteDeliveryNote(name)` | حذف سند التسليم | name: string |
| `submitDeliveryNote(name)` | ترحيل سند التسليم | name: string |
| `cancelDeliveryNote(name)` | إلغاء سند التسليم | name: string |

### report.service.ts
| الدالة | الوصف | المعاملات |
|--------|-------|-----------|
| `getSalesSummary(params?)` | ملخص المبيعات | { from_date?, to_date?, customer? } |
| `getTopSellingItems(params?)` | أكثر المنتجات مبيعاً | { limit?, from_date?, to_date? } |
| `getCustomerReceivables(params?)` | مستحقات العملاء | { customer? } |

## الشاشات (Screens)

| الشاشة | الملف | الوصف | التبعيات |
|--------|-------|-------|----------|
| CustomerList | `screens/CustomerList.vue` | قائمة العملاء مع بحث وحذف وتعديل | useSalesStore, CustomerForm, customer.service |
| CustomerForm | `screens/CustomerForm.vue` | نموذج إضافة/تعديل العميل (dialog) | customer.service |
| QuotationList | `screens/QuotationList.vue` | قائمة عروض الأسعار مع submit/cancel/delete | useSalesStore, useFormatNumber, useStatusHelpers, quotation.service |
| SalesOrderList | `screens/SalesOrderList.vue` | قائمة أوامر البيع مع submit/cancel/delete | useSalesStore, useFormatNumber, useStatusHelpers, salesOrder.service |
| SalesInvoiceList | `screens/SalesInvoiceList.vue` | قائمة فواتير المبيعات مع submit/cancel/delete | useSalesStore, useFormatNumber, useStatusHelpers, salesInvoice.service |
| DeliveryNoteList | `screens/DeliveryNoteList.vue` | قائمة سندات التسليم مع submit/cancel/delete | useSalesStore, useFormatNumber, useStatusHelpers, delivery.service |
| SalesReportScreen | `screens/SalesReportScreen.vue` | لوحة تقارير المبيعات (إحصائيات) | useSalesStore, useFormatNumber |

## الـ Store
**`useSalesStore`** (`stores/useSalesStore.ts`) — Pinia store بمعرّف `fastfree-sales`

### الحقول
| الحقل | النوع | الوصف |
|-------|-------|-------|
| `customers` | `Customer[]` | قائمة العملاء |
| `quotations` | `Quotation[]` | قائمة عروض الأسعار |
| `salesOrders` | `SalesOrder[]` | قائمة أوامر البيع |
| `salesInvoices` | `SalesInvoice[]` | قائمة فواتير المبيعات |
| `deliveryNotes` | `DeliveryNote[]` | قائمة سندات التسليم |
| `summary` | `SalesSummary \| null` | ملخص المبيعات |
| `loading` | `boolean` | حالة التحميل |
| `error` | `string \| null` | رسالة الخطأ |

### SalesSummary interface
```typescript
interface SalesSummary {
  totalCustomers: number
  totalSales: number
  totalInvoices: number
  outstandingAmount: number
}
```

### الدوال
| الدالة | الوصف |
|--------|-------|
| `fetchCustomers()` | جلب العملاء وتخزينهم |
| `fetchQuotations()` | جلب عروض الأسعار وتخزينها |
| `fetchSalesOrders()` | جلب أوامر البيع وتخزينها |
| `fetchSalesInvoices()` | جلب فواتير المبيعات وتخزينها |
| `fetchDeliveryNotes()` | جلب سندات التسليم وتخزينها |
| `fetchSalesSummary()` | جلب ملخص المبيعات |
| `$reset()` | إعادة تعيين جميع الحقول |

## الترجمات
- **الملف:** `locales/en.ts` (إنجليزي) + `locales/ar.ts` (عربي)
- **عدد المفاتيح:** 127 مفتاح لكل لغة
- **النطاق:** `sales.*` (يُسجَّل عبر `registerMessages('sales', ...)`)
- **الفئات:**
  - `sales.*` — مجموعة المبيعات (titles, labels)
  - `sales.customers.*` — بيانات العملاء
  - `sales.quotations.*` — عروض الأسعار
  - `sales.salesOrders.*` — أوامر البيع
  - `sales.salesInvoices.*` — فواتير المبيعات
  - `sales.deliveryNotes.*` — سندات التسليم
  - `sales.status.*` — حالات المستندات (لـ useStatusHelpers)
  - `sales.common.*` — مفاتيح مشتركة (add, edit, delete, save, cancel, submit, search, etc.)
  - `sales.fieldRequired` — رسالة التحقق من الحقول المطلوبة

## التبعيات
| التبعية | النوع | الوصف |
|---------|-------|-------|
| `fastfree-auth` | workspace | API client + وظائف CRUD (getDocList, getDoc, createDoc, updateDoc, deleteDoc, callPost, callGet) |
| `vue` | extern | Vue 3 runtime |
| `vue-router` | extern | التوجيه |
| `pinia` | extern | إدارة الحالة |
| `quasar` | extern | واجهة المستخدم (QTable, QDialog, QBtn, QInput, etc.) |
| `@quasar/extras` | extern | أيقونات MDI |

## سجل التغييرات
- **2026-08-07** — إنشاء الحزمة: Types كاملة (Customer, Quotation, SalesOrder, SalesInvoice, DeliveryNote)، 6 خدمات، 7 شاشات، 120 مفتاح ترجمة، boot file + quasar.config integration
- **2026-08-07** — إصلاحات المراجعة: إضافة 30 مفتاح ترجمة مفقود، تصحيح field names في Types، تحديث screen columns، إزالة console.error، إضافة ARIA labels، تصحيح imports
- **2026-08-08** — إصلاحات الجودة: إضافة try/catch في SalesReportScreen، استخدام shared utils (useFormatNumber, useStatusHelpers) في جميع القوائم، إضافة status keys للترجمات
