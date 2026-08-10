// ============================================================
// FastFree Purchase — Purchase Invoice Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { PurchaseInvoice } from '../types'

const DOCTYPE = 'Purchase Invoice'

export async function getPurchaseInvoices(): Promise<ApiResponse<PurchaseInvoice[]>> {
  const result = await getDocList<PurchaseInvoice>(DOCTYPE, undefined, ['name', 'supplier', 'posting_date', 'grand_total', 'outstanding_amount', 'status'], 'posting_date', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch purchase invoices' } }
  return { success: true, data: result.data ?? [] }
}

export async function getPurchaseInvoice(name: string): Promise<ApiResponse<PurchaseInvoice>> {
  return getDoc<PurchaseInvoice>(DOCTYPE, name)
}

export async function createPurchaseInvoice(data: Partial<PurchaseInvoice>): Promise<ApiResponse<PurchaseInvoice>> {
  return createDoc<PurchaseInvoice>(DOCTYPE, data)
}

export async function updatePurchaseInvoice(name: string, data: Partial<PurchaseInvoice>): Promise<ApiResponse<PurchaseInvoice>> {
  return updateDoc<PurchaseInvoice>(DOCTYPE, name, data)
}

export async function deletePurchaseInvoice(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}

export async function submitPurchaseInvoice(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.submit_single', { doctype: DOCTYPE, docname: name })
}

export async function cancelPurchaseInvoice(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.cancel', { doctype: DOCTYPE, docname: name })
}
