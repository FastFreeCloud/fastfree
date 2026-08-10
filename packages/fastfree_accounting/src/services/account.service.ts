// ============================================================
// FastFree Accounting — Account Service (Chart of Accounts)
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { Account, ApiResponse } from '../types'

export async function getAccounts(company?: string): Promise<ApiResponse<Account[]>> {
  const filters = company ? { company } as Record<string, unknown> : undefined
  const result = await getDocList<Account>('Account', filters, undefined, undefined, 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch accounts' } }
  return { success: true, data: result.data ?? [] }
}

export async function getAccount(name: string): Promise<ApiResponse<Account>> {
  return getDoc<Account>('Account', name)
}

export async function createAccount(data: Partial<Account>): Promise<ApiResponse<Account>> {
  return createDoc<Account>('Account', data)
}

export async function updateAccount(name: string, data: Partial<Account>): Promise<ApiResponse<Account>> {
  return updateDoc<Account>('Account', name, data)
}

export async function deleteAccount(name: string): Promise<ApiResponse<void>> {
  return deleteDoc('Account', name)
}

export async function getAccountChildren(parent: string): Promise<ApiResponse<Account[]>> {
  const result = await getDocList<Account>('Account', { parentAccount: parent } as Record<string, unknown>)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch account children' } }
  return { success: true, data: result.data ?? [] }
}
