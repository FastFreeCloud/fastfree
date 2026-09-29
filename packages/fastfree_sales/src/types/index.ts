export type CustomerType = 'Company' | 'Individual'
export interface Customer {
  name: string
  customer_name: string
  customer_type: CustomerType
  customer_group: string
  territory: string
  email_id?: string
  mobile_no?: string
  default_currency?: string
  disabled?: boolean
}

export interface QuotationItem {
  name: string;
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  discount_percentage?: number;
  discount_amount?: number;
}

export interface Quotation {
  name: string;
  party_name: string;
  customer_name?: string;
  quotation_to?: string;
  transaction_date: string;
  valid_till?: string;
  status: 'Draft' | 'Open' | 'Ordered' | 'Expired' | 'Lost' | 'Cancelled';
  docstatus?: number;
  items: QuotationItem[];
  grand_total: number;
  currency?: string;
  company?: string;
  terms?: string;
  creation: string;
  modified: string;
  owner: string;
  [key: string]: unknown;
}

export interface SalesOrderItem {
  name: string;
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  discount_percentage?: number;
  discount_amount?: number;
  per_delivered?: number;
  per_billed?: number;
}

export interface SalesOrder {
  name: string;
  customer: string;
  customer_name?: string;
  transaction_date: string;
  delivery_date?: string;
  status: 'Draft' | 'To Deliver and Bill' | 'To Deliver' | 'To Bill' | 'Completed' | 'Cancelled';
  docstatus?: number;
  items: SalesOrderItem[];
  grand_total: number;
  currency?: string;
  company?: string;
  terms?: string;
  creation: string;
  modified: string;
  owner: string;
}

export interface SalesInvoiceItem {
  name: string;
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  discount_percentage?: number;
  discount_amount?: number;
}

export interface SalesInvoice {
  name: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  due_date?: string;
  status: 'Draft' | 'Unpaid' | 'Paid' | 'Partly Paid' | 'Overdue' | 'Cancelled';
  docstatus?: number;
  items: SalesInvoiceItem[];
  grand_total: number;
  outstanding_amount?: number;
  currency?: string;
  company?: string;
  terms?: string;
  creation: string;
  modified: string;
  owner: string;
}

export interface DeliveryNoteItem {
  name: string;
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  against_sales_order?: string;
}

export interface DeliveryNote {
  name: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  status: 'Draft' | 'To Bill' | 'Completed' | 'Cancelled';
  docstatus?: number;
  items: DeliveryNoteItem[];
  grand_total?: number;
  total?: number;
  currency?: string;
  company?: string;
  creation: string;
  modified: string;
  owner: string;
}