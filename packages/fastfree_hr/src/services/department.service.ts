import { getDocList, getDoc, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { Department } from '../types'

const DOCTYPE = 'Department'
const DEPARTMENT_FIELDS = ['name', 'department_name', 'company', 'parent_department', 'description', 'disabled', 'branch']

export async function getDepartments(): Promise<ApiResponse<Department[]>> {
  const result = await getDocList<Department>(DOCTYPE, undefined, DEPARTMENT_FIELDS, 'department_name', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch departments' } }
  return { success: true, data: result.data ?? [] }
}

export async function getDepartment(name: string): Promise<ApiResponse<Department>> {
  return getDoc<Department>(DOCTYPE, name)
}

export async function createDepartment(data: Partial<Department>): Promise<ApiResponse<Department>> {
  return createDoc<Department>(DOCTYPE, data)
}

export async function updateDepartment(name: string, data: Partial<Department>): Promise<ApiResponse<Department>> {
  return updateDoc<Department>(DOCTYPE, name, data)
}

export async function deleteDepartment(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}
