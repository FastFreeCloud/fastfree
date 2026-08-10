// ============================================================
// FastFree Accounting — Cost Center Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { CostCenter, ApiResponse } from '../types'

export async function getCostCenters(company?: string): Promise<ApiResponse<CostCenter[]>> {
  const filters = company ? { company } as Record<string, unknown> : undefined
  const result = await getDocList<CostCenter>('Cost Center', filters, undefined, undefined, 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch cost centers' } }
  return { success: true, data: result.data ?? [] }
}

export async function getCostCenter(name: string): Promise<ApiResponse<CostCenter>> {
  return getDoc<CostCenter>('Cost Center', name)
}

export async function createCostCenter(data: Partial<CostCenter>): Promise<ApiResponse<CostCenter>> {
  return createDoc<CostCenter>('Cost Center', data)
}

export async function updateCostCenter(name: string, data: Partial<CostCenter>): Promise<ApiResponse<CostCenter>> {
  return updateDoc<CostCenter>('Cost Center', name, data)
}

export async function deleteCostCenter(name: string): Promise<ApiResponse<void>> {
  return deleteDoc('Cost Center', name)
}
