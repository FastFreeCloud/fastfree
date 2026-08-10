import { getDocList, getDoc, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { Attendance } from '../types'

const DOCTYPE = 'Attendance'
const ATTENDANCE_FIELDS = [
  'name',
  'employee',
  'employee_name',
  'attendance_date',
  'status',
  'company',
  'posting_date',
  'in_time',
  'out_time',
  'hours',
]

export async function getAttendance(date?: string): Promise<ApiResponse<Attendance[]>> {
  const filters = date ? { attendance_date: date } : undefined
  const result = await getDocList<Attendance>(DOCTYPE, filters, ATTENDANCE_FIELDS, 'attendance_date desc', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch attendance' } }
  return { success: true, data: result.data ?? [] }
}

export async function getAttendanceForEmployee(
  employeeId: string,
  fromDate: string,
  toDate: string,
): Promise<ApiResponse<Attendance[]>> {
  const filters: Record<string, unknown> = {
    employee: employeeId,
    attendance_date: [['>=', fromDate], ['<=', toDate]],
  }
  const result = await getDocList<Attendance>(DOCTYPE, filters, ATTENDANCE_FIELDS, 'attendance_date asc', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch attendance' } }
  return { success: true, data: result.data ?? [] }
}

export async function createAttendance(data: Partial<Attendance>): Promise<ApiResponse<Attendance>> {
  return createDoc<Attendance>(DOCTYPE, data)
}

export async function updateAttendance(name: string, data: Partial<Attendance>): Promise<ApiResponse<Attendance>> {
  return updateDoc<Attendance>(DOCTYPE, name, data)
}

export async function deleteAttendance(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}

export async function submitAttendance(name: string): Promise<ApiResponse<void>> {
  return callPost<void>('frappe.client.submit_single', {
    doctype: DOCTYPE,
    docname: name,
  })
}

export async function cancelAttendance(name: string): Promise<ApiResponse<void>> {
  return callPost<void>('frappe.client.cancel', {
    doctype: DOCTYPE,
    docname: name,
  })
}
