# @fastfree/inventory

> Inventory management for FastFree ERP — Products, Categories, Warehouses, Stock Entries, Suppliers.

[![npm version](https://img.shields.io/badge/npm-0.0.1-blue.svg)](https://npmjs.com)
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
- [Store](#store)
- [Configuration](#configuration)
- [License](#license)

---

## Features

- **Products** — Full CRUD with units of measure, pricing, stock levels, barcode support
- **Categories** — Hierarchical product classification with parent-child relationships
- **Warehouses** — Multi-warehouse management with address, phone, and manager info
- **Suppliers** — Supplier directory with contact details and GST number
- **Stock Entries** — Receipt, Issue, Transfer, and Adjustment entry types with submit/cancel workflow
- **Stock Ledger** — Real-time stock movements with valuation tracking
- **Serial Numbers** — Track individual item serials with status lifecycle
- **Batch Management** — Batch tracking with manufacturing and expiry dates
- **Reports** — Stock balance, stock age, and warehouse summary reports
- **Pinia Store** — Reactive state with built-in caching via `fastfree-auth`
- **i18n** — Full English/Arabic translation support (80 keys)
- **Quasar UI** — Pre-built screens using Quasar components (QTable, QDialog, etc.)

---

## Install

```bash
# From the monorepo root
pnpm add fastfree-inventory --workspace

# Or install dependencies directly
pnpm add fastfree-inventory dexie fastfree-auth quasar-app-extension-fastfree-lowcode
```

**Peer dependencies:**

```json
{
  "vue": "^3.4.0",
  "pinia": "^2.0.0",
  "quasar": "^2.0.0"
}
```

---

## Quick Start

### 1. Initialize the module

In your app's boot file:

```ts
// src/boot/inventory.ts
import { initFastFreeInventory } from 'fastfree-inventory'

export default ({ app }) => {
  initFastFreeInventory()
}
```

Register the boot file in `quasar.config.ts`:

```ts
// quasar.config.ts
boot: [
  // ... other boots
  'inventory',
],
```

### 2. Use services directly

```ts
import {
  getProducts,
  createProduct,
  getStockEntries,
  submitStockEntry,
} from 'fastfree-inventory'

// Fetch all products
const result = await getProducts()
if (result.success) {
  console.log(result.data) // Product[]
}

// Create a new product
const created = await createProduct({
  productName: 'Wireless Mouse',
  productCode: 'WM-001',
  unitOfMeasure: 'Piece',
  status: 'Active',
  buyingPrice: 15.00,
  sellingPrice: 29.99,
  currentStock: 100,
  minimumStock: 20,
  maximumStock: 500,
  taxRate: 14,
  disabled: false,
})

// Submit a stock entry
await submitStockEntry('STE-00001')
```

### 3. Use the Pinia store

```ts
<script setup lang="ts">
import { onMounted } from 'vue'
import { useInventoryStore } from 'fastfree-inventory/stores'

const store = useInventoryStore()

onMounted(async () => {
  await Promise.all([
    store.fetchProducts(),
    store.fetchWarehouses(),
    store.fetchStockEntries(),
  ])
})

// Access computed values
const lowStockCount = computed(() => store.lowStockProducts.length)
const totalValue = computed(() => store.totalStockValue)
</script>
```

### 4. Register screens manually (optional)

```ts
import {
  InventoryDashboard,
  ProductList,
  CategoryList,
  WarehouseList,
  SupplierList,
  StockEntryList,
} from 'fastfree-inventory'

// Screens are auto-registered via initFastFreeInventory()
// but you can also register them manually:
registerScreen('InventoryDashboard', InventoryDashboard)
```

---

## Architecture

```
packages/fastfree_inventory/
├── src/
│   ├── index.ts                    # Entry point — all exports
│   ├── init.ts                     # Initialization + translations + screen registration
│   ├── types/
│   │   └── index.ts                # TypeScript types & interfaces
│   ├── services/
│   │   ├── index.ts                # Barrel export for all services
│   │   ├── product.service.ts      # CRUD for products
│   │   ├── category.service.ts     # CRUD for categories
│   │   ├── warehouse.service.ts    # CRUD for warehouses
│   │   ├── supplier.service.ts     # CRUD for suppliers
│   │   ├── stock.service.ts        # CRUD for stock entries + submit/cancel
│   │   ├── stockLedger.service.ts  # Stock ledger + balances
│   │   ├── serial.service.ts       # Serial number tracking
│   │   ├── batch.service.ts        # Batch management
│   │   └── report.service.ts       # Inventory reports
│   ├── stores/
│   │   └── useInventoryStore.ts    # Pinia store with caching
│   └── screens/
│       ├── index.ts                # Barrel export for screens
│       ├── InventoryDashboard.vue  # Dashboard with stats cards
│       ├── ProductList.vue         # Product list with detail dialog
│       ├── ProductForm.vue         # Product creation form
│       ├── CategoryList.vue        # Category management
│       ├── WarehouseList.vue       # Warehouse management
│       ├── SupplierList.vue        # Supplier management
│       ├── StockEntryList.vue      # Stock entry list with submit/cancel
│       └── StockEntryForm.vue      # Stock entry creation form
```

**Dependencies:**

| Package | Purpose |
|---------|---------|
| `fastfree-auth` | API client (`getDoc`, `createDoc`, `updateDoc`, `deleteDoc`) + caching (`getCached`, `setCached`) |
| `quasar-app-extension-fastfree-lowcode` | Screen registration, i18n, group management |
| `dexie` | IndexedDB wrapper (local storage) |
| `pinia` | State management |
| `quasar` | UI components (QTable, QDialog, QForm, etc.) |
| `vue` | Core framework |

---

## API Reference

### Services

All services return `Promise<ApiResponse<T>>` where:

```ts
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
```

#### Product Service

```ts
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from 'fastfree-inventory'

// Fetch all products (limit 500)
const result = await getProducts()
// With filters
const filtered = await getProducts({ status: 'Active' })

// Fetch single product by name
const product = await getProduct('Product/Wireless Mouse')

// Create product
const created = await createProduct({
  productName: 'Wireless Mouse',
  productCode: 'WM-001',
  unitOfMeasure: 'Piece',
  status: 'Active',
  buyingPrice: 15.00,
  sellingPrice: 29.99,
  openingStock: 100,
  currentStock: 100,
  minimumStock: 20,
  maximumStock: 500,
  taxRate: 14,
  disabled: false,
})

// Update product
const updated = await updateProduct('Product/Wireless Mouse', {
  sellingPrice: 34.99,
  minimumStock: 30,
})

// Delete product
await deleteProduct('Product/Wireless Mouse')
```

#### Category Service

```ts
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from 'fastfree-inventory'

// Fetch all categories
const categories = await getCategories()

// Create category with parent
const created = await createCategory({
  categoryName: 'Electronics',
  categoryCode: 'ELEC',
  description: 'Electronic devices and accessories',
  disabled: false,
})

// Create subcategory
const subcategory = await createCategory({
  categoryName: 'Mice',
  categoryCode: 'ELEC-MICE',
  parent: 'Product Category/Electronics',
  disabled: false,
})

// Update category
await updateCategory('Product Category/Electronics', {
  description: 'All electronic products',
})
```

#### Warehouse Service

```ts
import {
  getWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from 'fastfree-inventory'

// Create warehouse
const warehouse = await createWarehouse({
  warehouseName: 'Main Warehouse',
  warehouseCode: 'WH-001',
  address: '123 Industrial Zone, Cairo',
  phone: '+20-123-456-7890',
  manager: 'Ahmed Hassan',
  disabled: false,
})

// Fetch all warehouses
const warehouses = await getWarehouses()
```

#### Supplier Service

```ts
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from 'fastfree-inventory'

// Create supplier
const supplier = await createSupplier({
  supplierName: 'Tech Supplies Co.',
  supplierCode: 'SUP-001',
  email: 'sales@techsupplies.com',
  phone: '+20-987-654-3210',
  contactPerson: 'Mohamed Ali',
  address: '456 Business District, Cairo',
  gstNumber: 'GST-123456',
  disabled: false,
})

// Fetch all suppliers
const suppliers = await getSuppliers()
```

#### Stock Entry Service

```ts
import {
  getStockEntries,
  getStockEntry,
  createStockEntry,
  updateStockEntry,
  deleteStockEntry,
  submitStockEntry,
  cancelStockEntry,
  getStockBalance,
} from 'fastfree-inventory'

// Create a stock receipt entry
const entry = await createStockEntry({
  entryType: 'Receipt',
  postingDate: '2026-08-08',
  remarks: 'Initial stock from supplier',
  items: [
    {
      product: 'Product/Wireless Mouse',
      quantity: 50,
      rate: 15.00,
      amount: 750.00,
    },
    {
      product: 'Product/Keyboard',
      quantity: 30,
      rate: 25.00,
      amount: 750.00,
    },
  ],
  totalAmount: 1500.00,
  status: 'Draft',
})

// Submit the entry (Draft → Submitted)
const submitted = await submitStockEntry('Stock Entry/STE-00001')

// Cancel a submitted entry
await cancelStockEntry('Stock Entry/STE-00001')

// Fetch stock balances
const balances = await getStockBalance()
// Filter by warehouse
const warehouseStock = await getStockBalance('Warehouse/WH-001')
// Filter by product
const productStock = await getStockBalance(undefined, 'Product/Wireless Mouse')
```

#### Stock Ledger Service

```ts
import { getStockLedgerEntries, getStockBalanceFromLedger } from 'fastfree-inventory'

// Get stock movements for a product
const movements = await getStockLedgerEntries('Product/Wireless Mouse')
// Filter by warehouse
const warehouseMovements = await getStockLedgerEntries(
  'Product/Wireless Mouse',
  'Warehouse/WH-001',
)

// Get current balance for a product in a warehouse
const balance = await getStockBalanceFromLedger(
  'Product/Wireless Mouse',
  'Warehouse/WH-001',
)
// Returns: { qty: 85, value: 1275.00 }
```

#### Serial Number Service

```ts
import {
  getSerialNumbers,
  getSerialNumber,
  createSerialNumber,
  updateSerialNumber,
} from 'fastfree-inventory'

// Create serial number
await createSerialNumber({
  serialNo: 'SN-2026-001',
  itemCode: 'Product/Wireless Mouse',
  itemName: 'Wireless Mouse',
  warehouse: 'Warehouse/WH-001',
  status: 'Available',
})

// Get serial numbers for a product
const serials = await getSerialNumbers('Product/Wireless Mouse')
// Filter by status
const available = await getSerialNumbers('Product/Wireless Mouse', 'Available')

// Update serial status (e.g., when issued)
await updateSerialNumber('Serial No/SN-2026-001', {
  status: 'Issued',
  deliveryDate: '2026-08-08',
})
```

#### Batch Service

```ts
import { getBatches, getBatch, createBatch, updateBatch } from 'fastfree-inventory'

// Create batch
await createBatch({
  batchId: 'BATCH-2026-001',
  itemCode: 'Product/Laptop Battery',
  itemName: 'Laptop Battery',
  manufacturingDate: '2026-01-15',
  expiryDate: '2028-01-15',
  batchQty: 200,
  stockUom: 'Piece',
})

// Get batches for a product
const batches = await getBatches('Product/Laptop Battery')

// Update batch quantity
await updateBatch('Batch/BATCH-2026-001', {
  batchQty: 180,
})
```

#### Report Service

```ts
import {
  getStockBalanceReport,
  getStockAgeReport,
  getWarehouseSummary,
} from 'fastfree-inventory'

// Stock balance report
const balanceReport = await getStockBalanceReport()
// Filter by warehouse
const warehouseReport = await getStockBalanceReport('Warehouse/WH-001')

// Stock age report ( ageing analysis )
const ageReport = await getStockAgeReport()

// Warehouse summary
const summary = await getWarehouseSummary()
// Returns: [{ warehouse: 'WH-001', totalItems: 45, totalValue: 125000 }]
```

---

### Types

```ts
import type {
  Product,
  ProductStatus,
  UnitOfMeasure,
  Category,
  Warehouse,
  StockEntry,
  StockEntryType,
  StockEntryStatus,
  StockEntryItem,
  Supplier,
  StockBalance,
  ApiResponse,
} from 'fastfree-inventory/types'
```

#### `UnitOfMeasure`

```ts
type UnitOfMeasure = 'Piece' | 'Kg' | 'Gram' | 'Liter' | 'Meter' | 'Box' | 'Pack' | 'Dozen'
```

#### `ProductStatus`

```ts
type ProductStatus = 'Active' | 'Inactive' | 'Discontinued'
```

#### `Product`

```ts
interface Product {
  name: string
  productName: string
  productCode: string
  category?: string
  unitOfMeasure: UnitOfMeasure
  status: ProductStatus
  buyingPrice: number
  sellingPrice: number
  openingStock: number
  currentStock: number
  minimumStock: number
  maximumStock: number
  warehouse?: string
  supplier?: string
  description?: string
  barcode?: string
  taxRate: number
  disabled: boolean
}
```

#### `Category`

```ts
interface Category {
  name: string
  categoryName: string
  categoryCode: string
  parent?: string
  description?: string
  disabled: boolean
}
```

#### `Warehouse`

```ts
interface Warehouse {
  name: string
  warehouseName: string
  warehouseCode: string
  address?: string
  phone?: string
  manager?: string
  company?: string
  disabled: boolean
}
```

#### `StockEntry`

```ts
type StockEntryType = 'Receipt' | 'Issue' | 'Transfer' | 'Adjustment'
type StockEntryStatus = 'Draft' | 'Submitted' | 'Cancelled'

interface StockEntryItem {
  product: string
  quantity: number
  rate: number
  amount: number
  sourceWarehouse?: string
  targetWarehouse?: string
}

interface StockEntry {
  name: string
  entryType: StockEntryType
  postingDate: string
  items: StockEntryItem[]
  status: StockEntryStatus
  company?: string
  remarks?: string
  totalAmount: number
}
```

#### `Supplier`

```ts
interface Supplier {
  name: string
  supplierName: string
  supplierCode: string
  email?: string
  phone?: string
  address?: string
  contactPerson?: string
  gstNumber?: string
  disabled: boolean
}
```

#### `StockBalance`

```ts
interface StockBalance {
  product: string
  productName: string
  warehouse: string
  warehouseName: string
  quantity: number
  valuationRate: number
  stockValue: number
}
```

#### `ApiResponse<T>`

```ts
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
```

#### `StockLedgerEntry`

```ts
interface StockLedgerEntry {
  name: string
  itemCode: string
  itemName: string
  warehouse: string
  postingDate: string
  postingTime: string
  voucherType: string
  voucherNo: string
  actualQty: number
  qtyAfterTransaction: number
  stockValue: number
  stockValueAfterTransaction: number
  batchNo?: string
  serialNo?: string
}
```

#### `SerialNo`

```ts
interface SerialNo {
  name: string
  serialNo: string
  itemCode: string
  itemName: string
  warehouse?: string
  status: 'Available' | 'Issued' | 'Transferred' | 'Expired' | 'Scrapped'
  purchaseDate?: string
  deliveryDate?: string
  batchNo?: string
}
```

#### `Batch`

```ts
interface Batch {
  name: string
  batchId: string
  itemCode: string
  itemName: string
  manufacturingDate?: string
  expiryDate?: string
  batchQty: number
  stockUom: string
}
```

#### `StockBalanceReport` / `StockAgeReport`

```ts
interface StockBalanceReport {
  itemCode: string
  itemName: string
  warehouse: string
  qty: number
  valuationRate: number
  stockValue: number
}

interface StockAgeReport {
  itemCode: string
  itemName: string
  warehouse: string
  qty: number
  ageInDays: number
  stockValue: number
}
```

---

### Screens

| Screen | Description |
|--------|-------------|
| `InventoryDashboard` | Stats cards (total products, low stock alerts, warehouses, entries) + recent entries table |
| `ProductList` | Product table with detail dialog, delete confirmation, and add button |
| `ProductForm` | Dialog form for creating products with category/warehouse/supplier selects |
| `CategoryList` | Inline form for add/edit + table with delete confirmation |
| `WarehouseList` | Inline form for add/edit + table with delete confirmation |
| `SupplierList` | Inline form for add/edit + table with delete confirmation |
| `StockEntryList` | Entry table with detail dialog, submit/cancel actions with confirmation |
| `StockEntryForm` | Dialog form with dynamic items, warehouse selects for transfers |

**Screens are auto-registered** when you call `initFastFreeInventory()` in your boot file. You can also register them manually:

```ts
import { registerScreen } from 'quasar-app-extension-fastfree-lowcode'
import { ProductList } from 'fastfree-inventory'

registerScreen('ProductList', ProductList)
```

---

## Store

The Pinia store (`useInventoryStore`) provides reactive state with built-in caching:

```ts
import { useInventoryStore } from 'fastfree-inventory/stores'

const store = useInventoryStore()
```

### State

| Property | Type | Description |
|----------|------|-------------|
| `products` | `Product[]` | All products |
| `categories` | `Category[]` | All categories |
| `warehouses` | `Warehouse[]` | All warehouses |
| `stockEntries` | `StockEntry[]` | All stock entries |
| `suppliers` | `Supplier[]` | All suppliers |
| `stockBalances` | `StockBalance[]` | Stock balances |
| `loading` | `boolean` | Loading state |
| `error` | `string \| null` | Last error message |

### Computed

| Property | Type | Description |
|----------|------|-------------|
| `activeProducts` | `Product[]` | Products with `status === 'Active'` |
| `lowStockProducts` | `Product[]` | Products where `currentStock <= minimumStock` |
| `draftEntries` | `StockEntry[]` | Entries with `status === 'Draft'` |
| `totalStockValue` | `number` | Sum of `currentStock * sellingPrice` for all products |

### Actions

```ts
// Fetch data (with caching)
await store.fetchProducts()
await store.fetchCategories()
await store.fetchWarehouses()
await store.fetchStockEntries()
await store.fetchSuppliers()
await store.fetchStockBalances('Warehouse/WH-001', 'Product/Wireless Mouse')

// Reset all state
store.$reset()
```

### Usage in Components

```vue
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useInventoryStore } from 'fastfree-inventory/stores'

const store = useInventoryStore()

onMounted(async () => {
  await Promise.all([
    store.fetchProducts(),
    store.fetchWarehouses(),
    store.fetchStockEntries(),
  ])
})

const stats = computed(() => ({
  totalProducts: store.products.length,
  lowStock: store.lowStockProducts.length,
  draftEntries: store.draftEntries.length,
  totalValue: store.totalStockValue,
}))
</script>

<template>
  <div>
    <p>Total Products: {{ stats.totalProducts }}</p>
    <p>Low Stock Alerts: {{ stats.lowStock }}</p>
    <p>Draft Entries: {{ stats.draftEntries }}</p>
    <p>Stock Value: {{ stats.totalValue.toLocaleString() }}</p>
  </div>
</template>
```

---

## Configuration

### Boot Order

The inventory module initializes after auth and lowcode:

```
fastfree-auth-init        →  API client + auth
fastfree-lowcode-init     →  Lowcode core
fastfree-inventory-init   →  Inventory screens + translations
```

### Translation Namespace

All translation keys are under the `inventory` namespace:

```ts
// Use in templates
$t('inventory.products')
$t('inventory.addProduct')
$t('inventory.lowStock')
```

### Exports Map

```json
{
  ".": "./src/index.ts",
  "./services": "./src/services/index.ts",
  "./stores": "./src/stores/useInventoryStore.ts",
  "./types": "./src/types/index.ts"
}
```

```ts
// Main entry
import { getProducts, useInventoryStore } from 'fastfree-inventory'

// Direct service import
import { createProduct } from 'fastfree-inventory/services'

// Store import
import { useInventoryStore } from 'fastfree-inventory/stores'

// Types import
import type { Product, StockEntry } from 'fastfree-inventory/types'
```

---

## License

MIT © FastFree
