// ============================================================
// FastFree Accounting — Account Service (Chart of Accounts)
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { Account, AccountType, AccountRootType, ApiResponse } from '../types'

const ACCOUNT_FIELDS = [
  'name',
  'account_name',
  'account_number',
  'account_type',
  'root_type',
  'parent_account',
  'company',
  'is_group',
]

const ACCOUNT_TYPES: AccountType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense']
const ROOT_TYPES: AccountRootType[] = ['Balance Sheet', 'Profit and Loss']

interface FrappeAccountRow {
  name: string
  account_name?: string
  account_number?: string
  account_type?: string
  root_type?: string
  parent_account?: string
  company?: string
  is_group?: number | boolean
}

/**
 * Map a raw Frappe Account doc (snake_case, sparse list rows) to the app's
 * Account type. Unknown/empty types fall back safely so the tree never crashes.
 */
export function mapFrappeAccount(row: FrappeAccountRow): Account {
  const accountType: AccountType = ACCOUNT_TYPES.includes(row.account_type as AccountType)
    ? (row.account_type as AccountType)
    : 'Asset'
  const rootType: AccountRootType = ROOT_TYPES.includes(row.root_type as AccountRootType)
    ? (row.root_type as AccountRootType)
    : 'Balance Sheet'
  return {
    name: row.name,
    accountName: row.account_name || row.name,
    accountType,
    rootType,
    parentAccount: row.parent_account || '',
    isGroup: row.is_group === 1 || row.is_group === true,
    ...(row.company ? { company: row.company } : {}),
    openingBalance: 0,
    disabled: false,
  }
}

export async function getAccounts(company?: string): Promise<ApiResponse<Account[]>> {
  const filters = company ? { company } as Record<string, unknown> : undefined
  const result = await getDocList<FrappeAccountRow>('Account', filters, ACCOUNT_FIELDS, undefined, 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch accounts' } }
  return { success: true, data: (result.data ?? []).map(mapFrappeAccount) }
}

export async function getAccount(name: string): Promise<ApiResponse<Account>> {
  const result = await getDoc<FrappeAccountRow>('Account', name)
  if (!result.success || !result.data) {
    return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch account' } }
  }
  return { success: true, data: mapFrappeAccount(result.data) }
}

export async function createAccount(data: Partial<Account>): Promise<ApiResponse<Account>> {
  const payload: Record<string, unknown> = {
    account_name: data.accountName,
    account_type: data.accountType,
    root_type: data.rootType,
  }
  if (data.parentAccount) payload.parent_account = data.parentAccount
  if (data.company) payload.company = data.company
  const result = await createDoc<FrappeAccountRow>('Account', payload)
  if (!result.success || !result.data) {
    return { success: false, error: result.error ?? { code: 'CREATE_FAILED', message: 'Failed to create account' } }
  }
  return { success: true, data: mapFrappeAccount(result.data) }
}

export async function updateAccount(name: string, data: Partial<Account>): Promise<ApiResponse<Account>> {
  return updateDoc<Account>('Account', name, data)
}

export async function deleteAccount(name: string): Promise<ApiResponse<void>> {
  return deleteDoc('Account', name)
}

export async function getAccountChildren(parent: string): Promise<ApiResponse<Account[]>> {
  const result = await getDocList<FrappeAccountRow>('Account', { parent_account: parent }, ACCOUNT_FIELDS, undefined, 200)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch account children' } }
  return { success: true, data: (result.data ?? []).map(mapFrappeAccount) }
}
