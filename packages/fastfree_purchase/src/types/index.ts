// ============================================================
// FastFree Purchase — TypeScript Types
// ============================================================

// ------------------------------------------------------------
// Supplier
// ------------------------------------------------------------
export type SupplierType = 'Company' | 'Individual'

export interface Supplier {
  name: string
  supplierName: string
  supplierType: SupplierType
  mobileNo?: string
  email?: string
  address?: string
  disabled: boolean
}

// ------------------------------------------------------------
// Purchase Order
// ------------------------------------------------------------
export type PurchaseOrderStatus = 'Draft' | 'Submitted' | 'Cancelled' | 'Received'

export interface PurchaseOrderItem {
  itemCode: string
  itemName: string
  qty: number
  rate: number
  amount: number
  receivedQty: number
}

export interface PurchaseOrder {
  name: string
  supplier: string
  supplierName: string
  transactionDate: string
  items: PurchaseOrderItem[]
  total: number
  status: PurchaseOrderStatus
  docstatus: number
}

// ------------------------------------------------------------
// Purchase Receipt
// ------------------------------------------------------------
export type PurchaseReceiptStatus = 'Draft' | 'Submitted' | 'Cancelled'

export interface PurchaseReceiptItem {
  itemCode: string
  itemName: string
  qty: number
  receivedQty: number
}

export interface PurchaseReceipt {
  name: string
  supplier: string
  supplierName: string
  postingDate: string
  purchaseOrder?: string
  items: PurchaseReceiptItem[]
  total: number
  status: PurchaseReceiptStatus
  docstatus: number
}

// ------------------------------------------------------------
// Purchase Invoice
// ------------------------------------------------------------
export type PurchaseInvoiceStatus = 'Draft' | 'Submitted' | 'Cancelled' | 'Paid'

export interface PurchaseInvoiceItem {
  itemCode: string
  itemName: string
  qty: number
  rate: number
  amount: number
}

export interface PurchaseInvoice {
  name: string
  supplier: string
  supplierName: string
  postingDate: string
  dueDate?: string
  purchaseOrder?: string
  purchaseReceipt?: string
  items: PurchaseInvoiceItem[]
  total: number
  outstandingAmount: number
  status: PurchaseInvoiceStatus
  docstatus: number
}

// ------------------------------------------------------------
// Purchase Reports
// ------------------------------------------------------------
export interface PurchaseSummary {
  totalPurchases: number
  totalInvoices: number
  totalSuppliers: number
}

// ------------------------------------------------------------
// API
// ------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
