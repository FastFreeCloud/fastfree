// ============================================================
// FastFree Accounting — Fiscal Year Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, callPost } from 'fastfree-auth'
import type { FiscalYear, ApiResponse } from '../types'

export async function getFiscalYears(): Promise<ApiResponse<FiscalYear[]>> {
  const result = await getDocList<FiscalYear>('Fiscal Year', undefined, undefined, 'yearStartDate desc')
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch fiscal years' } }
  return { success: true, data: result.data ?? [] }
}

export async function getFiscalYear(name: string): Promise<ApiResponse<FiscalYear>> {
  return getDoc<FiscalYear>('Fiscal Year', name)
}

export async function createFiscalYear(data: Partial<FiscalYear>): Promise<ApiResponse<FiscalYear>> {
  return createDoc<FiscalYear>('Fiscal Year', data)
}

export async function closeFiscalYear(name: string): Promise<ApiResponse<FiscalYear>> {
  return callPost<FiscalYear>('accounts.doctype.fiscal_year.fiscal_year.close_fiscal_year', { name })
}
