export type CustomerType = 'Individual' | 'Company'

export interface Customer {
  name: string;
  customer_name: string;
  customer_type: 'Individual' | 'Company';
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  default_currency?: string;
  is_active: boolean;
  creation: string;
  modified: string;
  owner: string;
}

export interface QuotationItem {
  name: string;
  item_code: string;
  item_name: string;
  description?: string;
  quantity: number;
  rate: number;
  amount: number;
  discount_percentage?: number;
  discount_amount?: number;
  net_amount: number;
}

export interface Quotation {
  name: string;
  customer: string;
  customer_name: string;
  transaction_date: string;
  valid_till: string;
  status: 'Draft' | 'Submitted' | 'Cancelled' | 'Expired' | 'Rejected';
  items: QuotationItem[];
  total: number;
  total_discount?: number;
  grand_total: number;
  currency: string;
  company?: string;
  terms?: string;
  creation: string;
  modified: string;
  owner: string;
}

export interface SalesOrderItem {
  name: string;
  item_code: string;
  item_name: string;
  description?: string;
  quantity: number;
  rate: number;
  amount: number;
  discount_percentage?: number;
  discount_amount?: number;
  net_amount: number;
  delivered_qty?: number;
  pending_qty?: number;
}

export interface SalesOrder {
  name: string;
  customer: string;
  customer_name: string;
  transaction_date: string;
  delivery_date?: string;
  status: 'Draft' | 'Submitted' | 'Cancelled' | 'Partially Delivered' | 'Delivered';
  items: SalesOrderItem[];
  total: number;
  total_discount?: number;
  grand_total: number;
  currency: string;
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
  quantity: number;
  rate: number;
  amount: number;
  discount_percentage?: number;
  discount_amount?: number;
  net_amount: number;
}

export interface SalesInvoice {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date?: string;
  status: 'Draft' | 'Submitted' | 'Cancelled' | 'Paid' | 'Partially Paid';
  items: SalesInvoiceItem[];
  total: number;
  total_discount?: number;
  grand_total: number;
  currency: string;
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
  quantity: number;
  delivered_qty: number;
  rate: number;
  amount: number;
}

export interface DeliveryNote {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  sales_order?: string;
  status: 'Draft' | 'Submitted' | 'Cancelled';
  items: DeliveryNoteItem[];
  total: number;
  currency: string;
  company?: string;
  creation: string;
  modified: string;
  owner: string;
}