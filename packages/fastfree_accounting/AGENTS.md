# AGENTS.md — FastFree Accounting

## ملاحظات سريعة

```bash
# TypeCheck — صفر أخطاء
cd apps/fastfree_ledger && npx vue-tsc --noEmit

# Lint Check — صفر violations
cd apps/fastfree_ledger && npm run lint:check

# Dev Server
cd apps/fastfree_ledger && npm run dev
```

## وصف الحزمة

بكج المحاسحة الكاملة — شجرة الحسابات، القيود اليومية، سندات الدفع، دفتر الأستاذ العام، مراكز التكلفة، السنوات المالية، التقارير المالية، والضرائب.

- **الاسم:** `fastfree-accounting`
- **الإصدار:** `0.0.1`
- **Entry Point:** `src/index.ts`
- **الاسم النطاسي:** `accounting.*`
- **عدد ملفات المصدر:** 30 ملف
- **عدد الشاشات المسجلة:** 8 شاشات (+ 5 مكونات مساعدة)
- **عدد الخدمات:** 8 خدمات (35 دالة)
- **عدد مفاتيح الترجمة:** ~135 مفتاح (EN + AR)

## هيكل الملفات

```
src/
├── index.ts                          # Entry point — تصديرات عامة
├── init.ts                           # التهيئة — تحميل سجل lowcode + تسجيل الرسائل والشاشات
├── screens.ts                        # تسجيل 8 شاشات في المجموعة
├── locales/
│   ├── en.ts                         # ترجمات إنجليزية (~135 مفتاح)
│   └── ar.ts                         # ترجمات عربية (~135 مفتاح)
├── types/
│   └── index.ts                      # جميع الأنواع TypeScript (197 سطر)
├── services/
│   ├── index.ts                      # Barrel export لـ 8 خدمات
│   ├── account.service.ts            # CRUD الحسابات + جلب الأبناء
│   ├── journal.service.ts            # CRUD القيود اليومية + ترحيل/إلغاء
│   ├── payment.service.ts            # CRUD سندات الدفع + ترحيل
│   ├── ledger.service.ts             # دفتر الأستاذ العام
│   ├── costCenter.service.ts         # CRUD مراكز التكلفة
│   ├── fiscalYear.service.ts         # CRUD السنوات المالية + إغلاق
│   ├── report.service.ts             # التقارير المالية (6 أنواع)
│   └── tax.service.ts                # قوالب الضرائب + قواعد + حسابات
├── stores/
│   └── useAccountingStore.ts         # Pinia store (226 سطر)
└── screens/
    ├── index.ts                      # Barrel export لـ 8 شاشات
    ├── AccountingDashboard.vue       # لوحة المعلومات (90 سطر)
    ├── ChartOfAccounts.vue           # شجرة الحسابات (268 سطر)
    ├── TreeNode.vue                  # مكون شجري تكراري (296 سطر)
    ├── JournalEntryForm.vue          # نموذج القيد اليومي (230 سطر)
    ├── JournalEntryList.vue          # قائمة القيود اليومية (245 سطر)
    ├── PaymentEntryForm.vue          # نموذج سند الدفع (203 سطر)
    ├── PaymentEntryList.vue          # قائمة سندات الدفع (260 سطر)
    ├── GeneralLedger.vue             # دفتر الأستاذ العام (86 سطر)
    ├── CostCenterForm.vue            # نموذج مركز التكلفة (120 سطر)
    ├── CostCenterList.vue            # قائمة مراكز التكلفة (118 سطر)
    ├── FiscalYearForm.vue            # نموذج السنة المالية (106 سطر)
    ├── FiscalYearList.vue            # قائمة السنوات المالية (119 سطر)
    └── FinancialReports.vue          # التقارير المالية (85 سطر)
```

## الأنواع (Types)

### أنواع الحسابات

| النوع | التعريف |
|-------|---------|
| `AccountType` | `'Asset' \| 'Liability' \| 'Equity' \| 'Income' \| 'Expense'` |
| `AccountRootType` | `'Balance Sheet' \| 'Profit and Loss'` |
| `Account` | `{ name, accountName, accountType, rootType, parentAccount?, isGroup, company?, costCenter?, openingBalance, accountCurrency?, disabled, children? }` |

### أنواع القيود اليومية

| النوع | التعريف |
|-------|---------|
| `JournalEntryStatus` | `'Draft' \| 'Submitted' \| 'Cancelled'` |
| `JournalEntryAccount` | `{ account, debit, credit, costCenter?, referenceType?, referenceName?, remark? }` |
| `JournalEntry` | `{ name, title?, postingDate, entryType, status, accounts, totalDebit, totalCredit, company?, remark?, amendedFrom? }` |

**JournalEntry.entryType:** `'Journal Entry' \| 'Bank Entry' \| 'Cash Entry'`

### أنواع سندات الدفع

| النوع | التعريف |
|-------|---------|
| `PaymentType` | `'Pay' \| 'Receive' \| 'Internal Transfer'` |
| `PaymentStatus` | `'Draft' \| 'Submitted' \| 'Cancelled'` |
| `PaymentEntry` | `{ name, paymentType, partyType, party, postingDate, modeOfPayment, partyAccount, paidFrom?, paidTo?, paidAmount, receivedAmount, referenceName?, referenceType?, status, company?, remarks? }` |

**PaymentEntry.partyType:** `'Customer' \| 'Supplier' \| 'Employee'`

### أنواع دفتر الأستاذ

| النوع | التعريف |
|-------|---------|
| `LedgerEntry` | `{ date, voucherType, voucherNumber, account, debit, credit, balance, party?, costCenter?, remarks? }` |

### أنواع مراكز التكلفة

| النوع | التعريف |
|-------|---------|
| `CostCenter` | `{ name, costCenterName, costCenterCode, parent?, company?, budget, disabled }` |

### أنواع السنوات المالية

| النوع | التعريف |
|-------|---------|
| `FiscalYearStatus` | `'Open' \| 'Closed'` |
| `FiscalYear` | `{ name, yearStartDate, yearEndDate, status, isCurrent }` |

### أنواع التقارير المالية

| النوع | التعريف |
|-------|---------|
| `ReportType` | `'trial_balance' \| 'profit_and_loss' \| 'balance_sheet' \| 'general_ledger' \| 'accounts_receivable' \| 'accounts_payable'` |
| `ReportFilter` | `{ reportType, fromDate, toDate, costCenter?, fiscalYear? }` |
| `ReportRow` | `{ account?, label, debit, credit, balance, indent }` |
| `FinancialReport` | `{ reportType, filter, rows, totalDebit, totalCredit, generatedAt }` |

### أنواع الضرائب

| النوع | التعريف |
|-------|---------|
| `TaxType` | `'Value Added Tax' \| 'Withholding Tax' \| 'Custom'` |
| `TaxTemplate` | `{ name, templateName, taxType, rate, account, description?, company? }` |
| `TaxRule` | `{ name, ruleName, taxTemplate, itemGroup?, customer?, supplier?, priority, validFrom?, validTo? }` |

### نوع الاستجابة العام

```typescript
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: { code: string; message: string; details?: unknown }
}
```

## الخدمات (Services)

### account.service.ts — خدمة الحسابات (6 دوال)

| الدالة | المعاملات | النوع |
|--------|-----------|-------|
| `getAccounts(company?)` | company?: string | `Promise<ApiResponse<Account[]>>` |
| `getAccount(name)` | name: string | `Promise<ApiResponse<Account>>` |
| `createAccount(data)` | data: Partial\<Account\> | `Promise<ApiResponse<Account>>` |
| `updateAccount(name, data)` | name: string, data: Partial\<Account\> | `Promise<ApiResponse<Account>>` |
| `deleteAccount(name)` | name: string | `Promise<ApiResponse<void>>` |
| `getAccountChildren(parent)` | parent: string | `Promise<ApiResponse<Account[]>>` |

**المصدر:** `getDocList`, `getDoc`, `createDoc`, `updateDoc`, `deleteDoc` من `fastfree-auth`

### journal.service.ts — خدمة القيود اليومية (7 دوال)

| الدالة | المعاملات | النوع |
|--------|-----------|-------|
| `getJournalEntries(filters?)` | filters?: Record\<string, unknown\> | `Promise<ApiResponse<JournalEntry[]>>` |
| `getJournalEntry(name)` | name: string | `Promise<ApiResponse<JournalEntry>>` |
| `createJournalEntry(data)` | data: Partial\<JournalEntry\> | `Promise<ApiResponse<JournalEntry>>` |
| `updateJournalEntry(name, data)` | name: string, data: Partial\<JournalEntry\> | `Promise<ApiResponse<JournalEntry>>` |
| `deleteJournalEntry(name)` | name: string | `Promise<ApiResponse<void>>` |
| `submitJournalEntry(name)` | name: string | `Promise<ApiResponse<JournalEntry>>` |
| `cancelJournalEntry(name)` | name: string | `Promise<ApiResponse<JournalEntry>>` |

**التسلسل:** `postingDate desc`
**النهاية:** `callPost` لـ submit/cancel عبر `accounts.doctype.journal_entry.journal_entry`

### payment.service.ts — خدمة سندات الدفع (6 دوال)

| الدالة | المعاملات | النوع |
|--------|-----------|-------|
| `getPaymentEntries(filters?)` | filters?: Record\<string, unknown\> | `Promise<ApiResponse<PaymentEntry[]>>` |
| `getPaymentEntry(name)` | name: string | `Promise<ApiResponse<PaymentEntry>>` |
| `createPaymentEntry(data)` | data: Partial\<PaymentEntry\> | `Promise<ApiResponse<PaymentEntry>>` |
| `updatePaymentEntry(name, data)` | name: string, data: Partial\<PaymentEntry\> | `Promise<ApiResponse<PaymentEntry>>` |
| `deletePaymentEntry(name)` | name: string | `Promise<ApiResponse<void>>` |
| `submitPaymentEntry(name)` | name: string | `Promise<ApiResponse<PaymentEntry>>` |

**التسلسل:** `postingDate desc`
**النهاية:** `callPost` عبر `accounts.doctype.payment_entry.payment_entry.submit_payment_entry`

### ledger.service.ts — خدمة دفتر الأستاذ (1 دالة)

| الدالة | المعاملات | النوع |
|--------|-----------|-------|
| `getGeneralLedger(account, fromDate, toDate, costCenter?)` | account: string, fromDate: string, toDate: string, costCenter?: string | `Promise<ApiResponse<LedgerEntry[]>>` |

**النهاية:** `callGet` عبر `accounts.general_ledger.get_ledger_entries`

### costCenter.service.ts — خدمة مراكز التكلفة (5 دوال)

| الدالة | المعاملات | النوع |
|--------|-----------|-------|
| `getCostCenters(company?)` | company?: string | `Promise<ApiResponse<CostCenter[]>>` |
| `getCostCenter(name)` | name: string | `Promise<ApiResponse<CostCenter>>` |
| `createCostCenter(data)` | data: Partial\<CostCenter\> | `Promise<ApiResponse<CostCenter>>` |
| `updateCostCenter(name, data)` | name: string, data: Partial\<CostCenter\> | `Promise<ApiResponse<CostCenter>>` |
| `deleteCostCenter(name)` | name: string | `Promise<ApiResponse<void>>` |

### fiscalYear.service.ts — خدمة السنوات المالية (4 دوال)

| الدالة | المعاملات | النوع |
|--------|-----------|-------|
| `getFiscalYears()` | — | `Promise<ApiResponse<FiscalYear[]>>` |
| `getFiscalYear(name)` | name: string | `Promise<ApiResponse<FiscalYear>>` |
| `createFiscalYear(data)` | data: Partial\<FiscalYear\> | `Promise<ApiResponse<FiscalYear>>` |
| `closeFiscalYear(name)` | name: string | `Promise<ApiResponse<FiscalYear>>` |

**التسلسل:** `yearStartDate desc`
**النهاية:** `callPost` عبر `accounts.doctype.fiscal_year.fiscal_year.close_fiscal_year`

### report.service.ts — خدمة التقارير المالية (1 دالة)

| الدالة | المعاملات | النوع |
|--------|-----------|-------|
| `generateReport(filter)` | filter: ReportFilter | `Promise<ApiResponse<FinancialReport>>` |

**النهايات الـ 6:**
- `trial_balance` → `accounts.report.trial_balance.trial_balance.execute`
- `profit_and_loss` → `accounts.report.profit_and_loss.profit_and_loss.execute`
- `balance_sheet` → `accounts.report.balance_sheet.balance_sheet.execute`
- `general_ledger` → `accounts.report.general_ledger.general_ledger.execute`
- `accounts_receivable` → `accounts.report.accounts_receivable.accounts_receivable.execute`
- `accounts_payable` → `accounts.report.accounts_payable.accounts_payable.execute`

### tax.service.ts — خدمة الضرائب (9 دوال)

| الدالة | المعاملات | النوع |
|--------|-----------|-------|
| `getTaxTemplates(company?)` | company?: string | `Promise<ApiResponse<TaxTemplate[]>>` |
| `getTaxTemplate(name)` | name: string | `Promise<ApiResponse<TaxTemplate>>` |
| `createTaxTemplate(data)` | data: Partial\<TaxTemplate\> | `Promise<ApiResponse<TaxTemplate>>` |
| `updateTaxTemplate(name, data)` | name: string, data: Partial\<TaxTemplate\> | `Promise<ApiResponse<TaxTemplate>>` |
| `deleteTaxTemplate(name)` | name: string | `Promise<ApiResponse<void>>` |
| `getTaxRules()` | — | `Promise<ApiResponse<TaxRule[]>>` |
| `createTaxRule(data)` | data: Partial\<TaxRule\> | `Promise<ApiResponse<TaxRule>>` |
| `deleteTaxRule(name)` | name: string | `Promise<ApiResponse<void>>` |
| `calculateTax(amount, rate)` | amount: number, rate: number | `number` |
| `calculateTaxInclusive(amount, rate)` | amount: number, rate: number | `number` |

**الدوال الحسابية:**
- `calculateTax`: `(amount * rate / 100)` مقرب لـ 2 عشري
- `calculateTaxInclusive`: `(amount / (1 + rate / 100))` مقرب لـ 2 عشري

## الشاشات (Screens)

### الشاشات المسجلة (8)

| نوع الشاشة | الملف | الأيقونة | الوصف |
|------------|-------|---------|-------|
| `accounting-dashboard` | `AccountingDashboard.vue` | `mdi-view-dashboard` | لوحة معلومات المحاسبة — إحصائيات + السنة المالية الحالية |
| `accounting-chart` | `ChartOfAccounts.vue` | `mdi-sitemap` | شجرة الحسابات — عرض شجري + بحث + إضافة حساب |
| `accounting-journal` | `JournalEntryList.vue` | `mdi-book-open` | قائمة القيود اليومية — جدول + حالة + ترحيل/إلغاء |
| `accounting-payment` | `PaymentEntryList.vue` | `mdi-cash-multiple` | قائمة سندات الدفع — جدول + حالة + ترحيل/حذف |
| `accounting-ledger` | `GeneralLedger.vue` | `mdi-book-open-variant` | دفتر الأستاذ العام — فلتر حساب + تواريخ |
| `accounting-cost-center` | `CostCenterList.vue` | `mdi-domain` | قائمة مراكز التكلفة — جدول + CRUD |
| `accounting-fiscal-year` | `FiscalYearList.vue` | `mdi-calendar-range` | قائمة السنوات المالية — جدول + إغلاق |
| `accounting-reports` | `FinancialReports.vue` | `mdi-chart-bar` | التقارير المالية — 6 أنواع تقارير |

### المكونات المساعدة (5)

| الملف | المستخدم في | الوصف |
|-------|------------|-------|
| `TreeNode.vue` | `ChartOfAccounts.vue` | مكون شجري تكراري — عقدة واحدة مع توسيع/طي |
| `JournalEntryForm.vue` | `JournalEntryList.vue` | نموذج إنشاء قيد يومي — صفوف حسابات + تحقق |
| `PaymentEntryForm.vue` | `PaymentEntryList.vue` | نموذج إنشاء سند دفع — Pay/Receive/Transfer |
| `CostCenterForm.vue` | `CostCenterList.vue` | نموذج إنشاء مركز تكلفة |
| `FiscalYearForm.vue` | `FiscalYearList.vue` | نموذج إنشاء سنة مالية — تواريخ + سنة حالية |

### تفاصيل الشاشات

#### AccountingDashboard.vue (90 سطر)
- **الحالة:** `useAccountingStore` — `fetchAccounts`, `fetchJournalEntries`, `fetchFiscalYears` عبر `Promise.all`
- **العرض:** 4 بطاقات إحصائية (إجمالي الحسابات، القيود، المدين، الدائن) + معلومات السنة المالية
- **الدوال:** `translateStatus(status)`, `formatNumber(n)`

#### ChartOfAccounts.vue (268 سطر)
- **الحالة:** `useAccountingStore` — `fetchAccounts`
- **المكونات:** `TreeNode` (شجري تكراري)
- **الميزات:** بحث في الشجرة، فلترة، توسيع/طي، إضافة حساب عبر dialog
- **التحقق:** `fieldRequired` على accountName و accountType
- **الدوال:** `filterTree(nodes, query)`, `expandAllNodes(nodes)`, `toggleNode(nodeName)`, `saveAccount()`
- **المتغيرات:** `search`, `showAdd`, `expandedNodes`, `newAccount`, `accountTypeOptions`, `rootTypeOptions`, `totalAccounts`, `filteredTree`

#### TreeNode.vue (296 سطر)
- **الخصائص:** `node: Account & { children? }`, `depth: number`, `expandedNodes: Record<string, boolean>`
- **الأحداث:** `toggle(nodeName)`
- **الميزات:** مؤشر لوني حسب النوع، أيقونة مختلفة للمجموعات/الحسابات، badge عدد الأبناء، خطوط توصيل، انتقال توسيع
- **الألوان:** Asset=#1976d2, Liability=#d32f2f, Equity=#7b1fa2, Income=#388e3c, Expense=#f57c00

#### JournalEntryForm.vue (230 سطر)
- **النوع:** Dialog (modelValue + saved)
- **الحقوق:** postingDate, entryType (Journal/Bank/Cash), company, remark, accounts[]
- **التحقق:** fieldRequired, atLeastTwoRows (2 صفوف حسابين على الأقل), debitCreditMustMatch, debit/credit > 0
- **الدوال:** `addRow()`, `removeRow(index)`, `resetForm()`, `close()`, `save()`
- **المتغيرات:** `saving`, `entryTypeOptions`, `accountColumns`, `form` (reactive), `totalDebit`, `totalCredit`

#### JournalEntryList.vue (245 سطر)
- **الحالة:** `useAccountingStore` — `fetchJournalEntries`
- **الأعمدة:** name, postingDate, entryType, totalDebit, totalCredit, status, actions
- **الأحداث:** view (dialog تفاصيل), edit (dialog نموذج), submit (تأكيد), cancel (تأكيد)
- **الدوال:** `translateStatus(status)`, `statusColor(status)`, `formatNumber(n)`, `viewEntry(entry)`, `editEntry(entry)`, `submitEntry(entry)`, `confirmSubmitEntry()`, `cancelEntry(entry)`, `confirmCancelEntry()`, `onSaved()`
- **ARIA:** view, edit, submit, cancel على كل الأزرار

#### PaymentEntryForm.vue (203 سطر)
- **النوع:** Dialog (modelValue + saved)
- **الحقوق:** paymentType (Pay/Receive/Internal Transfer), partyType (Customer/Supplier/Employee), party, postingDate, modeOfPayment, partyAccount, paidAmount, receivedAmount, paidFrom (Pay فقط), paidTo (Receive فقط), company, remarks
- **التحقق:** party مطلوب, partyAccount مطلوب, المبلغ > 0 حسب النوع
- **الدوال:** `resetForm()`, `close()`, `save()`
- **المتغيرات:** `saving`, `paymentTypeOptions`, `partyTypeOptions`, `form` (reactive)

#### PaymentEntryList.vue (260 سطر)
- **الحالة:** `useAccountingStore` — `fetchPaymentEntries`
- **الأعمدة:** name, postingDate, party, paymentType, paidAmount, modeOfPayment, status, actions
- **الأحداث:** view (dialog تفاصيل), submit (تأكيد), delete (تأكيد)
- **الدوال:** `translateStatus(status)`, `translatePaymentType(type)`, `statusColor(status)`, `formatNumber(n)`, `viewEntry(entry)`, `submitEntry(entry)`, `confirmSubmitEntry()`, `deleteEntry(entry)`, `confirmDeleteEntry()`, `onSaved()`
- **ARIA:** view, submit, delete على كل الأزرار

#### GeneralLedger.vue (86 سطر)
- **الحالة:** `useAccountingStore` — `fetchAccounts`, `fetchLedger`
- **الفلتر:** account (dropdown), fromDate, toDate
- **الأعمدة:** date, voucherType, voucherNumber, debit, credit, balance, party, remarks
- **الميزة:** Balance باللون الأخضر (موجب) أو الأحمر (سالب)

#### CostCenterForm.vue (120 سطر)
- **النوع:** Dialog (modelValue + saved)
- **الحقوق:** costCenterName, costCenterCode, parent, budget, company
- **التحقق:** costCenterName مطلوب, costCenterCode مطلوب
- **الدوال:** `resetForm()`, `close()`, `save()`

#### CostCenterList.vue (118 سطر)
- **الحالة:** `useAccountingStore` — `fetchCostCenters`
- **الأعمدة:** name (code), costCenterName, parent, budget, actions
- **الأحداث:** edit, delete (تأكيد)
- **الدوال:** `openAdd()`, `editCostCenter(cc)`, `deleteCostCenter(cc)`, `confirmDeleteCostCenter()`, `onSaved()`
- **ARIA:** edit, delete على كل الأزرار

#### FiscalYearForm.vue (106 سطر)
- **النوع:** Dialog (modelValue + saved)
- **الحقوق:** yearStartDate, yearEndDate, isCurrent
- **التحقق:** startDate و endDate مطلوبين, endDate > StartDate
- **الدوال:** `resetForm()`, `close()`, `save()`

#### FiscalYearList.vue (119 سطر)
- **الحالة:** `useAccountingStore` — `fetchFiscalYears`
- **الأعمدة:** name, yearStartDate, yearEndDate, status, isCurrent, actions
- **الأحداث:** edit (غير مدعوم بعد), close (تأكيد — للسنوات المفتوحة فقط غير الحالية)
- **الدوال:** `translateStatus(status)`, `editFiscalYear(fy)`, `closeYear(fy)`, `confirmCloseYear()`, `onSaved()`
- **ARIA:** edit, closeYear على كل الأزرار

#### FinancialReports.vue (85 سطر)
- **الحالة:** `useAccountingStore` — `fetchReport`
- **الأنواع:** trial_balance, profit_and_loss, balance_sheet, general_ledger, accounts_receivable, accounts_payable
- **الفلتر:** reportType, fromDate, toDate
- **الأعمدة:** label, debit, credit, balance
- **الدوال:** `formatNumber(n)`, `generate()`

## الـ Store

### useAccountingStore — Pinia Store

**المعرف:** `fastfree-accounting`

#### الحالة (State)

| المتغير | النوع | الوصف |
|---------|-------|-------|
| `accounts` | `Ref<Account[]>` | جميع الحسابات |
| `journalEntries` | `Ref<JournalEntry[]>` | جميع القيود اليومية |
| `paymentEntries` | `Ref<PaymentEntry[]>` | جميع سندات الدفع |
| `ledgerEntries` | `Ref<LedgerEntry[]>` | entries الدفتر |
| `costCenters` | `Ref<CostCenter[]>` | جميع مراكز التكلفة |
| `fiscalYears` | `Ref<FiscalYear[]>` | جميع السنوات المالية |
| `currentReport` | `Ref<FinancialReport \| null>` | التقرير الحالي |
| `loading` | `Ref<boolean>` | حالة التحميل |
| `error` | `Ref<string \| null>` | رسالة الخطأ |

#### المحسوبات (Computed)

| المحسوب | النوع | الوصف |
|---------|-------|-------|
| `accountTree` | `ComputedRef<Account[]>` | شجرة الحسابات (مبنية من `buildTree`) |
| `currentFiscalYear` | `ComputedRef<FiscalYear \| undefined>` | السنة المالية الحالية |
| `openFiscalYears` | `ComputedRef<FiscalYear[]>` | سنوات مالية مفتوحة |
| `totalDebit` | `ComputedRef<number>` | إجمالي المدين في القيود |
| `totalCredit` | `ComputedRef<number>` | إجمالي الدائن في القيود |

#### الإجراءات (Actions)

| الإجراء | المعاملات | الوصف |
|---------|-----------|-------|
| `fetchAccounts(company?)` | company?: string | جلب الحسابات مع caching |
| `fetchJournalEntries(filters?)` | filters?: Record\<string, unknown\> | جلب القيود اليومية مع caching |
| `fetchPaymentEntries(filters?)` | filters?: Record\<string, unknown\> | جلب سندات الدفع مع caching |
| `fetchLedger(account, fromDate, toDate, costCenter?)` | account, fromDate, toDate, costCenter? | جلب دفتر الأستاذ |
| `fetchCostCenters(company?)` | company?: string | جلب مراكز التكلفة مع caching |
| `fetchFiscalYears()` | — | جلب السنوات المالية مع caching |
| `fetchReport(filter)` | filter: ReportFilter | إنشاء تقرير مالي |
| `$reset()` | — | إعادة تعيين جميع الحالات |

**ملاحظة:** كل إجراء `fetch*` يتبع النمط: setLoading → setError(null) → getCached → call service → setCached → setError on failure → finally setLoading(false)

#### الدالة المساعدة (Helper)

`buildTree(accounts: Account[]): Account[]` — تحويل القائمة المسطحة إلى شجرة بناءً على `parentAccount`

## الترجمات

- **النطاق:** `accounting.*`
- **عدد المفاتيح:** ~135 مفتاح في كل ملف (EN + AR)
- **المجلد:** `src/locales/`

### تصنيفات المفاتيح

| التصنيف | المفاتيح |
|---------|---------|
| المجموعة | `accounting` |
| لوحة المعلومات | `dashboard`, `totalAccounts`, `currentFiscalYear` |
| شجرة الحسابات | `chartOfAccounts`, `addAccount`, `accountName`, `accountType`, `rootType`, `openingBalance` |
| أنواع الحسابات | `asset`, `liability`, `equity`, `income`, `expense`, `balanceSheet`, `profitAndLoss` |
| القيود اليومية | `journalEntries`, `journalEntry`, `newJournalEntry`, `entryNumber`, `postingDate`, `entryType`, `debit`, `credit`, `status` |
| الحالات | `draft`, `submitted`, `cancelled`, `open`, `closed` |
| إجراءات القيد | `journalEntryDetail`, `remark`, `costCenter`, `confirmSubmit`, `submitJournalEntryConfirm`, `confirmCancel`, `cancelJournalEntryConfirm`, `cancelEntry`, `journalEntrySubmitted`, `journalEntryCancelled` |
| سندات الدفع | `paymentEntries`, `newPayment`, `newPaymentEntry`, `paymentType`, `pay`, `receive`, `party`, `partyType`, `amount`, `paidAmount`, `receivedAmount`, `partyAccount`, `paidFrom`, `paidTo`, `modeOfPayment`, `paymentEntryDetail`, `submitPaymentEntryConfirm`, `deletePaymentEntryConfirm`, `paymentEntrySubmitted`, `paymentEntryDeleted` |
| دفتر الأستاذ | `generalLedger`, `accountLabel`, `fromDate`, `toDate`, `date`, `voucherType`, `voucherNumber`, `balance`, `remarks` |
| مراكز التكلفة | `costCenters`, `addCostCenter`, `newCostCenter`, `costCenterCode`, `costCenterName`, `parent`, `budget`, `deleteCostCenterConfirm`, `costCenterDeleted` |
| السنوات المالية | `fiscalYears`, `addFiscalYear`, `newFiscalYear`, `fiscalYear`, `startDate`, `endDate`, `current`, `confirmCloseYear`, `closeFiscalYearConfirm`, `closeYear`, `editNotYetSupported`, `fiscalYearClosed` |
| التقارير | `financialReports`, `reportType`, `generate`, `trialBalance`, `accountsReceivable`, `accountsPayable`, `totalDebit`, `totalCredit` |
| حقول النموذج | `company`, `bankEntry`, `cashEntry`, `accountLines`, `addRow`, `internalTransfer`, `customer`, `supplier`, `employee`, `setCurrentFiscalYear`, `submit` |
| التحقق | `fieldRequired`, `endDateMustBeAfterStart`, `atLeastTwoRows`, `debitCreditMustMatch`, `amountMustBePositive` |

## التبعيات

### التبعيات الرئيسية (dependencies)

| الباقة | الإصدار | الوصف |
|--------|---------|-------|
| `dexie` | `^4.4.4` | IndexedDB wrapper |
| `fastfree-auth` | `workspace:*` | طبقة API + caching + authentication |
| `quasar-app-extension-fastfree-lowcode` | `workspace:*` | إطار lowcode — سجل الشاشات والمجموعات |

### التبعيات التطويرية (devDependencies)

| الباقة | الإصدار |
|--------|---------|
| `oxfmt` | `^0.x` |
| `oxlint` | `^1.x` |
| `oxlint-tsgolint` | `^7.0.2001` |
| `pinia` | `^4.0.0` |
| `quasar` | `^2.23.1` |
| `typescript` | `^6.0.0` |
| `vue` | `^3.5.22` |
| `vue-tsc` | `^3.3.3` |

### التبعيات التقريبية (peerDependencies)

| الباقة | الإصدار |
|--------|---------|
| `pinia` | `^2.0.0` |
| `quasar` | `^2.0.0` |
| `vue` | `^3.4.0` |

## سجل التغييرات

### 2026-08-07 — جلسة بناء شاملة

#### فصل الملفات
- `init.ts` — 383→46 سطر (88%↓)
  - `locales/en.ts` — 144 سطر (ترجمات EN)
  - `locales/ar.ts` -144 سطر (ترجمات AR)
  - `screens.ts` — 45 سطر (تسجيل الشاشات)

#### معالجة الأخطاء (7 handlers)
- `FiscalYearList` — try/catch في `closeFiscalYear`
- `CostCenterList` — try/catch في `deleteCostCenter`
- `PaymentEntryList` — try/catch في `submit` + `delete`
- `JournalEntryList` — try/catch في `submit` + `cancel`
- `AccountingDashboard` — `Promise.all` لـ 3 API calls

#### أمان الأنواع
- `PaymentEntryForm` — `Record<string, unknown>` → `Partial<PaymentEntry>`
- `ChartOfAccounts` — `watch(filteredTree)` بدال `computed` side-effect

#### التحقق من النماذج (5 نماذج)
- `JournalEntryForm` — fieldRequired, atLeastTwoRows, debitCreditMustMatch
- `PaymentEntryForm` — fieldRequired, amountMustBePositive
- `FiscalYearForm` — fieldRequired, endDateMustBeAfterStart
- `CostCenterForm` — fieldRequired على name و code
- `ChartOfAccounts` — fieldRequired على accountName و accountType

#### إصلاحات إضافية
- translatePaymentType بدل toLowerCase
- translateStatus للـ badges
- ARIA labels على كل الأزرار
- console.log اتمسحت

### 2026-08-07 — Tax Service إضافية
- إضافة `tax.service.ts` — TaxTemplate CRUD, TaxRule CRUD, calculateTax, calculateTaxInclusive
- إضافة أنواع `TaxType`, `TaxTemplate`, `TaxRule` في `types/index.ts`
- تحديث `services/index.ts` بـ 9 دوال ضرائب جديدة

### 2026-08-08 — إصلاحات الجودة
- AccountingDashboard — try/catch + `Promise.all` + loading state
- GeneralLedger — try/catch + loading state
- FinancialReports — try/catch + loading state
- إزالة console.error من catch blocks
