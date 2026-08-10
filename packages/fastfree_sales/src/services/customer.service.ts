import { getDocList, getDoc, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { Customer } from '../types'

const DOCTYPE = 'Customer'

export async function getCustomers(): Promise<ApiResponse<Customer[]>> {
  const result = await getDocList<Customer>(DOCTYPE, undefined, ['customer_name', 'customer_type', 'email', 'phone', 'name'], 'customer_name', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch customers' } }
  return { success: true, data: result.data ?? [] }
}

export async function getCustomer(name: string): Promise<ApiResponse<Customer>> {
  return getDoc<Customer>(DOCTYPE, name)
}

export async function createCustomer(data: Partial<Customer>): Promise<ApiResponse<Customer>> {
  return createDoc<Customer>(DOCTYPE, data)
}

export async function updateCustomer(name: string, data: Partial<Customer>): Promise<ApiResponse<Customer>> {
  return updateDoc<Customer>(DOCTYPE, name, data)
}

export async function deleteCustomer(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}
