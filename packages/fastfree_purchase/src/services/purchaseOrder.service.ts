// ============================================================
// FastFree Purchase — Purchase Order Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { PurchaseOrder } from '../types'

const DOCTYPE = 'Purchase Order'

export async function getPurchaseOrders(): Promise<ApiResponse<PurchaseOrder[]>> {
  const result = await getDocList<PurchaseOrder>(DOCTYPE, undefined, ['name', 'supplier', 'transaction_date', 'grand_total', 'status'], 'transaction_date', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch purchase orders' } }
  return { success: true, data: result.data ?? [] }
}

export async function getPurchaseOrder(name: string): Promise<ApiResponse<PurchaseOrder>> {
  return getDoc<PurchaseOrder>(DOCTYPE, name)
}

export async function createPurchaseOrder(data: Partial<PurchaseOrder>): Promise<ApiResponse<PurchaseOrder>> {
  return createDoc<PurchaseOrder>(DOCTYPE, data)
}

export async function updatePurchaseOrder(name: string, data: Partial<PurchaseOrder>): Promise<ApiResponse<PurchaseOrder>> {
  return updateDoc<PurchaseOrder>(DOCTYPE, name, data)
}

export async function deletePurchaseOrder(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}

export async function submitPurchaseOrder(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.submit_single', { doctype: DOCTYPE, docname: name })
}

export async function cancelPurchaseOrder(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.cancel', { doctype: DOCTYPE, docname: name })
}
