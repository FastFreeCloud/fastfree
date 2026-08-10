// ============================================================
// FastFree Purchase — Purchase Receipt Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { PurchaseReceipt } from '../types'

const DOCTYPE = 'Purchase Receipt'

export async function getPurchaseReceipts(): Promise<ApiResponse<PurchaseReceipt[]>> {
  const result = await getDocList<PurchaseReceipt>(DOCTYPE, undefined, ['name', 'supplier', 'posting_date', 'grand_total', 'status'], 'posting_date', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch purchase receipts' } }
  return { success: true, data: result.data ?? [] }
}

export async function getPurchaseReceipt(name: string): Promise<ApiResponse<PurchaseReceipt>> {
  return getDoc<PurchaseReceipt>(DOCTYPE, name)
}

export async function createPurchaseReceipt(data: Partial<PurchaseReceipt>): Promise<ApiResponse<PurchaseReceipt>> {
  return createDoc<PurchaseReceipt>(DOCTYPE, data)
}

export async function updatePurchaseReceipt(name: string, data: Partial<PurchaseReceipt>): Promise<ApiResponse<PurchaseReceipt>> {
  return updateDoc<PurchaseReceipt>(DOCTYPE, name, data)
}

export async function deletePurchaseReceipt(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}

export async function submitPurchaseReceipt(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.submit_single', { doctype: DOCTYPE, docname: name })
}

export async function cancelPurchaseReceipt(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.cancel', { doctype: DOCTYPE, docname: name })
}
