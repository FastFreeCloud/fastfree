// ============================================================
// FastFree Accounting — Payment Entry Service
// ============================================================
// Maps Frappe v15 snake_case backend docs to camelCase app types.
// Every mapper tolerates missing/extra fields and never throws.

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { PaymentEntry, PaymentStatus, ApiResponse } from '../types'

// ------------------------------------------------------------
// Backend (snake_case) shapes — partial by design: Frappe may
// omit fields on list responses and may add extra fields.
// ------------------------------------------------------------
interface PaymentEntryRaw {
  name?: unknown
  payment_type?: unknown
  party_type?: unknown
  party?: unknown
  posting_date?: unknown
  mode_of_payment?: unknown
  party_account?: unknown
  paid_from?: unknown
  paid_to?: unknown
  paid_amount?: unknown
  received_amount?: unknown
  reference_name?: unknown
  reference_type?: unknown
  docstatus?: unknown
  company?: unknown
  remarks?: unknown
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

function mapDocstatusToStatus(docstatus: unknown): PaymentStatus {
  const n = typeof docstatus === 'number' ? docstatus : Number(docstatus)
  if (n === 1) return 'Submitted'
  if (n === 2) return 'Cancelled'
  return 'Draft'
}

function mapPaymentType(value: unknown): PaymentEntry['paymentType'] {
  if (value === 'Receive' || value === 'Internal Transfer' || value === 'Pay') return value
  return 'Pay'
}

function mapPartyType(value: unknown): PaymentEntry['partyType'] {
  if (value === 'Supplier' || value === 'Employee' || value === 'Customer') return value
  return 'Customer'
}

function mapPaymentEntry(raw: unknown): PaymentEntry {
  const doc = (raw ?? {}) as PaymentEntryRaw
  const entry: PaymentEntry = {
    name: toStringOr(doc.name, ''),
    paymentType: mapPaymentType(doc.payment_type),
    partyType: mapPartyType(doc.party_type),
    party: toStringOr(doc.party, ''),
    postingDate: toStringOr(doc.posting_date, ''),
    modeOfPayment: toStringOr(doc.mode_of_payment, ''),
    partyAccount: toStringOr(doc.party_account, ''),
    paidAmount: toNumberOr(doc.paid_amount, 0),
    receivedAmount: toNumberOr(doc.received_amount, 0),
    status: mapDocstatusToStatus(doc.docstatus),
  }
  const paidFrom = toOptionalString(doc.paid_from)
  if (paidFrom !== undefined) entry.paidFrom = paidFrom
  const paidTo = toOptionalString(doc.paid_to)
  if (paidTo !== undefined) entry.paidTo = paidTo
  const referenceName = toOptionalString(doc.reference_name)
  if (referenceName !== undefined) entry.referenceName = referenceName
  const referenceType = toOptionalString(doc.reference_type)
  if (referenceType !== undefined) entry.referenceType = referenceType
  const company = toOptionalString(doc.company)
  if (company !== undefined) entry.company = company
  const remarks = toOptionalString(doc.remarks)
  if (remarks !== undefined) entry.remarks = remarks
  return entry
}

function mapPaymentEntryToBackend(data: Partial<PaymentEntry>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  // NOTE: status/docstatus intentionally never sent — submission state
  // changes only via the submitPaymentEntry RPC call.
  if (data.paymentType !== undefined) out['payment_type'] = data.paymentType
  if (data.partyType !== undefined) out['party_type'] = data.partyType
  if (data.party !== undefined) out['party'] = data.party
  if (data.postingDate !== undefined) out['posting_date'] = data.postingDate
  if (data.modeOfPayment !== undefined) out['mode_of_payment'] = data.modeOfPayment
  if (data.partyAccount !== undefined) out['party_account'] = data.partyAccount
  if (data.paidFrom !== undefined) out['paid_from'] = data.paidFrom
  if (data.paidTo !== undefined) out['paid_to'] = data.paidTo
  if (data.paidAmount !== undefined) out['paid_amount'] = data.paidAmount
  if (data.receivedAmount !== undefined) out['received_amount'] = data.receivedAmount
  if (data.referenceName !== undefined) out['reference_name'] = data.referenceName
  if (data.referenceType !== undefined) out['reference_type'] = data.referenceType
  if (data.company !== undefined) out['company'] = data.company
  if (data.remarks !== undefined) out['remarks'] = data.remarks
  return out
}

function mapFailure<T>(result: { error?: ApiResponse<T>['error'] }, fallbackCode: string, fallbackMessage: string): ApiResponse<T> {
  return { success: false, error: result.error ?? { code: fallbackCode, message: fallbackMessage } }
}

// Frappe get_list returns only `name` unless fields are requested — ask for
// every column the list/detail screens render so rows are never hollow.
const PAYMENT_LIST_FIELDS = [
  'name',
  'payment_type',
  'party_type',
  'party',
  'posting_date',
  'company',
  'paid_from',
  'paid_to',
  'paid_amount',
  'received_amount',
  'mode_of_payment',
  'party_account',
  'reference_name',
  'reference_type',
  'remarks',
  'docstatus',
]

export async function getPaymentEntries(filters?: Record<string, unknown>): Promise<ApiResponse<PaymentEntry[]>> {
  const result = await getDocList<PaymentEntryRaw>('Payment Entry', filters, PAYMENT_LIST_FIELDS, 'posting_date desc')
  if (!result.success) return mapFailure(result, 'FETCH_FAILED', 'Failed to fetch payment entries')
  return { success: true, data: (result.data ?? []).map(mapPaymentEntry) }
}

export async function getPaymentEntry(name: string): Promise<ApiResponse<PaymentEntry>> {
  const result = await getDoc<PaymentEntryRaw>('Payment Entry', name)
  if (!result.success) return mapFailure(result, 'FETCH_FAILED', 'Failed to fetch payment entry')
  return { success: true, data: mapPaymentEntry(result.data) }
}

export async function createPaymentEntry(data: Partial<PaymentEntry>): Promise<ApiResponse<PaymentEntry>> {
  const result = await createDoc<PaymentEntryRaw>('Payment Entry', mapPaymentEntryToBackend(data))
  if (!result.success) return mapFailure(result, 'CREATE_FAILED', 'Failed to create payment entry')
  return { success: true, data: mapPaymentEntry(result.data) }
}

export async function updatePaymentEntry(name: string, data: Partial<PaymentEntry>): Promise<ApiResponse<PaymentEntry>> {
  const result = await updateDoc<PaymentEntryRaw>('Payment Entry', name, mapPaymentEntryToBackend(data))
  if (!result.success) return mapFailure(result, 'UPDATE_FAILED', 'Failed to update payment entry')
  return { success: true, data: mapPaymentEntry(result.data) }
}

export async function deletePaymentEntry(name: string): Promise<ApiResponse<void>> {
  return deleteDoc('Payment Entry', name)
}

export async function submitPaymentEntry(name: string): Promise<ApiResponse<PaymentEntry>> {
  return callPost<PaymentEntry>('accounts.doctype.payment_entry.payment_entry.submit_payment_entry', { name })
}
