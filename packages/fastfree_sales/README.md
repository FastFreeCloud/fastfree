# @fastfree/sales

> Sales management for FastFree ERP — Customers, Quotations, Sales Orders, Invoices, Delivery Notes.

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

- **Customer Management** — Full CRUD for Individual and Company customers
- **Quotation Lifecycle** — Create, submit, cancel, and expire quotations
- **Sales Orders** — Track delivery status with Partially Delivered / Delivered states
- **Sales Invoices** — Generate invoices with Paid / Partially Paid tracking
- **Delivery Notes** — Record and confirm item deliveries against sales orders
- **Sales Reports** — Summary dashboard, top-selling items, and customer receivables
- **Bilingual** — English and Arabic translations (127 keys each) via `useLcI18n`
- **Pinia Store** — Centralized state management with `useSalesStore`
- **Quasar UI** — Built on Quasar Framework components (QTable, QDialog, QBtn, QInput)

---

## Install

```bash
# The package is part of the FastFree monorepo and consumed as a workspace dependency.
# It is NOT published to npm — it is resolved via pnpm workspaces.

# From the monorepo root:
pnpm install
```

**package.json** dependencies:

```json
{
  "name": "fastfree-sales",
  "version": "0.0.1",
  "type": "module",
  "dependencies": {
    "fastfree-auth": "workspace:*",
    "vue": "^3.5.22",
    "vue-router": "^5.0.6",
    "pinia": "^4.0.2",
    "quasar": "^2.23.1",
    "@quasar/extras": "^2.0.0"
  }
}
```

---

## Quick Start

### 1. Register the package in the app boot sequence

```ts
// src/boot/fastfree-sales.ts
import { initFastFreeSales } from 'fastfree-sales'

export default () => {
  initFastFreeSales()
}
```

### 2. Add to `quasar.config.ts` boot array

```ts
// quasar.config.ts
boot: [
  'fastfree-auth',
  'fastfree-accounting',
  'fastfree-inventory',
  'fastfree-sales',  // ← add here
]
```

### 3. Fetch data in any component

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useSalesStore } from 'fastfree-sales'

const store = useSalesStore()

onMounted(async () => {
  await store.fetchCustomers()
  await store.fetchQuotations()
  await store.fetchSalesSummary()
})
</script>
```

### 4. Call service functions directly

```ts
import {
  createQuotation,
  submitQuotation,
  getSalesSummary,
} from 'fastfree-sales'

// Create a quotation
const result = await createQuotation({
  customer: 'CUST-00001',
  customer_name: 'Acme Corp',
  transaction_date: '2026-08-08',
  valid_till: '2026-09-08',
  items: [
    {
      name: 'item-1',
      item_code: 'ITEM-001',
      item_name: 'Product A',
      quantity: 10,
      rate: 100,
      amount: 1000,
      net_amount: 1000,
    },
  ],
  total: 1000,
  grand_total: 1000,
  currency: 'USD',
  status: 'Draft',
  creation: new Date().toISOString(),
  modified: new Date().toISOString(),
  owner: 'Administrator',
})

// Submit it
await submitQuotation(result.data.name)

// Fetch summary
const summary = await getSalesSummary({ from_date: '2026-01-01' })
console.log(summary.data.totalSales)
```

---

## Architecture

```
packages/fastfree_sales/
├── package.json
└── src/
    ├── index.ts                          # Public exports
    ├── init.ts                           # Package init — registers screens + translations
    ├── screens.ts                        # Registers screens in the lowcode registry
    ├── types/
    │   └── index.ts                      # TypeScript interfaces
    ├── services/
    │   ├── index.ts                      # Re-exports all services
    │   ├── customer.service.ts           # CRUD for customers
    │   ├── quotation.service.ts          # CRUD + submit/cancel for quotations
    │   ├── salesOrder.service.ts         # CRUD + submit/cancel for sales orders
    │   ├── salesInvoice.service.ts       # CRUD + submit/cancel for sales invoices
    │   ├── delivery.service.ts           # CRUD + submit/cancel for delivery notes
    │   └── report.service.ts             # Sales reports
    ├── screens/
    │   ├── index.ts                      # Re-exports screens
    │   ├── CustomerList.vue              # Customer list with search/delete/edit
    │   ├── CustomerForm.vue              # Add/edit customer dialog
    │   ├── QuotationList.vue             # Quotation list with submit/cancel/delete
    │   ├── SalesOrderList.vue            # Sales order list with submit/cancel/delete
    │   ├── SalesInvoiceList.vue          # Sales invoice list with submit/cancel/delete
    │   ├── DeliveryNoteList.vue          # Delivery note list with submit/cancel/delete
    │   └── SalesReportScreen.vue         # Sales report dashboard
    ├── stores/
    │   └── useSalesStore.ts              # Pinia store (id: "fastfree-sales")
    └── locales/
        ├── en.ts                         # English translations (127 keys)
        └── ar.ts                         # Arabic translations (127 keys)
```

**Data flow:** Screen → Pinia Store → Service → `fastfree-auth` API client → Frappe Server

---

## API Reference

### Services

#### Customer Service

```ts
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from 'fastfree-sales'

// List all customers
const { data: customers } = await getCustomers()

// Get single customer
const { data: customer } = await getCustomer('CUST-00001')

// Create
await createCustomer({
  customer_name: 'Acme Corp',
  customer_type: 'Company',
  email: 'info@acme.com',
  phone: '+1-555-0100',
  is_active: true,
})

// Update
await updateCustomer('CUST-00001', { phone: '+1-555-0200' })

// Delete
await deleteCustomer('CUST-00001')
```

#### Quotation Service

```ts
import {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  submitQuotation,
  cancelQuotation,
} from 'fastfree-sales'

// List all quotations
const { data: quotations } = await getQuotations()

// Get single quotation
const { data: quotation } = await getQuotation('QTN-2026-00001')

// Create with line items
await createQuotation({
  customer: 'CUST-00001',
  customer_name: 'Acme Corp',
  transaction_date: '2026-08-08',
  valid_till: '2026-09-08',
  status: 'Draft',
  items: [
    {
      name: 'item-1',
      item_code: 'ITEM-001',
      item_name: 'Widget A',
      quantity: 5,
      rate: 200,
      amount: 1000,
      discount_percentage: 10,
      discount_amount: 100,
      net_amount: 900,
    },
  ],
  total: 1000,
  total_discount: 100,
  grand_total: 900,
  currency: 'USD',
  creation: new Date().toISOString(),
  modified: new Date().toISOString(),
  owner: 'Administrator',
})

// Submit (Draft → Submitted)
await submitQuotation('QTN-2026-00001')

// Cancel (Submitted → Cancelled)
await cancelQuotation('QTN-2026-00001')
```

**Status transitions:** `Draft → Submitted → Cancelled` | `Draft → Submitted → Expired/Rejected`

#### Sales Order Service

```ts
import {
  getSalesOrders,
  getSalesOrder,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  submitSalesOrder,
  cancelSalesOrder,
} from 'fastfree-sales'

// List all sales orders
const { data: orders } = await getSalesOrders()

// Get single order
const { data: order } = await getSalesOrder('SO-2026-00001')

// Create
await createSalesOrder({
  customer: 'CUST-00001',
  customer_name: 'Acme Corp',
  transaction_date: '2026-08-08',
  delivery_date: '2026-08-15',
  status: 'Draft',
  items: [
    {
      name: 'item-1',
      item_code: 'ITEM-001',
      item_name: 'Widget A',
      quantity: 5,
      rate: 200,
      amount: 1000,
      net_amount: 1000,
    },
  ],
  total: 1000,
  grand_total: 1000,
  currency: 'USD',
  creation: new Date().toISOString(),
  modified: new Date().toISOString(),
  owner: 'Administrator',
})

// Submit
await submitSalesOrder('SO-2026-00001')

// Cancel
await cancelSalesOrder('SO-2026-00001')
```

**Status transitions:** `Draft → Submitted → Cancelled` | `Draft → Submitted → Partially Delivered → Delivered`

#### Sales Invoice Service

```ts
import {
  getSalesInvoices,
  getSalesInvoice,
  createSalesInvoice,
  updateSalesInvoice,
  deleteSalesInvoices,
  submitSalesInvoice,
  cancelSalesInvoice,
} from 'fastfree-sales'

// List all invoices
const { data: invoices } = await getSalesInvoices()

// Get single invoice
const { data: invoice } = await getSalesInvoice('INV-2026-00001')

// Create
await createSalesInvoice({
  customer: 'CUST-00001',
  customer_name: 'Acme Corp',
  posting_date: '2026-08-08',
  due_date: '2026-09-08',
  status: 'Draft',
  items: [
    {
      name: 'item-1',
      item_code: 'ITEM-001',
      item_name: 'Widget A',
      quantity: 5,
      rate: 200,
      amount: 1000,
      net_amount: 1000,
    },
  ],
  total: 1000,
  grand_total: 1000,
  currency: 'USD',
  creation: new Date().toISOString(),
  modified: new Date().toISOString(),
  owner: 'Administrator',
})

// Submit
await submitSalesInvoice('INV-2026-00001')

// Cancel
await cancelSalesInvoice('INV-2026-00001')
```

**Status transitions:** `Draft → Submitted → Cancelled` | `Draft → Submitted → Partially Paid → Paid`

#### Delivery Note Service

```ts
import {
  getDeliveryNotes,
  getDeliveryNote,
  createDeliveryNote,
  updateDeliveryNote,
  deleteDeliveryNote,
  submitDeliveryNote,
  cancelDeliveryNote,
} from 'fastfree-sales'

// List all delivery notes
const { data: notes } = await getDeliveryNotes()

// Get single note
const { data: note } = await getDeliveryNote('DN-2026-00001')

// Create
await createDeliveryNote({
  customer: 'CUST-00001',
  customer_name: 'Acme Corp',
  posting_date: '2026-08-08',
  sales_order: 'SO-2026-00001',
  status: 'Draft',
  items: [
    {
      name: 'item-1',
      item_code: 'ITEM-001',
      item_name: 'Widget A',
      quantity: 5,
      delivered_qty: 5,
      rate: 200,
      amount: 1000,
    },
  ],
  total: 1000,
  currency: 'USD',
  creation: new Date().toISOString(),
  modified: new Date().toISOString(),
  owner: 'Administrator',
})

// Submit
await submitDeliveryNote('DN-2026-00001')

// Cancel
await cancelDeliveryNote('DN-2026-00001')
```

**Status transitions:** `Draft → Submitted → Cancelled`

#### Report Service

```ts
import {
  getSalesSummary,
  getTopSellingItems,
  getCustomerReceivables,
} from 'fastfree-sales'

// Get sales summary (totals, outstanding amount)
const { data: summary } = await getSalesSummary({
  from_date: '2026-01-01',
  to_date: '2026-12-31',
  customer: 'CUST-00001',  // optional filter
})

// Get top selling items
const { data: items } = await getTopSellingItems({
  limit: 10,
  from_date: '2026-01-01',
  to_date: '2026-12-31',
})

// Get customer receivables (outstanding balances)
const { data: receivables } = await getCustomerReceivables({
  customer: 'CUST-00001',  // optional filter
})
```

---

### Types

All types are exported from `fastfree-sales`:

```ts
import type {
  CustomerType,
  Customer,
  Quotation,
  QuotationItem,
  SalesOrder,
  SalesOrderItem,
  SalesInvoice,
  SalesInvoiceItem,
  DeliveryNote,
  DeliveryNoteItem,
} from 'fastfree-sales'
```

#### `CustomerType`

```ts
type CustomerType = 'Individual' | 'Company'
```

#### `Customer`

```ts
interface Customer {
  name: string
  customer_name: string
  customer_type: 'Individual' | 'Company'
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  tax_id?: string
  default_currency?: string
  is_active: boolean
  creation: string
  modified: string
  owner: string
}
```

#### `Quotation`

```ts
interface Quotation {
  name: string
  customer: string
  customer_name: string
  transaction_date: string
  valid_till: string
  status: 'Draft' | 'Submitted' | 'Cancelled' | 'Expired' | 'Rejected'
  items: QuotationItem[]
  total: number
  total_discount?: number
  grand_total: number
  currency: string
  company?: string
  terms?: string
  creation: string
  modified: string
  owner: string
}

interface QuotationItem {
  name: string
  item_code: string
  item_name: string
  description?: string
  quantity: number
  rate: number
  amount: number
  discount_percentage?: number
  discount_amount?: number
  net_amount: number
}
```

#### `SalesOrder`

```ts
interface SalesOrder {
  name: string
  customer: string
  customer_name: string
  transaction_date: string
  delivery_date?: string
  status: 'Draft' | 'Submitted' | 'Cancelled' | 'Partially Delivered' | 'Delivered'
  items: SalesOrderItem[]
  total: number
  total_discount?: number
  grand_total: number
  currency: string
  company?: string
  terms?: string
  creation: string
  modified: string
  owner: string
}

interface SalesOrderItem {
  name: string
  item_code: string
  item_name: string
  description?: string
  quantity: number
  rate: number
  amount: number
  discount_percentage?: number
  discount_amount?: number
  net_amount: number
  delivered_qty?: number
  pending_qty?: number
}
```

#### `SalesInvoice`

```ts
interface SalesInvoice {
  name: string
  customer: string
  customer_name: string
  posting_date: string
  due_date?: string
  status: 'Draft' | 'Submitted' | 'Cancelled' | 'Paid' | 'Partially Paid'
  items: SalesInvoiceItem[]
  total: number
  total_discount?: number
  grand_total: number
  currency: string
  company?: string
  terms?: string
  creation: string
  modified: string
  owner: string
}

interface SalesInvoiceItem {
  name: string
  item_code: string
  item_name: string
  description?: string
  quantity: number
  rate: number
  amount: number
  discount_percentage?: number
  discount_amount?: number
  net_amount: number
}
```

#### `DeliveryNote`

```ts
interface DeliveryNote {
  name: string
  customer: string
  customer_name: string
  posting_date: string
  sales_order?: string
  status: 'Draft' | 'Submitted' | 'Cancelled'
  items: DeliveryNoteItem[]
  total: number
  currency: string
  company?: string
  creation: string
  modified: string
  owner: string
}

interface DeliveryNoteItem {
  name: string
  item_code: string
  item_name: string
  description?: string
  quantity: number
  delivered_qty: number
  rate: number
  amount: number
}
```

---

### Screens

| Screen | File | Description |
|--------|------|-------------|
| `CustomerList` | `screens/CustomerList.vue` | Customer list with search, edit, and delete |
| `CustomerForm` | `screens/CustomerForm.vue` | Add/edit customer dialog |
| `QuotationList` | `screens/QuotationList.vue` | Quotation list with submit/cancel/delete actions |
| `SalesOrderList` | `screens/SalesOrderList.vue` | Sales order list with submit/cancel/delete actions |
| `SalesInvoiceList` | `screens/SalesInvoiceList.vue` | Sales invoice list with submit/cancel/delete actions |
| `DeliveryNoteList` | `screens/DeliveryNoteList.vue` | Delivery note list with submit/cancel/delete actions |
| `SalesReportScreen` | `screens/SalesReportScreen.vue` | Sales report dashboard with summary statistics |

All list screens use `QTable` with server-side loading, confirmation dialogs for destructive actions, and error handling via `$q.notify`.

---

## Shared Utilities

This package uses two shared composables from `fastfree-lowcode`:

### `useFormatNumber`

Locale-aware number formatting for currency values across all list screens.

```vue
<script setup lang="ts">
import { useFormatNumber } from 'quasar-app-extension-fastfree-lowcode/src/runtime'

const { formatNumber } = useFormatNumber()

// Usage in table columns:
const columns = computed(() => [
  {
    name: 'grand_total',
    label: 'Grand Total',
    field: 'grand_total',
    format: (v: number) => formatNumber(v),
  },
])
</script>

<template>
  <!-- Renders as "1,234.56" or "1.234,56" depending on locale -->
  <span>{{ formatNumber(1234.56) }}</span>
</template>
```

### `useStatusHelpers`

Translated status badges with color mapping, used in all document list screens.

```vue
<script setup lang="ts">
import { useStatusHelpers } from 'quasar-app-extension-fastfree-lowcode/src/runtime'

// Pass the translation namespace ('sales')
const { translateStatus, statusColor } = useStatusHelpers('sales')

// translateStatus maps status strings to translated labels
// statusColor maps status strings to Quasar color names
</script>

<template>
  <!-- Renders a colored badge: "Submitted" in green, "Cancelled" in red, etc. -->
  <q-badge :color="statusColor(row.status)" :label="translateStatus(row.status)" />
</template>
```

**Status color mapping:**

| Status | Color |
|--------|-------|
| `Draft` | `grey` |
| `Submitted` | `blue` |
| `Cancelled` | `red` |
| `Expired` | `orange` |
| `Rejected` | `red` |
| `Delivered` | `green` |
| `Partially Delivered` | `orange` |
| `Paid` | `green` |
| `Partially Paid` | `orange` |

---

## Configuration

### Pinia Store

The `useSalesStore` provides centralized state management:

```ts
import { useSalesStore } from 'fastfree-sales'

const store = useSalesStore()

// State
store.customers       // Customer[]
store.quotations      // Quotation[]
store.salesOrders     // SalesOrder[]
store.salesInvoices   // SalesInvoice[]
store.deliveryNotes   // DeliveryNote[]
store.summary         // SalesSummary | null
store.loading         // boolean
store.error           // string | null

// Actions
await store.fetchCustomers()
await store.fetchQuotations()
await store.fetchSalesOrders()
await store.fetchSalesInvoices()
await store.fetchDeliveryNotes()
await store.fetchSalesSummary()

// Reset all state
store.$reset()
```

### `SalesSummary` Interface

```ts
interface SalesSummary {
  totalCustomers: number
  totalSales: number
  totalInvoices: number
  outstandingAmount: number
}
```

### Translations

Translations are registered under the `sales` namespace with 127 keys per language:

```ts
// Translation categories:
// sales.*              — General titles and labels
// sales.customers.*    — Customer fields
// sales.quotations.*   — Quotation fields
// sales.salesOrders.*  — Sales order fields
// sales.salesInvoices.* — Invoice fields
// sales.deliveryNotes.* — Delivery note fields
// sales.status.*       — Status labels (used by useStatusHelpers)
// sales.common.*       — Shared labels (add, edit, delete, save, cancel, submit, search)
// sales.fieldRequired  — Validation message
```

**Usage in components:**

```vue
<script setup lang="ts">
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'

const { t } = useLcI18n()

// Access translations
t('sales.quotations')        // "Quotations"
t('sales.addQuotation')      // "Add Quotation"
t('sales.grandTotal')        // "Grand Total"
t('sales.submitQuotationConfirm')  // "Are you sure you want to submit this quotation?"
t('common.search')           // "Search"
t('common.delete')           // "Delete"
t('sales.fieldRequired')     // "This field is required"
</script>
```

---

## License

MIT — see [LICENSE](../../../LICENSE) for details.
