// ============================================================
// FastFree Accounting — Tax Service
// ============================================================

import { getDoc, getDocList, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { TaxTemplate, TaxRule, ApiResponse } from '../types'

const TAX_TEMPLATE_DOCTYPE = 'Tax Template'
const TAX_RULE_DOCTYPE = 'Tax Rule'

export async function getTaxTemplates(company?: string): Promise<ApiResponse<TaxTemplate[]>> {
  const filters = company ? { company } as Record<string, unknown> : undefined
  const result = await getDocList<TaxTemplate>(TAX_TEMPLATE_DOCTYPE, filters, undefined, 'templateName')
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch tax templates' } }
  return { success: true, data: result.data ?? [] }
}

export async function getTaxTemplate(name: string): Promise<ApiResponse<TaxTemplate>> {
  return getDoc<TaxTemplate>(TAX_TEMPLATE_DOCTYPE, name)
}

export async function createTaxTemplate(data: Partial<TaxTemplate>): Promise<ApiResponse<TaxTemplate>> {
  return createDoc<TaxTemplate>(TAX_TEMPLATE_DOCTYPE, data as Record<string, unknown>)
}

export async function updateTaxTemplate(name: string, data: Partial<TaxTemplate>): Promise<ApiResponse<TaxTemplate>> {
  return updateDoc<TaxTemplate>(TAX_TEMPLATE_DOCTYPE, name, data as Record<string, unknown>)
}

export async function deleteTaxTemplate(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(TAX_TEMPLATE_DOCTYPE, name)
}

export async function getTaxRules(): Promise<ApiResponse<TaxRule[]>> {
  const result = await getDocList<TaxRule>(TAX_RULE_DOCTYPE, undefined, undefined, 'priority')
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch tax rules' } }
  return { success: true, data: result.data ?? [] }
}

export async function createTaxRule(data: Partial<TaxRule>): Promise<ApiResponse<TaxRule>> {
  return createDoc<TaxRule>(TAX_RULE_DOCTYPE, data as Record<string, unknown>)
}

export async function deleteTaxRule(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(TAX_RULE_DOCTYPE, name)
}

export function calculateTax(amount: number, rate: number): number {
  return Math.round((amount * rate / 100) * 100) / 100
}

export function calculateTaxInclusive(amount: number, rate: number): number {
  return Math.round((amount / (1 + rate / 100)) * 100) / 100
}
