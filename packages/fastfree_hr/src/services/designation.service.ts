import { getDocList, getDoc, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { Designation } from '../types'

const DOCTYPE = 'Designation'
const DESIGNATION_FIELDS = ['name', 'designation_name', 'department', 'description', 'is_line_manager']

export async function getDesignations(): Promise<ApiResponse<Designation[]>> {
  const result = await getDocList<Designation>(DOCTYPE, undefined, DESIGNATION_FIELDS, 'designation_name', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch designations' } }
  return { success: true, data: result.data ?? [] }
}

export async function getDesignation(name: string): Promise<ApiResponse<Designation>> {
  return getDoc<Designation>(DOCTYPE, name)
}

export async function createDesignation(data: Partial<Designation>): Promise<ApiResponse<Designation>> {
  return createDoc<Designation>(DOCTYPE, data)
}

export async function updateDesignation(name: string, data: Partial<Designation>): Promise<ApiResponse<Designation>> {
  return updateDoc<Designation>(DOCTYPE, name, data)
}

export async function deleteDesignation(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}
