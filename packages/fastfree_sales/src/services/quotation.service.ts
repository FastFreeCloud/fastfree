import { getDocList, getDoc, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { Quotation } from '../types'

const DOCTYPE = 'Quotation'

interface NamedRow {
  name?: unknown
}

interface ItemMasterRow {
  item_name?: unknown
  stock_uom?: unknown
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

// Frappe runs mandatory-field checks before its item-details autofill, so rows
// created through the API must already carry item_name (and uom). Enrich any
// incomplete rows from the Item master before insert/update.
async function enrichItems<T extends { item_code?: string; item_name?: string; uom?: string }>(
  items: T[],
): Promise<T[]> {
  const enriched: T[] = []
  for (const item of items) {
    if (((item.item_name ?? '') !== '' && (item.uom ?? '') !== '') || !item.item_code) {
      enriched.push(item)
      continue
    }
    try {
      const res = await getDoc<ItemMasterRow>('Item', item.item_code)
      const master = res.success ? res.data : undefined
      enriched.push({
        ...item,
        item_name:
          (item.item_name ?? '') !== ''
            ? item.item_name
            : asString(master?.item_name) || item.item_code,
        uom: (item.uom ?? '') !== '' ? item.uom : asString(master?.stock_uom) || 'Nos',
      })
    } catch {
      enriched.push({
        ...item,
        item_name: (item.item_name ?? '') !== '' ? item.item_name : item.item_code,
      })
    }
  }
  return enriched
}

export interface QuotationFilters {
  fromDate?: string
  toDate?: string
}

export async function getQuotations(filters?: QuotationFilters): Promise<ApiResponse<Quotation[]>> {
  const queryFilters: Record<string, unknown> | undefined =
    filters?.fromDate || filters?.toDate
      ? {
          transaction_date: [
            'between',
            [filters.fromDate || '1900-01-01', filters.toDate || '2999-12-31'],
          ],
        }
      : undefined
  const result = await getDocList<Quotation>(
    DOCTYPE,
    queryFilters,
    [
      'name',
      'party_name',
      'customer_name',
      'transaction_date',
      'valid_till',
      'status',
      'grand_total',
      'currency',
      'company',
      'docstatus',
    ],
    'transaction_date desc',
    500,
  )
  if (!result.success)
    return {
      success: false,
      error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch quotations' },
    }
  return { success: true, data: result.data ?? [] }
}

export async function getQuotation(name: string): Promise<ApiResponse<Quotation>> {
  return getDoc<Quotation>(DOCTYPE, name)
}

export async function createQuotation(data: Partial<Quotation>): Promise<ApiResponse<Quotation>> {
  const items = await enrichItems(data.items ?? [])
  return createDoc<Quotation>(DOCTYPE, { quotation_to: 'Customer', ...data, items })
}

export async function updateQuotation(
  name: string,
  data: Partial<Quotation>,
): Promise<ApiResponse<Quotation>> {
  if (data.items) {
    return updateDoc<Quotation>(DOCTYPE, name, { ...data, items: await enrichItems(data.items) })
  }
  return updateDoc<Quotation>(DOCTYPE, name, data)
}

export async function deleteQuotation(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}

export async function submitQuotation(name: string): Promise<ApiResponse<void>> {
  const doc = await getQuotation(name)
  if (!doc.success || !doc.data) {
    return {
      success: false,
      error: doc.error ?? { code: 'FETCH_FAILED', message: 'Failed to load quotation' },
    }
  }
  return callPost('frappe.client.submit', { doc: doc.data })
}

export async function cancelQuotation(name: string): Promise<ApiResponse<void>> {
  return callPost('frappe.client.cancel', { doctype: DOCTYPE, name })
}

export async function getCompanies(): Promise<string[]> {
  const result = await getDocList<NamedRow>('Company', undefined, ['name'], 'name', 200)
  if (!result.success) return []
  return (result.data ?? [])
    .map((row) => (typeof row.name === 'string' ? row.name : ''))
    .filter((name) => name !== '')
}
