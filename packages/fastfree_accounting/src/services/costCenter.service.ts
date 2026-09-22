// ============================================================
// FastFree Accounting — Cost Center Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { CostCenter, ApiResponse } from '../types'

// Raw Frappe v15 Cost Center doc (snake_case):
// { name: 'FastFree Demo شركة - FFD', cost_center_name, parent_cost_center, company, ... }.
// There is NO standard budget field — the app-level budget defaults to 0 (see below).
interface FrappeCostCenterRow {
  name: string
  cost_center_name?: string
  parent_cost_center?: string
  company?: string
  disabled?: number | boolean
}

/**
 * Map a raw Frappe Cost Center doc to the app's CostCenter type.
 * Tolerates missing/extra fields — never throws on undefined.
 */
export function mapFrappeCostCenter(row: FrappeCostCenterRow): CostCenter {
  return {
    name: row.name ?? '',
    costCenterName: row.cost_center_name || row.name || '',
    // No dedicated code field on the backend — the doc name doubles as the code.
    costCenterCode: row.name ?? '',
    ...(row.parent_cost_center ? { parent: row.parent_cost_center } : {}),
    ...(row.company ? { company: row.company } : {}),
    // No standard budget field on Cost Center — default 0 (app-level concern).
    budget: 0,
    disabled: row.disabled === 1 || row.disabled === true,
  }
}

/**
 * Reverse-map the app's CostCenter to Frappe snake_case fields for writes.
 * App-only fields (budget, costCenterCode, disabled) have no standard backend
 * field and are never sent, so Frappe won't reject unknown fields.
 */
function toFrappeCostCenter(data: Partial<CostCenter>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (data.costCenterName) payload.cost_center_name = data.costCenterName
  if (data.parent) payload.parent_cost_center = data.parent
  if (data.company) payload.company = data.company
  return payload
}

export async function getCostCenters(company?: string): Promise<ApiResponse<CostCenter[]>> {
  const filters = company ? { company } as Record<string, unknown> : undefined
  const result = await getDocList<FrappeCostCenterRow>('Cost Center', filters, ['name', 'cost_center_name', 'parent_cost_center', 'company', 'disabled'], undefined, 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch cost centers' } }
  return { success: true, data: (result.data ?? []).map(mapFrappeCostCenter) }
}

export async function getCostCenter(name: string): Promise<ApiResponse<CostCenter>> {
  const result = await getDoc<FrappeCostCenterRow>('Cost Center', name)
  if (!result.success || !result.data) {
    return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch cost center' } }
  }
  return { success: true, data: mapFrappeCostCenter(result.data) }
}

export async function createCostCenter(data: Partial<CostCenter>): Promise<ApiResponse<CostCenter>> {
  const result = await createDoc<FrappeCostCenterRow>('Cost Center', toFrappeCostCenter(data))
  if (!result.success || !result.data) {
    return { success: false, error: result.error ?? { code: 'CREATE_FAILED', message: 'Failed to create cost center' } }
  }
  return { success: true, data: mapFrappeCostCenter(result.data) }
}

export async function updateCostCenter(name: string, data: Partial<CostCenter>): Promise<ApiResponse<CostCenter>> {
  const result = await updateDoc<FrappeCostCenterRow>('Cost Center', name, toFrappeCostCenter(data))
  if (!result.success || !result.data) {
    return { success: false, error: result.error ?? { code: 'UPDATE_FAILED', message: 'Failed to update cost center' } }
  }
  return { success: true, data: mapFrappeCostCenter(result.data) }
}

export async function deleteCostCenter(name: string): Promise<ApiResponse<void>> {
  return deleteDoc('Cost Center', name)
}
