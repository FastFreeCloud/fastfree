// ============================================================
// FastFree Accounting — Fiscal Year Service
// ============================================================

import { getDoc, getDocList, createDoc, callPost } from 'fastfree-auth'
import type { FiscalYear, FiscalYearStatus, ApiResponse } from '../types'

// Raw Frappe v15 Fiscal Year doc (snake_case):
// { name: '2025', year, year_start_date, year_end_date, disabled: 0/1 }.
// There is NO is_current field — isCurrent is derived client-side (see below).
interface FrappeFiscalYearRow {
  name: string
  year?: string
  year_start_date?: string
  year_end_date?: string
  disabled?: number | boolean
}

// CHOICE (documented): isCurrent is derived as (today within
// [year_start_date, year_end_date]) using the local date in YYYY-MM-DD format
// to match Frappe Date fields. Missing dates → false.
function isCurrentFiscalYear(start?: string, end?: string): boolean {
  if (!start || !end) return false
  const today = new Date().toISOString().slice(0, 10)
  return start <= today && today <= end
}

/**
 * Map a raw Frappe Fiscal Year doc to the app's FiscalYear type.
 * Tolerates missing/extra fields — never throws on undefined.
 */
export function mapFrappeFiscalYear(row: FrappeFiscalYearRow): FiscalYear {
  const start = row.year_start_date ?? ''
  const end = row.year_end_date ?? ''
  const status: FiscalYearStatus = row.disabled === 1 || row.disabled === true ? 'Closed' : 'Open'
  return {
    name: row.name ?? '',
    yearStartDate: start,
    yearEndDate: end,
    status,
    isCurrent: isCurrentFiscalYear(start || undefined, end || undefined),
  }
}

export async function getFiscalYears(): Promise<ApiResponse<FiscalYear[]>> {
  const result = await getDocList<FrappeFiscalYearRow>('Fiscal Year', undefined, ['name', 'year', 'year_start_date', 'year_end_date', 'disabled'], 'year_start_date desc')
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch fiscal years' } }
  return { success: true, data: (result.data ?? []).map(mapFrappeFiscalYear) }
}

export async function getFiscalYear(name: string): Promise<ApiResponse<FiscalYear>> {
  const result = await getDoc<FrappeFiscalYearRow>('Fiscal Year', name)
  if (!result.success || !result.data) {
    return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch fiscal year' } }
  }
  return { success: true, data: mapFrappeFiscalYear(result.data) }
}

export async function createFiscalYear(data: Partial<FiscalYear>): Promise<ApiResponse<FiscalYear>> {
  const payload: Record<string, unknown> = {}
  if (data.yearStartDate) payload.year_start_date = data.yearStartDate
  if (data.yearEndDate) payload.year_end_date = data.yearEndDate
  if (data.status) payload.disabled = data.status === 'Closed' ? 1 : 0
  // NOTE: isCurrent has no backend field — derived client-side, never sent.
  const result = await createDoc<FrappeFiscalYearRow>('Fiscal Year', payload)
  if (!result.success || !result.data) {
    return { success: false, error: result.error ?? { code: 'CREATE_FAILED', message: 'Failed to create fiscal year' } }
  }
  return { success: true, data: mapFrappeFiscalYear(result.data) }
}

export async function closeFiscalYear(name: string): Promise<ApiResponse<FiscalYear>> {
  return callPost<FiscalYear>('accounts.doctype.fiscal_year.fiscal_year.close_fiscal_year', { name })
}
