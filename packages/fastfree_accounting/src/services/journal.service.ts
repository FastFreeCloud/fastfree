// ============================================================
// FastFree Accounting — Journal Entry Service
// ============================================================
// Maps Frappe v15 snake_case backend docs to camelCase app types.
// Every mapper tolerates missing/extra fields and never throws.

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { JournalEntry, JournalEntryAccount, JournalEntryStatus, ApiResponse } from '../types'

// ------------------------------------------------------------
// Backend (snake_case) shapes — partial by design: Frappe may
// omit fields on list responses and may add extra fields.
// ------------------------------------------------------------
interface JournalEntryAccountRaw {
  account?: unknown
  debit?: unknown
  credit?: unknown
  cost_center?: unknown
  reference_type?: unknown
  reference_name?: unknown
  remark?: unknown
}

interface JournalEntryRaw {
  name?: unknown
  title?: unknown
  voucher_type?: unknown
  company?: unknown
  posting_date?: unknown
  user_remark?: unknown
  remark?: unknown
  total_debit?: unknown
  total_credit?: unknown
  docstatus?: unknown
  accounts?: unknown
}

// ------------------------------------------------------------
// Safe coercion helpers (never throw on undefined/extra data)
// ------------------------------------------------------------
function toStringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function toNumberOr(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function mapDocstatusToStatus(docstatus: unknown): JournalEntryStatus {
  const n = typeof docstatus === 'number' ? docstatus : Number(docstatus)
  if (n === 1) return 'Submitted'
  if (n === 2) return 'Cancelled'
  return 'Draft'
}

function mapVoucherTypeToEntryType(voucherType: unknown): JournalEntry['entryType'] {
  if (voucherType === 'Bank Entry' || voucherType === 'Cash Entry' || voucherType === 'Journal Entry') {
    return voucherType
  }
  return 'Journal Entry'
}

function mapAccountRow(raw: unknown): JournalEntryAccount {
  const row = (raw ?? {}) as JournalEntryAccountRaw
  const account: JournalEntryAccount = {
    account: toStringOr(row.account, ''),
    debit: toNumberOr(row.debit, 0),
    credit: toNumberOr(row.credit, 0),
  }
  const costCenter = toOptionalString(row.cost_center)
  if (costCenter !== undefined) account.costCenter = costCenter
  const referenceType = toOptionalString(row.reference_type)
  if (referenceType !== undefined) account.referenceType = referenceType
  const referenceName = toOptionalString(row.reference_name)
  if (referenceName !== undefined) account.referenceName = referenceName
  const remark = toOptionalString(row.remark)
  if (remark !== undefined) account.remark = remark
  return account
}

function mapJournalEntry(raw: unknown): JournalEntry {
  const doc = (raw ?? {}) as JournalEntryRaw
  const rows = Array.isArray(doc.accounts) ? doc.accounts.map(mapAccountRow) : []
  // Backend carries both user_remark (user input) and remark (system narration);
  // prefer the user-entered value, fall back to the system one.
  const userRemark = toOptionalString(doc.user_remark)
  const systemRemark = toOptionalString(doc.remark)
  const entry: JournalEntry = {
    name: toStringOr(doc.name, ''),
    postingDate: toStringOr(doc.posting_date, ''),
    entryType: mapVoucherTypeToEntryType(doc.voucher_type),
    status: mapDocstatusToStatus(doc.docstatus),
    accounts: rows,
    totalDebit: toNumberOr(doc.total_debit, 0),
    totalCredit: toNumberOr(doc.total_credit, 0),
  }
  const title = toOptionalString(doc.title)
  if (title !== undefined) entry.title = title
  const company = toOptionalString(doc.company)
  if (company !== undefined) entry.company = company
  const remark = userRemark ?? systemRemark
  if (remark !== undefined) entry.remark = remark
  return entry
}

function mapAccountRowToBackend(row: JournalEntryAccount): Record<string, unknown> {
  const out: Record<string, unknown> = {
    account: row.account,
    debit: row.debit,
    credit: row.credit,
  }
  if (row.costCenter !== undefined) out['cost_center'] = row.costCenter
  if (row.referenceType !== undefined) out['reference_type'] = row.referenceType
  if (row.referenceName !== undefined) out['reference_name'] = row.referenceName
  if (row.remark !== undefined) out['remark'] = row.remark
  return out
}

function mapJournalEntryToBackend(data: Partial<JournalEntry>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  // NOTE: status/docstatus intentionally never sent — submission state
  // changes only via submitJournalEntry/cancelJournalEntry RPC calls.
  if (data.title !== undefined) out['title'] = data.title
  if (data.postingDate !== undefined) out['posting_date'] = data.postingDate
  if (data.entryType !== undefined) out['voucher_type'] = data.entryType
  if (data.company !== undefined) out['company'] = data.company
  if (data.remark !== undefined) {
    out['user_remark'] = data.remark
    out['remark'] = data.remark
  }
  if (data.totalDebit !== undefined) out['total_debit'] = data.totalDebit
  if (data.totalCredit !== undefined) out['total_credit'] = data.totalCredit
  if (data.accounts !== undefined) out['accounts'] = data.accounts.map(mapAccountRowToBackend)
  return out
}

function mapFailure<T>(result: { error?: ApiResponse<T>['error'] }, fallbackCode: string, fallbackMessage: string): ApiResponse<T> {
  return { success: false, error: result.error ?? { code: fallbackCode, message: fallbackMessage } }
}

// Frappe get_list returns only `name` unless fields are requested — ask for
// every column the list/detail screens render so rows are never hollow.
const JOURNAL_LIST_FIELDS = [
  'name',
  'title',
  'voucher_type',
  'company',
  'posting_date',
  'user_remark',
  'remark',
  'total_debit',
  'total_credit',
  'docstatus',
]

export async function getJournalEntries(filters?: Record<string, unknown>): Promise<ApiResponse<JournalEntry[]>> {
  const result = await getDocList<JournalEntryRaw>('Journal Entry', filters, JOURNAL_LIST_FIELDS, 'posting_date desc')
  if (!result.success) return mapFailure(result, 'FETCH_FAILED', 'Failed to fetch journal entries')
  return { success: true, data: (result.data ?? []).map(mapJournalEntry) }
}

export async function getJournalEntry(name: string): Promise<ApiResponse<JournalEntry>> {
  const result = await getDoc<JournalEntryRaw>('Journal Entry', name)
  if (!result.success) return mapFailure(result, 'FETCH_FAILED', 'Failed to fetch journal entry')
  return { success: true, data: mapJournalEntry(result.data) }
}

export async function createJournalEntry(data: Partial<JournalEntry>): Promise<ApiResponse<JournalEntry>> {
  const result = await createDoc<JournalEntryRaw>('Journal Entry', mapJournalEntryToBackend(data))
  if (!result.success) return mapFailure(result, 'CREATE_FAILED', 'Failed to create journal entry')
  return { success: true, data: mapJournalEntry(result.data) }
}

export async function updateJournalEntry(name: string, data: Partial<JournalEntry>): Promise<ApiResponse<JournalEntry>> {
  const result = await updateDoc<JournalEntryRaw>('Journal Entry', name, mapJournalEntryToBackend(data))
  if (!result.success) return mapFailure(result, 'UPDATE_FAILED', 'Failed to update journal entry')
  return { success: true, data: mapJournalEntry(result.data) }
}

export async function deleteJournalEntry(name: string): Promise<ApiResponse<void>> {
  return deleteDoc('Journal Entry', name)
}

export async function submitJournalEntry(name: string): Promise<ApiResponse<JournalEntry>> {
  return callPost<JournalEntry>('accounts.doctype.journal_entry.journal_entry.submit_journal_entry', { name })
}

export async function cancelJournalEntry(name: string): Promise<ApiResponse<JournalEntry>> {
  return callPost<JournalEntry>('accounts.doctype.journal_entry.journal_entry.cancel_journal_entry', { name })
}
