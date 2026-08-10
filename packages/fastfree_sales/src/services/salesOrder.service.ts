import { getDocList, getDoc, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { SalesOrder } from '../types'

const DOCTYPE = 'Sales Order'

export async function getSalesOrders(): Promise<ApiResponse<SalesOrder[]>> {
  const result = await getDocList<SalesOrder>(DOCTYPE, undefined, ['name', 'customer', 'transaction_date', 'grand_total', 'status'], 'transaction_date', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch sales orders' } }
  return { success: true, data: result.data ?? [] }
}

export async function getSalesOrder(name: string): Promise<ApiResponse<SalesOrder>> {
  return getDoc<SalesOrder>(DOCTYPE, name)
}

export async function createSalesOrder(data: Partial<SalesOrder>): Promise<ApiResponse<SalesOrder>> {
  return createDoc<SalesOrder>(DOCTYPE, data)
}

export async function updateSalesOrder(name: string, data: Partial<SalesOrder>): Promise<ApiResponse<SalesOrder>> {
  return updateDoc<SalesOrder>(DOCTYPE, name, data)
}

export async function deleteSalesOrder(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}

export async function submitSalesOrder(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.submit_single', { doctype: DOCTYPE, docname: name })
}

export async function cancelSalesOrder(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.cancel', { doctype: DOCTYPE, docname: name })
}
