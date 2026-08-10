import { getDocList, getDoc, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { DeliveryNote } from '../types'

const DOCTYPE = 'Delivery Note'

export async function getDeliveryNotes(): Promise<ApiResponse<DeliveryNote[]>> {
  const result = await getDocList<DeliveryNote>(DOCTYPE, undefined, ['name', 'customer', 'posting_date', 'status'], 'posting_date', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch delivery notes' } }
  return { success: true, data: result.data ?? [] }
}

export async function getDeliveryNote(name: string): Promise<ApiResponse<DeliveryNote>> {
  return getDoc<DeliveryNote>(DOCTYPE, name)
}

export async function createDeliveryNote(data: Partial<DeliveryNote>): Promise<ApiResponse<DeliveryNote>> {
  return createDoc<DeliveryNote>(DOCTYPE, data)
}

export async function updateDeliveryNote(name: string, data: Partial<DeliveryNote>): Promise<ApiResponse<DeliveryNote>> {
  return updateDoc<DeliveryNote>(DOCTYPE, name, data)
}

export async function deleteDeliveryNote(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}

export async function submitDeliveryNote(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.submit_single', { doctype: DOCTYPE, docname: name })
}

export async function cancelDeliveryNote(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.cancel', { doctype: DOCTYPE, docname: name })
}
