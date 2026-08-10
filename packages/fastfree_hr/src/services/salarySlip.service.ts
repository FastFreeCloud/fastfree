import { getDocList, getDoc, createDoc, updateDoc, deleteDoc, callPost } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { SalarySlip } from '../types'

const DOCTYPE = 'Salary Slip'
const SALARY_SLIP_FIELDS = [
  'name',
  'employee',
  'employee_name',
  'company',
  'net_pay',
  'net_total',
  'total_incentives',
  'total_deductions',
  'gross_pay',
  'start_date',
  'end_date',
  'posting_date',
  'status',
  'payment_period',
]

export async function getSalarySlips(fromDate?: string, toDate?: string): Promise<ApiResponse<SalarySlip[]>> {
  let filters: Record<string, unknown> | undefined
  if (fromDate || toDate) {
    filters = {}
    if (fromDate && toDate) {
      filters.posting_date = [['>=', fromDate], ['<=', toDate]]
    } else if (fromDate) {
      filters.posting_date = ['>=', fromDate]
    } else {
      filters.posting_date = ['<=', toDate]
    }
  }
  const result = await getDocList<SalarySlip>(DOCTYPE, filters, SALARY_SLIP_FIELDS, 'posting_date desc', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch salary slips' } }
  return { success: true, data: result.data ?? [] }
}

export async function getSalarySlip(name: string): Promise<ApiResponse<SalarySlip>> {
  return getDoc<SalarySlip>(DOCTYPE, name)
}

export async function createSalarySlip(data: Partial<SalarySlip>): Promise<ApiResponse<SalarySlip>> {
  return createDoc<SalarySlip>(DOCTYPE, data)
}

export async function updateSalarySlip(name: string, data: Partial<SalarySlip>): Promise<ApiResponse<SalarySlip>> {
  return updateDoc<SalarySlip>(DOCTYPE, name, data)
}

export async function deleteSalarySlip(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}

export async function submitSalarySlip(name: string): Promise<ApiResponse<void>> {
  return callPost<void>('frappe.client.submit_single', {
    doctype: DOCTYPE,
    docname: name,
  })
}

export async function cancelSalarySlip(name: string): Promise<ApiResponse<void>> {
  return callPost<void>('frappe.client.cancel', {
    doctype: DOCTYPE,
    docname: name,
  })
}
