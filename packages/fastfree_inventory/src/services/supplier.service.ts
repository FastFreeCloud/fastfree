// ============================================================
// FastFree Inventory — Supplier Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { Supplier, ApiResponse } from '../types'

export async function getSuppliers(filters?: Record<string, unknown>): Promise<ApiResponse<Supplier[]>> {
  const result = await getDocList<Supplier>('Supplier', filters, undefined, undefined, 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch suppliers' } }
  return { success: true, data: result.data ?? [] }
}

export async function getSupplier(name: string): Promise<ApiResponse<Supplier>> {
  return getDoc<Supplier>('Supplier', name)
}

export async function createSupplier(data: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
  return createDoc<Supplier>('Supplier', data)
}

export async function updateSupplier(name: string, data: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
  return updateDoc<Supplier>('Supplier', name, data)
}

export async function deleteSupplier(name: string): Promise<ApiResponse<void>> {
  return deleteDoc('Supplier', name)
}