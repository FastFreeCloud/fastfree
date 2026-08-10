// ============================================================
// FastFree Accounting — General Ledger Service
// ============================================================

import { callGet } from 'fastfree-auth'
import type { LedgerEntry, ApiResponse } from '../types'

export async function getGeneralLedger(
  account: string,
  fromDate: string,
  toDate: string,
  costCenter?: string
): Promise<ApiResponse<LedgerEntry[]>> {
  const params: Record<string, unknown> = { account, from_date: fromDate, to_date: toDate }
  if (costCenter) params.cost_center = costCenter
  const result = await callGet<LedgerEntry[]>('accounts.general_ledger.get_ledger_entries', params)
  if (!result.success) return result
  return { success: true, data: result.data ?? [] }
}
