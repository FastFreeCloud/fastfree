import { getDocList, getDoc, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { Supplier } from '../types'

const DOCTYPE = 'Supplier'

export async function getSuppliers(): Promise<ApiResponse<Supplier[]>> {
  const result = await getDocList<Supplier>(DOCTYPE, undefined, ['supplier_name', 'supplier_type', 'email', 'mobile_no', 'name'], 'supplier_name', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch suppliers' } }
  return { success: true, data: result.data ?? [] }
}

export async function getSupplier(name: string): Promise<ApiResponse<Supplier>> {
  return getDoc<Supplier>(DOCTYPE, name)
}

export async function createSupplier(data: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
  return createDoc<Supplier>(DOCTYPE, data)
}

export async function updateSupplier(name: string, data: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
  return updateDoc<Supplier>(DOCTYPE, name, data)
}

export async function deleteSupplier(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}
