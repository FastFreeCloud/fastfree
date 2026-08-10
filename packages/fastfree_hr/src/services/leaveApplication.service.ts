import { getDocList, getDoc, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { LeaveApplication } from '../types'

const DOCTYPE = 'Leave Application'
const LEAVE_FIELDS = [
  'name',
  'employee',
  'employee_name',
  'company',
  'from_date',
  'to_date',
  'total_days',
  'status',
  'leave_type',
  'reason',
  'half_day',
  'posting_date',
]

export async function getLeaveApplications(): Promise<ApiResponse<LeaveApplication[]>> {
  const result = await getDocList<LeaveApplication>(DOCTYPE, undefined, LEAVE_FIELDS, 'posting_date desc', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch leave applications' } }
  return { success: true, data: result.data ?? [] }
}

export async function getLeaveApplication(name: string): Promise<ApiResponse<LeaveApplication>> {
  return getDoc<LeaveApplication>(DOCTYPE, name)
}

export async function createLeaveApplication(data: Partial<LeaveApplication>): Promise<ApiResponse<LeaveApplication>> {
  return createDoc<LeaveApplication>(DOCTYPE, data)
}

export async function updateLeaveApplication(name: string, data: Partial<LeaveApplication>): Promise<ApiResponse<LeaveApplication>> {
  return updateDoc<LeaveApplication>(DOCTYPE, name, data)
}

export async function deleteLeaveApplication(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}

export async function submitLeaveApplication(name: string): Promise<ApiResponse<void>> {
  return callPost<void>('frappe.client.submit_single', {
    doctype: DOCTYPE,
    docname: name,
  })
}

export async function cancelLeaveApplication(name: string): Promise<ApiResponse<void>> {
  return callPost<void>('frappe.client.cancel', {
    doctype: DOCTYPE,
    docname: name,
  })
}
