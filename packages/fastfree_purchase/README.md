# @fastfree/purchase

> Purchase management for FastFree ERP — Suppliers, Purchase Orders, Receipts, Invoices.

[![npm version](https://img.shields.io/badge/npm-0.1.0-blue.svg)](https://npmjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Table of Contents

- [Features](#features)
- [Install](#install)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Reference](#api-reference)
  - [Services](#services)
  - [Types](#types)
  - [Screens](#screens)
- [Shared Utilities](#shared-utilities)
- [Configuration](#configuration)
- [License](#license)

---

## Features

- **Supplier Management** — Full CRUD with Company/Individual types
- **Purchase Orders** — Create, submit, cancel, and delete with status tracking
- **Purchase Receipts** — Track received goods against purchase orders
- **Purchase Invoices** — Invoice management with outstanding amount tracking
- **Reports & Analytics** — Summary dashboard with CSV export and print support
- **Bilingual** — English + Arabic (115 translation keys each)
- **Lazy Loaded** — All screens use `defineAsyncComponent` for optimal bundle splitting
- **Zero Errors** — 0 TypeScript errors, 0 lint violations

---

## Install

```bash
# From monorepo root
pnpm add fastfree-purchase --filter fastfree-purchase

# Or workspace protocol
pnpm add fastfree-auth@workspace:*
```

### Dependencies

| Package | Version |
|---------|---------|
| `fastfree-auth` | `workspace:*` |
| `vue` | `^3.5.22` |
| `quasar` | `^2.23.1` |
| `pinia` | `^4.0.2` |
| `vue-router` | `^5.0.6` |

---

## Quick Start

### 1. Register the package in your boot file

```ts
// src/boot/fastfree-purchase.ts
import { initFastFreePurchase } from 'fastfree-purchase'

export default async () => {
  await initFastFreePurchase()
}
```

### 2. Add to `quasar.config.ts`

```ts
// quasar.config.ts
boot: [
  'fastfree-auth',
  'fastfree-lowcode',
  'fastfree-purchase', // <-- after auth + lowcode
],
```

### 3. Use services in your components

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSuppliers, createSupplier, type Supplier } from 'fastfree-purchase'

const suppliers = ref<Supplier[]>([])
const loading = ref(false)

async function fetchSuppliers() {
  loading.value = true
  const result = await getSuppliers()
  if (result.success) {
    suppliers.value = result.data ?? []
  }
  loading.value = false
}

async function addSupplier() {
  const result = await createSupplier({
    supplierName: 'Acme Corp',
    supplierType: 'Company',
    email: 'contact@acme.com',
    mobileNo: '+1234567890',
  })

  if (result.success) {
    await fetchSuppliers()
  }
}

onMounted(fetchSuppliers)
</script>
```

---

## Architecture

```
packages/fastfree_purchase/
├── package.json
└── src/
    ├── index.ts                          # Barrel export — all public APIs
    ├── init.ts                           # Boot function — registers messages + screens
    ├── locales/
    │   ├── en.ts                         # English translations (115 keys)
    │   └── ar.ts                         # Arabic translations (115 keys)
    ├── screens/
    │   ├── index.ts                      # Screen barrel export
    │   ├── register.ts                   # Screen registration with lowcode
    │   ├── PurchaseDashboard.vue         # Dashboard — 3 KPI cards
    │   ├── SupplierList.vue              # Supplier list + CRUD
    │   ├── SupplierForm.vue              # Supplier create/edit dialog
    │   ├── PurchaseOrderList.vue         # Purchase orders list
    │   ├── PurchaseReceiptList.vue       # Purchase receipts list
    │   ├── PurchaseInvoiceList.vue       # Purchase invoices list
    │   └── PurchaseReportScreen.vue      # Reports + CSV export
    ├── services/
    │   ├── index.ts                      # Service barrel export
    │   ├── supplier.service.ts           # Supplier CRUD (5 functions)
    │   ├── purchaseOrder.service.ts      # Purchase Orders (7 functions)
    │   ├── purchaseReceipt.service.ts    # Purchase Receipts (7 functions)
    │   ├── purchaseInvoice.service.ts    # Purchase Invoices (7 functions)
    │   └── report.service.ts             # Summary report (1 function)
    └── types/
        └── index.ts                      # TypeScript type definitions
```

**Totals:** 18 files | 27 service functions | 7 Vue screens | 13 TypeScript types | 230 translation keys

---

## API Reference

### Services

#### Supplier Service — `src/services/supplier.service.ts`

```ts
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from 'fastfree-purchase'

// Fetch all suppliers (max 500, sorted by supplier_name)
const result = await getSuppliers()
// → ApiResponse<Supplier[]>

// Fetch single supplier
const supplier = await getSupplier('SUP-001')
// → ApiResponse<Supplier>

// Create supplier
const created = await createSupplier({
  supplierName: 'Acme Corp',
  supplierType: 'Company',
  email: 'info@acme.com',
  mobileNo: '+1234567890',
  address: '123 Main St',
})
// → ApiResponse<Supplier>

// Update supplier
const updated = await updateSupplier('SUP-001', {
  email: 'new@acme.com',
})

// Delete supplier
const deleted = await deleteSupplier('SUP-001')
// → ApiResponse<void>
```

#### Purchase Order Service — `src/services/purchaseOrder.service.ts`

```ts
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  submitPurchaseOrder,
  cancelPurchaseOrder,
} from 'fastfree-purchase'

// Fetch all purchase orders (max 500, sorted by transaction_date)
const orders = await getPurchaseOrders()
// → ApiResponse<PurchaseOrder[]>

// Create purchase order
const order = await createPurchaseOrder({
  supplier: 'SUP-001',
  supplierName: 'Acme Corp',
  transactionDate: '2026-08-08',
  items: [
    {
      itemCode: 'ITEM-001',
      itemName: 'Widget A',
      qty: 100,
      rate: 25.0,
      amount: 2500.0,
      receivedQty: 0,
    },
  ],
  total: 2500.0,
})

// Submit (post) purchase order
await submitPurchaseOrder('PO-001')

// Cancel purchase order
await cancelPurchaseOrder('PO-001')
```

#### Purchase Receipt Service — `src/services/purchaseReceipt.service.ts`

```ts
import {
  getPurchaseReceipts,
  createPurchaseReceipt,
  submitPurchaseReceipt,
  cancelPurchaseReceipt,
} from 'fastfree-purchase'

// Create purchase receipt
const receipt = await createPurchaseReceipt({
  supplier: 'SUP-001',
  supplierName: 'Acme Corp',
  postingDate: '2026-08-08',
  purchaseOrder: 'PO-001',
  items: [
    {
      itemCode: 'ITEM-001',
      itemName: 'Widget A',
      qty: 100,
      receivedQty: 100,
    },
  ],
  total: 2500.0,
})

// Submit receipt
await submitPurchaseReceipt('PR-001')
```

#### Purchase Invoice Service — `src/services/purchaseInvoice.service.ts`

```ts
import {
  getPurchaseInvoices,
  createPurchaseInvoice,
  submitPurchaseInvoice,
  cancelPurchaseInvoice,
} from 'fastfree-purchase'

// Create purchase invoice
const invoice = await createPurchaseInvoice({
  supplier: 'SUP-001',
  supplierName: 'Acme Corp',
  postingDate: '2026-08-08',
  dueDate: '2026-09-08',
  purchaseOrder: 'PO-001',
  purchaseReceipt: 'PR-001',
  items: [
    {
      itemCode: 'ITEM-001',
      itemName: 'Widget A',
      qty: 100,
      rate: 25.0,
      amount: 2500.0,
    },
  ],
  total: 2500.0,
  outstandingAmount: 2500.0,
})

// Submit invoice
await submitPurchaseInvoice('PI-001')
```

#### Report Service — `src/services/report.service.ts`

```ts
import { getPurchaseSummary } from 'fastfree-purchase'

const summary = await getPurchaseSummary()
// → ApiResponse<PurchaseSummary>
// { totalPurchases: 15000, totalInvoices: 12000, totalSuppliers: 25 }
```

### Types

All types are exported from the package entry point:

```ts
import type {
  // Supplier
  SupplierType,       // 'Company' | 'Individual'
  Supplier,           // { name, supplierName, supplierType, mobileNo?, email?, address?, disabled }

  // Purchase Order
  PurchaseOrderStatus, // 'Draft' | 'Submitted' | 'Cancelled' | 'Received'
  PurchaseOrderItem,   // { itemCode, itemName, qty, rate, amount, receivedQty }
  PurchaseOrder,       // { name, supplier, supplierName, transactionDate, items, total, status, docstatus }

  // Purchase Receipt
  PurchaseReceiptStatus, // 'Draft' | 'Submitted' | 'Cancelled'
  PurchaseReceiptItem,   // { itemCode, itemName, qty, receivedQty }
  PurchaseReceipt,       // { name, supplier, supplierName, postingDate, purchaseOrder?, items, total, status, docstatus }

  // Purchase Invoice
  PurchaseInvoiceStatus, // 'Draft' | 'Submitted' | 'Cancelled' | 'Paid'
  PurchaseInvoiceItem,   // { itemCode, itemName, qty, rate, amount }
  PurchaseInvoice,       // { name, supplier, supplierName, postingDate, dueDate?, purchaseOrder?, purchaseReceipt?, items, total, outstandingAmount, status, docstatus }

  // Reports
  PurchaseSummary,      // { totalPurchases, totalInvoices, totalSuppliers }

  // API
  ApiResponse<T>,       // { success, data?, error? { code, message, details? } }
} from 'fastfree-purchase'
```

### Screens

Screens are lazy-loaded via `defineAsyncComponent` and registered through the lowcode system.

| Screen | Type | Icon | Description |
|--------|------|------|-------------|
| `purchase-dashboard` | Dashboard | `mdi-view-dashboard` | 3 KPI cards: total purchases, invoices, suppliers |
| `purchase-suppliers` | List | `mdi-truck` | Supplier table with search, add, edit, delete |
| `purchase-orders` | List | `mdi-cart-check` | Purchase orders with submit/cancel/delete actions |
| `purchase-receipts` | List | `mdi-package-down` | Purchase receipts with submit/cancel/delete actions |
| `purchase-invoices` | List | `mdi-receipt` | Purchase invoices with submit/cancel/delete actions |
| `purchase-reports` | Report | `mdi-chart-bar` | Date filter + KPI cards + summary table + CSV export |

#### Screen Registration

```ts
// src/screens/register.ts (internal)
import { defineAsyncComponent } from 'vue'

const screens = [
  { type: 'purchase-dashboard', loader: () => import('./PurchaseDashboard.vue') },
  { type: 'purchase-suppliers', loader: () => import('./SupplierList.vue') },
  { type: 'purchase-orders',    loader: () => import('./PurchaseOrderList.vue') },
  { type: 'purchase-receipts',  loader: () => import('./PurchaseReceiptList.vue') },
  { type: 'purchase-invoices',  loader: () => import('./PurchaseInvoiceList.vue') },
  { type: 'purchase-reports',   loader: () => import('./PurchaseReportScreen.vue') },
]
```

#### Using SupplierForm Dialog

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SupplierForm } from 'fastfree-purchase' // via screens
import type { Supplier } from 'fastfree-purchase'

const showForm = ref(false)
const editingSupplier = ref<Supplier | null>(null)

function openAdd() {
  editingSupplier.value = null
  showForm.value = true
}

function editSupplier(supplier: Supplier) {
  editingSupplier.value = supplier
  showForm.value = true
}

function onSaved() {
  showForm.value = false
  // refresh list...
}
</script>

<template>
  <SupplierForm
    v-model="showForm"
    :supplier="editingSupplier"
    @saved="onSaved"
  />
</template>
```

---

## Shared Utilities

The package uses shared composables from `fastfree-lowcode`:

```ts
// Number formatting (locale-aware)
import { useFormatNumber } from 'quasar-app-extension-fastfree-lowcode'
const { formatNumber } = useFormatNumber()
formatNumber(1234567.89) // → "1,234,567.89"

// Status badge helpers
import { useStatusHelpers } from 'quasar-app-extension-fastfree-lowcode'
const { translateStatus, statusColor } = useStatusHelpers()
translateStatus('Draft')  // → "Draft" (or Arabic equivalent)
statusColor('Submitted')  // → 'positive'

// i18n translations
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode'
const { t } = useLcI18n()
t('purchase.suppliers') // → "Suppliers"
```

---

## Configuration

### Boot Order

The package must be loaded **after** `fastfree-auth` and `fastfree-lowcode`:

```
fastfree-auth-init       → API client + auth initialized
fastfree-lowcode-init    → Lowcode registry available
fastfree-purchase-init   → Purchase groups + screens registered
```

### Translation Keys

| Namespace | Keys | Example |
|-----------|------|---------|
| `groups.*` | 1 | `groups.purchase` |
| `screens.*` | 6 | `screens.purchase-suppliers`, `screens.purchase-orders` |
| `purchase.*` | 50 | `purchase.supplierName`, `purchase.total`, `purchase.addPurchaseOrder` |
| `purchase.status.*` | 8 | `purchase.status.draft`, `purchase.status.submitted` |
| `common.*` | 28 | `common.add`, `common.delete`, `common.save` |
| `validation.*` | 1 | `validation.fieldRequired` |

### Lint & TypeCheck

```bash
# TypeCheck — zero errors
cd apps/fastfree_ledger && npx vue-tsc --noEmit

# Lint Check — zero violations
cd apps/fastfree_ledger && npm run lint:check
```

---

## License

MIT — see [LICENSE](https://opensource.org/licenses/MIT) for details.
