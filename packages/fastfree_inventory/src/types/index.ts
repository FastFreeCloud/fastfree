// ============================================================
// FastFree Inventory — TypeScript Types
// ============================================================

// Unit of Measure
export type UnitOfMeasure = 'Piece' | 'Kg' | 'Gram' | 'Liter' | 'Meter' | 'Box' | 'Pack' | 'Dozen'

// Product Status
export type ProductStatus = 'Active' | 'Inactive' | 'Discontinued'

// Product
export interface Product {
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

// Category
export interface Category {
  name: string
  categoryName: string
  categoryCode: string
  parent?: string
  description?: string
  disabled: boolean
}

// Warehouse
export interface Warehouse {
  name: string
  warehouseName: string
  warehouseCode: string
  address?: string
  phone?: string
  manager?: string
  company?: string
  disabled: boolean
}

// Stock Entry
export type StockEntryType = 'Receipt' | 'Issue' | 'Transfer' | 'Adjustment'
export type StockEntryStatus = 'Draft' | 'Submitted' | 'Cancelled'

export interface StockEntryItem {
  product: string
  quantity: number
  rate: number
  amount: number
  sourceWarehouse?: string
  targetWarehouse?: string
}

export interface StockEntry {
  name: string
  entryType: StockEntryType
  postingDate: string
  items: StockEntryItem[]
  status: StockEntryStatus
  company?: string
  remarks?: string
  totalAmount: number
}

// Supplier
export interface Supplier {
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

// Stock Balance
export interface StockBalance {
  product: string
  productName: string
  warehouse: string
  warehouseName: string
  quantity: number
  valuationRate: number
  stockValue: number
}

// API Response (same as accounting)
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}