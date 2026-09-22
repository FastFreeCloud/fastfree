// ============================================================
// FastFree Accounting — General Ledger Service
// ============================================================

import { getDocList } from 'fastfree-auth'
import type { LedgerEntry, ApiResponse } from '../types'

// 'GL Entry' is a STOCK ERPNext doctype — queried directly via getDocList.
// (The old custom RPC accounts.general_ledger.get_ledger_entries does not exist.)
const GL_ENTRY_FIELDS = [
  'name',
  'posting_date',
  'account',
  'voucher_type',
  'voucher_no',
  'debit',
  'credit',
  'party',
  'cost_center',
  'remarks',
]

// Raw Frappe v15 GL Entry doc (snake_case). Debit/credit arrive as numbers
// but are coerced defensively (see toNumber).
interface FrappeGlRow {
  name: string
  posting_date?: string
  account?: string
  voucher_type?: string
  voucher_no?: string
  debit?: number | string
  credit?: number | string
  party?: string
  cost_center?: string
  remarks?: string
}

function toNumber(value: number | string | undefined): number {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0)
  return Number.isFinite(n) ? n : 0
}

/**
 * Map a raw Frappe GL Entry row to the app's LedgerEntry type.
 * Tolerates missing/extra fields — never throws on undefined.
 * The running balance is injected by the caller (computed client-side).
 */
export function mapFrappeGlEntry(row: FrappeGlRow, balance: number): LedgerEntry {
  return {
    date: row.posting_date ?? '',
    voucherType: row.voucher_type ?? '',
    voucherNumber: row.voucher_no || row.name || '',
    account: row.account ?? '',
    debit: toNumber(row.debit),
    credit: toNumber(row.credit),
    balance,
    ...(row.party ? { party: row.party } : {}),
    ...(row.cost_center ? { costCenter: row.cost_center } : {}),
    ...(row.remarks ? { remarks: row.remarks } : {}),
  }
}

export async function getGeneralLedger(
  account: string,
  fromDate: string,
  toDate: string,
  costCenter?: string
): Promise<ApiResponse<LedgerEntry[]>> {
  // Object-form filters, mirroring the rest of the repo (e.g. { parent_account: parent }).
  const filters: Record<string, unknown> = {
    account,
    posting_date: ['between', [fromDate, toDate]],
  }
  if (costCenter) filters.cost_center = costCenter
  const result = await getDocList<FrappeGlRow>('GL Entry', filters, GL_ENTRY_FIELDS, 'posting_date asc', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch ledger entries' } }
  // Defensive chronological sort so the client-side running balance stays
  // correct even if the backend ignores ordering.
  const rows = [...(result.data ?? [])].sort(
    (a, b) =>
      (a.posting_date ?? '').localeCompare(b.posting_date ?? '') ||
      (a.name ?? '').localeCompare(b.name ?? '')
  )
  let running = 0
  const data = rows.map((row) => {
    running += toNumber(row.debit) - toNumber(row.credit)
    return mapFrappeGlEntry(row, running)
  })
  return { success: true, data }
}
