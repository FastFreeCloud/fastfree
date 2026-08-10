// ============================================================
// FastFree Inventory — Warehouse Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { Warehouse, ApiResponse } from '../types'

export async function getWarehouses(filters?: Record<string, unknown>): Promise<ApiResponse<Warehouse[]>> {
  const result = await getDocList<Warehouse>('Warehouse', filters, undefined, undefined, 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch warehouses' } }
  return { success: true, data: result.data ?? [] }
}

export async function getWarehouse(name: string): Promise<ApiResponse<Warehouse>> {
  return getDoc<Warehouse>('Warehouse', name)
}

export async function createWarehouse(data: Partial<Warehouse>): Promise<ApiResponse<Warehouse>> {
  return createDoc<Warehouse>('Warehouse', data)
}

export async function updateWarehouse(name: string, data: Partial<Warehouse>): Promise<ApiResponse<Warehouse>> {
  return updateDoc<Warehouse>('Warehouse', name, data)
}

export async function deleteWarehouse(name: string): Promise<ApiResponse<void>> {
  return deleteDoc('Warehouse', name)
}