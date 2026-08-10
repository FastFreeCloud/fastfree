// ============================================================
// FastFree Accounting — Payment Entry Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { PaymentEntry, ApiResponse } from '../types'

export async function getPaymentEntries(filters?: Record<string, unknown>): Promise<ApiResponse<PaymentEntry[]>> {
  const result = await getDocList<PaymentEntry>('Payment Entry', filters, undefined, 'postingDate desc')
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch payment entries' } }
  return { success: true, data: result.data ?? [] }
}

export async function getPaymentEntry(name: string): Promise<ApiResponse<PaymentEntry>> {
  return getDoc<PaymentEntry>('Payment Entry', name)
}

export async function createPaymentEntry(data: Partial<PaymentEntry>): Promise<ApiResponse<PaymentEntry>> {
  return createDoc<PaymentEntry>('Payment Entry', data)
}

export async function updatePaymentEntry(name: string, data: Partial<PaymentEntry>): Promise<ApiResponse<PaymentEntry>> {
  return updateDoc<PaymentEntry>('Payment Entry', name, data)
}

export async function deletePaymentEntry(name: string): Promise<ApiResponse<void>> {
  return deleteDoc('Payment Entry', name)
}

export async function submitPaymentEntry(name: string): Promise<ApiResponse<PaymentEntry>> {
  return callPost<PaymentEntry>('accounts.doctype.payment_entry.payment_entry.submit_payment_entry', { name })
}
