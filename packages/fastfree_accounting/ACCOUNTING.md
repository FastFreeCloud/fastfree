# fastfree-accounting

> Quasar App Extension for accounting modules — Chart of Accounts, Journal Entries, Payments, Ledger, Cost Centers, Fiscal Years, and Financial Reports

**Version:** 0.0.1 | **License:** MIT | **Depends on:** `fastfree-auth` + `quasar-app-extension-fastfree-lowcode`

---

## Architecture

```
┌─────────────────────────────────────────────┐
│          Accounting Extension               │
│       (quasar-app-extension-fastfree-       │
│              accounting)                     │
│                                             │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │ 8 Screens    │  │ 7 Services         │   │
│  │ .vue files   │  │ (Frappe API)       │   │
│  └──────────────┘  └────────────────────┘   │
│                                             │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │ 1 Store      │  │ 15+ Types          │   │
│  │ (Pinia)      │  │ (TypeScript)       │   │
│  └──────────────┘  └────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ Dock Group: "المحاسبة" / "Accounting"│   │
│  │ 8 pages in bottom dock               │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   fastfree-auth        fastfree-lowcode
   (9 services)         (shell + i18n)
```

---

## Installation

```bash
# In your Quasar app
pnpm add fastfree-auth quasar-app-extension-fastfree-lowcode
quasar ext add fastfree-accounting
```

### Boot order in `quasar.config.js`:

```js
boot: [
  'fastfree-auth-init',        // Always first
  'fastfree-accounting-boot',  // Second
]
```

---

## Screens (8)

| # | Screen | Component | Icon | Description |
|---|--------|-----------|------|-------------|
| 1 | **Dashboard** | `AccountingDashboard` | `mdi-view-dashboard` | Overview: account count, journal entries, debit/credit totals, fiscal year |
| 2 | **Chart of Accounts** | `ChartOfAccounts` | `mdi-account-tree` | Hierarchical account tree with search, add/edit accounts |
| 3 | **Journal Entries** | `JournalEntryList` | `mdi-book-open` | List of journal entries with submit/cancel actions |
| 4 | **Payment Entries** | `PaymentEntryList` | `mdi-cash-multiple` | List of payments (Pay/Receive) with status |
| 5 | **General Ledger** | `GeneralLedger` | `mdi-book-open-variant` | Filterable ledger by account, date range, cost center |
| 6 | **Cost Centers** | `CostCenterList` | `mdi-domain` | Cost center hierarchy with budget tracking |
| 7 | **Fiscal Years** | `FiscalYearList` | `mdi-calendar-range` | Fiscal year management with open/close status |
| 8 | **Financial Reports** | `FinancialReports` | `mdi-chart-bar` | Trial Balance, P&L, Balance Sheet, Cash Flow |

---

## Services (7)

| Service | File | Functions |
|---------|------|-----------|
| **account** | `account.service.ts` | `getAccounts`, `getAccount`, `createAccount`, `updateAccount`, `deleteAccount`, `getAccountChildren` |
| **journal** | `journal.service.ts` | `getJournalEntries`, `getJournalEntry`, `createJournalEntry`, `updateJournalEntry`, `deleteJournalEntry`, `submitJournalEntry`, `cancelJournalEntry` |
| **payment** | `payment.service.ts` | `getPaymentEntries`, `getPaymentEntry`, `createPaymentEntry`, `updatePaymentEntry`, `deletePaymentEntry`, `submitPaymentEntry` |
| **ledger** | `ledger.service.ts` | `getGeneralLedger` |
| **costCenter** | `costCenter.service.ts` | `getCostCenters`, `getCostCenter`, `createCostCenter`, `updateCostCenter`, `deleteCostCenter` |
| **fiscalYear** | `fiscalYear.service.ts` | `getFiscalYears`, `getFiscalYear`, `createFiscalYear`, `closeFiscalYear` |
| **report** | `report.service.ts` | `generateReport` |

**All services use `fastfree-auth`'s `api.service`** — no direct Frappe SDK calls.

---

## Store

```ts
import { useAccountingStore } from 'fastfree-accounting'

const store = useAccountingStore()

// State
store.accounts          // Account[]
store.journalEntries    // JournalEntry[]
store.paymentEntries    // PaymentEntry[]
store.ledgerEntries     // LedgerEntry[]
store.costCenters       // CostCenter[]
store.fiscalYears       // FiscalYear[]
store.currentReport     // FinancialReport | null

// Computed
store.accountTree       // Hierarchical account tree
store.currentFiscalYear // Current open fiscal year
store.totalDebit        // Sum of all journal entry debits
store.totalCredit       // Sum of all journal entry credits

// Actions
store.fetchAccounts()
store.fetchJournalEntries()
store.fetchPaymentEntries()
store.fetchLedger(account, fromDate, toDate)
store.fetchCostCenters()
store.fetchFiscalYears()
store.fetchReport({ reportType, fromDate, toDate })
```

---

## Types (15+)

| Type | Description |
|------|-------------|
| `Account` | Chart of Accounts entry (name, type, rootType, parent, balance) |
| `AccountType` | `'Asset' \| 'Liability' \| 'Equity' \| 'Income' \| 'Expense'` |
| `JournalEntry` | Double-entry journal (date, accounts[], debit/credit totals) |
| `JournalEntryAccount` | Single line in a journal entry |
| `PaymentEntry` | Payment record (party, amount, mode) |
| `LedgerEntry` | General ledger row (date, voucher, debit, credit, balance) |
| `CostCenter` | Organizational unit with budget |
| `FiscalYear` | Accounting period (start, end, status) |
| `FinancialReport` | Generated report (rows[], totals) |
| `ReportFilter` | Report parameters (type, date range, cost center) |
| `ReportType` | `'Trial Balance' \| 'Profit and Loss' \| 'Balance Sheet' \| 'Cash Flow'` |

---

## Dock Group

The extension automatically creates a **"المحاسبة" / "Accounting"** group in the bottom dock with 8 pages:

```
┌─────────────────────────────────────────────┐
│  [system] [favorites]  │  [المحاسبة]        │
│                        │  📊 Dashboard      │
│                        │  🌳 Chart of Acc.  │
│                        │  📖 Journal Entry  │
│                        │  💰 Payment Entry  │
│                        │  📒 General Ledger │
│                        │  🏢 Cost Centers   │
│                        │  📅 Fiscal Years   │
│                        │  📈 Reports        │
└─────────────────────────────────────────────┘
```

---

## i18n

80+ translation keys in EN + AR:

```ts
import { registerMessages } from 'quasar-app-extension-fastfree-lowcode'

// Keys are auto-registered by initFastFreeAccounting()
// Example keys:
// accounting.dashboard → "Accounting Dashboard" / "لوحة معلومات المحاسبة"
// accounting.chartOfAccounts → "Chart of Accounts" / "شجرة الحسابات"
// groups.accounting → "Accounting" / "المحاسبة"
```

---

## Reused from fastfree-auth

| Service | Accounting Usage |
|---------|-----------------|
| `api.service` | All Frappe API calls (CRUD + RPC) |
| `permission.service` | `can('write', 'Journal Entry')` |
| `license.service` | Feature gating |
| `file.service` | Attach supporting documents |
| `realtime.service` | Live ledger updates |
| `cache.service` | Cache account tree |

---

## File Structure

```
fastfree_accounting/
├── src/
│   ├── index.ts              (barrel export)
│   ├── init.ts               (registration + i18n)
│   ├── types/
│   │   └── index.ts          (15+ interfaces)
│   ├── services/
│   │   ├── index.ts          (barrel export)
│   │   ├── account.service.ts
│   │   ├── journal.service.ts
│   │   ├── payment.service.ts
│   │   ├── ledger.service.ts
│   │   ├── costCenter.service.ts
│   │   ├── fiscalYear.service.ts
│   │   └── report.service.ts
│   ├── stores/
│   │   └── useAccountingStore.ts
│   └── screens/
│       ├── index.ts
│       ├── AccountingDashboard.vue
│       ├── ChartOfAccounts.vue
│       ├── JournalEntryList.vue
│       ├── PaymentEntryList.vue
│       ├── GeneralLedger.vue
│       ├── CostCenterList.vue
│       ├── FiscalYearList.vue
│       └── FinancialReports.vue
├── ae/                       (Quasar AE lifecycle)
├── playground/               (test app)
├── ACCOUNTING.md             (this file)
└── package.json
```
