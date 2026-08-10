export { initFastFreeSales } from './init'
export { useSalesStore } from './stores/useSalesStore'
export { registerSalesScreens } from './screens'

export {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './services'

export {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  submitQuotation,
  cancelQuotation,
} from './services'

export {
  getSalesOrders,
  getSalesOrder,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  submitSalesOrder,
  cancelSalesOrder,
} from './services'

export {
  getSalesInvoices,
  getSalesInvoice,
  createSalesInvoice,
  updateSalesInvoice,
  deleteSalesInvoice,
  submitSalesInvoice,
  cancelSalesInvoice,
} from './services'

export {
  getDeliveryNotes,
  getDeliveryNote,
  createDeliveryNote,
  updateDeliveryNote,
  deleteDeliveryNote,
  submitDeliveryNote,
  cancelDeliveryNote,
} from './services'

export {
  getSalesSummary,
  getTopSellingItems,
  getCustomerReceivables,
} from './services'

export type {
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
} from './types'
