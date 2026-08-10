import { getDocList, getDoc, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { SalesInvoice } from '../types'

const DOCTYPE = 'Sales Invoice'

export async function getSalesInvoices(): Promise<ApiResponse<SalesInvoice[]>> {
  const result = await getDocList<SalesInvoice>(DOCTYPE, undefined, ['name', 'customer', 'posting_date', 'grand_total', 'outstanding_amount', 'status'], 'posting_date', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch sales invoices' } }
  return { success: true, data: result.data ?? [] }
}

export async function getSalesInvoice(name: string): Promise<ApiResponse<SalesInvoice>> {
  return getDoc<SalesInvoice>(DOCTYPE, name)
}

export async function createSalesInvoice(data: Partial<SalesInvoice>): Promise<ApiResponse<SalesInvoice>> {
  return createDoc<SalesInvoice>(DOCTYPE, data)
}

export async function updateSalesInvoice(name: string, data: Partial<SalesInvoice>): Promise<ApiResponse<SalesInvoice>> {
  return updateDoc<SalesInvoice>(DOCTYPE, name, data)
}

export async function deleteSalesInvoice(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}

export async function submitSalesInvoice(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.submit_single', { doctype: DOCTYPE, docname: name })
}

export async function cancelSalesInvoice(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.cancel', { doctype: DOCTYPE, docname: name })
}
