import { getDocList, getDoc, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { Quotation } from '../types'

const DOCTYPE = 'Quotation'

export async function getQuotations(): Promise<ApiResponse<Quotation[]>> {
  const result = await getDocList<Quotation>(DOCTYPE, undefined, ['name', 'customer', 'transaction_date', 'grand_total', 'status'], 'transaction_date', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch quotations' } }
  return { success: true, data: result.data ?? [] }
}

export async function getQuotation(name: string): Promise<ApiResponse<Quotation>> {
  return getDoc<Quotation>(DOCTYPE, name)
}

export async function createQuotation(data: Partial<Quotation>): Promise<ApiResponse<Quotation>> {
  return createDoc<Quotation>(DOCTYPE, data)
}

export async function updateQuotation(name: string, data: Partial<Quotation>): Promise<ApiResponse<Quotation>> {
  return updateDoc<Quotation>(DOCTYPE, name, data)
}

export async function deleteQuotation(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}

export async function submitQuotation(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.submit_single', { doctype: DOCTYPE, docname: name })
}

export async function cancelQuotation(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.cancel', { doctype: DOCTYPE, docname: name })
}
