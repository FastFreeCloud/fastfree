// ============================================================
// FastFree Inventory — Stock Entry Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { StockEntry, StockBalance, ApiResponse } from '../types'

export async function getStockEntries(filters?: Record<string, unknown>): Promise<ApiResponse<StockEntry[]>> {
  const result = await getDocList<StockEntry>('Stock Entry', filters, undefined, undefined, 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch stock entries' } }
  return { success: true, data: result.data ?? [] }
}

export async function getStockEntry(name: string): Promise<ApiResponse<StockEntry>> {
  return getDoc<StockEntry>('Stock Entry', name)
}

export async function createStockEntry(data: Partial<StockEntry>): Promise<ApiResponse<StockEntry>> {
  return createDoc<StockEntry>('Stock Entry', data)
}

export async function updateStockEntry(name: string, data: Partial<StockEntry>): Promise<ApiResponse<StockEntry>> {
  return updateDoc<StockEntry>('Stock Entry', name, data)
}

export async function deleteStockEntry(name: string): Promise<ApiResponse<void>> {
  return deleteDoc('Stock Entry', name)
}

export async function submitStockEntry(name: string): Promise<ApiResponse<StockEntry>> {
  return updateDoc<StockEntry>('Stock Entry', name, { status: 'Submitted' })
}

export async function cancelStockEntry(name: string): Promise<ApiResponse<StockEntry>> {
  return updateDoc<StockEntry>('Stock Entry', name, { status: 'Cancelled' })
}

export async function getStockBalance(warehouse?: string, product?: string): Promise<ApiResponse<StockBalance[]>> {
  const filters: Record<string, unknown> = {}
  if (warehouse) filters.warehouse = warehouse
  if (product) filters.product = product
  const result = await getDocList<StockBalance>('Stock Balance', Object.keys(filters).length ? filters : undefined, undefined, undefined, 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch stock balance' } }
  return { success: true, data: result.data ?? [] }
}