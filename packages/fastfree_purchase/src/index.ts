// ============================================================
// FastFree Purchase — Main Entry Point
// ============================================================

export { initFastFreePurchase } from './init'

export {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from './services'

export {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  submitPurchaseOrder,
  cancelPurchaseOrder,
} from './services'

export {
  getPurchaseReceipts,
  getPurchaseReceipt,
  createPurchaseReceipt,
  updatePurchaseReceipt,
  deletePurchaseReceipt,
  submitPurchaseReceipt,
  cancelPurchaseReceipt,
} from './services'

export {
  getPurchaseInvoices,
  getPurchaseInvoice,
  createPurchaseInvoice,
  updatePurchaseInvoice,
  deletePurchaseInvoice,
  submitPurchaseInvoice,
  cancelPurchaseInvoice,
} from './services'

export { getPurchaseSummary } from './services'

export { registerPurchaseScreens } from './screens/register'

export type {
  ApiResponse,
  PurchaseSummary,
  Supplier,
  SupplierType,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  PurchaseReceipt,
  PurchaseReceiptItem,
  PurchaseReceiptStatus,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  PurchaseInvoiceStatus,
} from './types'
