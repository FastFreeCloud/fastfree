// ============================================================
// FastFree Accounting — Journal Entry Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { JournalEntry, ApiResponse } from '../types'

export async function getJournalEntries(filters?: Record<string, unknown>): Promise<ApiResponse<JournalEntry[]>> {
  const result = await getDocList<JournalEntry>('Journal Entry', filters, undefined, 'postingDate desc')
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch journal entries' } }
  return { success: true, data: result.data ?? [] }
}

export async function getJournalEntry(name: string): Promise<ApiResponse<JournalEntry>> {
  return getDoc<JournalEntry>('Journal Entry', name)
}

export async function createJournalEntry(data: Partial<JournalEntry>): Promise<ApiResponse<JournalEntry>> {
  return createDoc<JournalEntry>('Journal Entry', data)
}

export async function updateJournalEntry(name: string, data: Partial<JournalEntry>): Promise<ApiResponse<JournalEntry>> {
  return updateDoc<JournalEntry>('Journal Entry', name, data)
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
