import { getDocList, getDoc, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { Employee } from '../types'

const DOCTYPE = 'Employee'

export async function getEmployees(): Promise<ApiResponse<Employee[]>> {
  const result = await getDocList<Employee>(
    DOCTYPE,
    undefined,
    ['employee', 'employee_name', 'department', 'designation', 'status', 'date_of_joining', 'company', 'personal_email', 'company_email', 'phone'],
    'employee_name',
    500,
  )
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch employees' } }
  return { success: true, data: result.data ?? [] }
}

export async function getEmployee(id: string): Promise<ApiResponse<Employee>> {
  return getDoc<Employee>(DOCTYPE, id)
}

export async function createEmployee(data: Partial<Employee>): Promise<ApiResponse<Employee>> {
  return createDoc<Employee>(DOCTYPE, data)
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<ApiResponse<Employee>> {
  return updateDoc<Employee>(DOCTYPE, id, data)
}

export async function deleteEmployee(id: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, id)
}
