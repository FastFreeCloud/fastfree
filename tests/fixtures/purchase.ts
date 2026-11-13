/**
 * Purchase fixtures — suppliers, purchase orders, receipts and invoices.
 *
 * Order/invoice totals are derived from line items so factory output is always
 * internally consistent.
 */
import type {
  PurchaseInvoice,
  PurchaseInvoiceItem,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseReceipt,
  PurchaseReceiptItem,
  Supplier,
} from '../../packages/fastfree_purchase/src/types'
import { defineFactory, sumBy, unique } from './core'

export const supplier = defineFactory<Supplier>(() => ({
  name: unique('PSUP'),
  supplierName: 'Test Supplier',
  supplierType: 'Company',
  mobileNo: '+201000000004',
  email: `${unique('psup')}@fastfree.test`,
  address: '2 Test Street, Cairo',
  disabled: false,
}))

export const purchaseOrderItem = defineFactory<PurchaseOrderItem>(() => ({
  itemCode: unique('ITEM'),
  itemName: 'Test Item',
  qty: 5,
  rate: 100,
  amount: 5 * 100,
  receivedQty: 0,
}))

export const purchaseOrder = defineFactory<PurchaseOrder>(() => {
  const items = [purchaseOrderItem()]
  return {
    name: unique('PO'),
    supplier: 'Test Supplier',
    supplierName: 'Test Supplier',
    transactionDate: '2026-01-15',
    items,
    total: sumBy(items, (item) => item.amount),
    status: 'Draft',
    docstatus: 0,
  }
})

export const purchaseReceiptItem = defineFactory<PurchaseReceiptItem>(() => ({
  itemCode: unique('ITEM'),
  itemName: 'Test Item',
  qty: 5,
  receivedQty: 5,
}))

export const purchaseReceipt = defineFactory<PurchaseReceipt>(() => {
  const items = [purchaseReceiptItem()]
  return {
    name: unique('PR'),
    supplier: 'Test Supplier',
    supplierName: 'Test Supplier',
    postingDate: '2026-01-16',
    items,
    total: 5 * 100,
    status: 'Draft',
    docstatus: 0,
  }
})

export const purchaseInvoiceItem = defineFactory<PurchaseInvoiceItem>(() => ({
  itemCode: unique('ITEM'),
  itemName: 'Test Item',
  qty: 5,
  rate: 100,
  amount: 5 * 100,
}))

export const purchaseInvoice = defineFactory<PurchaseInvoice>(() => {
  const items = [purchaseInvoiceItem()]
  const total = sumBy(items, (item) => item.amount)
  return {
    name: unique('PI'),
    supplier: 'Test Supplier',
    supplierName: 'Test Supplier',
    postingDate: '2026-01-17',
    dueDate: '2026-02-17',
    items,
    total,
    outstandingAmount: total,
    status: 'Draft',
    docstatus: 0,
  }
})
