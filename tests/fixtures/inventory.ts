/**
 * Inventory fixtures — products, categories, warehouses, suppliers, stock
 * entries and stock balances.
 *
 * Stock-entry totals are derived from line items so factory output is always
 * internally consistent.
 */
import type {
  Category,
  Product,
  StockBalance,
  StockEntry,
  StockEntryItem,
  Supplier,
  Warehouse,
} from '../../packages/fastfree_inventory/src/types'
import { defineFactory, sumBy, unique } from './core'

export const product = defineFactory<Product>(() => ({
  name: unique('PROD'),
  productName: 'Test Product',
  productCode: unique('SKU'),
  category: 'General',
  unitOfMeasure: 'Piece',
  status: 'Active',
  buyingPrice: 50,
  sellingPrice: 80,
  openingStock: 100,
  currentStock: 100,
  minimumStock: 10,
  maximumStock: 500,
  warehouse: 'Main Warehouse',
  supplier: 'Test Supplier',
  taxRate: 14,
  disabled: false,
}))

export const category = defineFactory<Category>(() => ({
  name: unique('CAT'),
  categoryName: 'General',
  categoryCode: unique('CAT'),
  disabled: false,
}))

export const warehouse = defineFactory<Warehouse>(() => ({
  name: unique('WH'),
  warehouseName: 'Main Warehouse',
  warehouseCode: unique('WH'),
  company: 'FastFree',
  disabled: false,
}))

export const supplier = defineFactory<Supplier>(() => ({
  name: unique('SUP'),
  supplierName: 'Test Supplier',
  supplierCode: unique('SUP'),
  email: `${unique('sup')}@fastfree.test`,
  phone: '+201000000003',
  contactPerson: 'Supply Contact',
  disabled: false,
}))

export const stockEntryItem = defineFactory<StockEntryItem>(() => ({
  product: product().name,
  quantity: 10,
  rate: 50,
  amount: 10 * 50,
  targetWarehouse: 'Main Warehouse',
}))

export const stockEntry = defineFactory<StockEntry>(() => {
  const items = [stockEntryItem()]
  return {
    name: unique('STE'),
    entryType: 'Receipt',
    postingDate: '2026-01-15',
    items,
    status: 'Draft',
    company: 'FastFree',
    remarks: 'Initial stock',
    totalAmount: sumBy(items, (item) => item.amount),
  }
})

export const stockBalance = defineFactory<StockBalance>(() => ({
  product: product().name,
  productName: 'Test Product',
  warehouse: 'Main Warehouse',
  warehouseName: 'Main Warehouse',
  quantity: 100,
  valuationRate: 50,
  stockValue: 100 * 50,
}))
