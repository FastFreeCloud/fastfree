// ============================================================
// FastFree Inventory — Product Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { Product, ApiResponse } from '../types'

export async function getProducts(filters?: Record<string, unknown>): Promise<ApiResponse<Product[]>> {
  const result = await getDocList<Product>('Product', filters, undefined, undefined, 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch products' } }
  return { success: true, data: result.data ?? [] }
}

export async function getProduct(name: string): Promise<ApiResponse<Product>> {
  return getDoc<Product>('Product', name)
}

export async function createProduct(data: Partial<Product>): Promise<ApiResponse<Product>> {
  return createDoc<Product>('Product', data)
}

export async function updateProduct(name: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
  return updateDoc<Product>('Product', name, data)
}

export async function deleteProduct(name: string): Promise<ApiResponse<void>> {
  return deleteDoc('Product', name)
}