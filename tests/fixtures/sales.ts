/**
 * Sales fixtures — customers, quotations, sales orders, sales invoices and
 * delivery notes.
 *
 * Document totals are derived from line items so factory output is always
 * internally consistent. Field names follow the Frappe snake_case contract.
 */
import type {
  Customer,
  DeliveryNote,
  DeliveryNoteItem,
  Quotation,
  QuotationItem,
  SalesInvoice,
  SalesInvoiceItem,
  SalesOrder,
  SalesOrderItem,
} from '../../packages/fastfree_sales/src/types'
import { defineFactory, sumBy, unique } from './core'

const CREATED_AT = '2026-01-15T10:00:00.000Z'
const MODIFIED_AT = '2026-01-15T10:05:00.000Z'

export const customer = defineFactory<Customer>(() => ({
  name: unique('CUST'),
  customer_name: 'Test Customer',
  customer_type: 'Company',
  customer_group: 'Commercial',
  territory: 'Egypt',
  email_id: `${unique('cust')}@fastfree.test`,
  mobile_no: '+201000000005',
  default_currency: 'EGP',
  disabled: false,
}))

export const quotationItem = defineFactory<QuotationItem>(() => ({
  name: unique('QTN-ITEM'),
  item_code: unique('SKU'),
  item_name: 'Test Item',
  qty: 2,
  rate: 100,
  amount: 2 * 100,
}))

export const quotation = defineFactory<Quotation>(() => {
  const items = [quotationItem()]
  return {
    name: unique('QTN'),
    party_name: 'Test Customer',
    customer_name: 'Test Customer',
    quotation_to: 'Customer',
    transaction_date: '2026-01-15',
    valid_till: '2026-02-15',
    status: 'Draft',
    items,
    grand_total: sumBy(items, (item) => item.amount),
    currency: 'EGP',
    creation: CREATED_AT,
    modified: MODIFIED_AT,
    owner: 'test.user@fastfree.test',
  }
})

export const salesOrderItem = defineFactory<SalesOrderItem>(() => ({
  name: unique('SO-ITEM'),
  item_code: unique('SKU'),
  item_name: 'Test Item',
  qty: 3,
  rate: 100,
  amount: 3 * 100,
  per_delivered: 0,
  per_billed: 0,
}))

export const salesOrder = defineFactory<SalesOrder>(() => {
  const items = [salesOrderItem()]
  return {
    name: unique('SO'),
    customer: 'Test Customer',
    customer_name: 'Test Customer',
    transaction_date: '2026-01-15',
    delivery_date: '2026-01-20',
    status: 'Draft',
    items,
    grand_total: sumBy(items, (item) => item.amount),
    currency: 'EGP',
    creation: CREATED_AT,
    modified: MODIFIED_AT,
    owner: 'test.user@fastfree.test',
  }
})

export const salesInvoiceItem = defineFactory<SalesInvoiceItem>(() => ({
  name: unique('INV-ITEM'),
  item_code: unique('SKU'),
  item_name: 'Test Item',
  qty: 4,
  rate: 100,
  amount: 4 * 100,
}))

export const salesInvoice = defineFactory<SalesInvoice>(() => {
  const items = [salesInvoiceItem()]
  const grandTotal = sumBy(items, (item) => item.amount)
  return {
    name: unique('INV'),
    customer: 'Test Customer',
    customer_name: 'Test Customer',
    posting_date: '2026-01-18',
    due_date: '2026-02-18',
    status: 'Draft',
    items,
    grand_total: grandTotal,
    outstanding_amount: grandTotal,
    currency: 'EGP',
    creation: CREATED_AT,
    modified: MODIFIED_AT,
    owner: 'test.user@fastfree.test',
  }
})

export const deliveryNoteItem = defineFactory<DeliveryNoteItem>(() => ({
  name: unique('DN-ITEM'),
  item_code: unique('SKU'),
  item_name: 'Test Item',
  qty: 4,
  rate: 100,
  amount: 4 * 100,
}))

export const deliveryNote = defineFactory<DeliveryNote>(() => {
  const items = [deliveryNoteItem()]
  return {
    name: unique('DN'),
    customer: 'Test Customer',
    customer_name: 'Test Customer',
    posting_date: '2026-01-20',
    status: 'Draft',
    items,
    total: sumBy(items, (item) => item.amount),
    currency: 'EGP',
    creation: CREATED_AT,
    modified: MODIFIED_AT,
    owner: 'test.user@fastfree.test',
  }
})
