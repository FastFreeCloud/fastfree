// ============================================================
// FastFree Inventory — Category Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { Category, ApiResponse } from '../types'

export async function getCategories(filters?: Record<string, unknown>): Promise<ApiResponse<Category[]>> {
  const result = await getDocList<Category>('Product Category', filters, undefined, undefined, 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch categories' } }
  return { success: true, data: result.data ?? [] }
}

export async function getCategory(name: string): Promise<ApiResponse<Category>> {
  return getDoc<Category>('Product Category', name)
}

export async function createCategory(data: Partial<Category>): Promise<ApiResponse<Category>> {
  return createDoc<Category>('Product Category', data)
}

export async function updateCategory(name: string, data: Partial<Category>): Promise<ApiResponse<Category>> {
  return updateDoc<Category>('Product Category', name, data)
}

export async function deleteCategory(name: string): Promise<ApiResponse<void>> {
  return deleteDoc('Product Category', name)
}