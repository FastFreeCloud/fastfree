import { getDoc, getDocList, updateDoc } from './api.service'
import type { ApiResponse } from '../types'

const SETTINGS_DOCTYPE = 'FastFree Settings'
const PRINT_SETTINGS_CACHE_KEY = 'fastfree-print-settings'

export interface PrintCompanySettings {
  companyName: string
  taxNumber: string
  phone: string
  commercialRegister: string
  address: string
  header: string
  footer: string
  logo: string
}

export interface SystemSettings {
  companyName: string
  currency: string
  dateFormat: string
  timeFormat: string
  numberFormat: string
  defaultWarehouse?: string
  defaultCurrency?: string
  taxTemplate?: string
  printSettings?: Partial<PrintCompanySettings>
}

export interface CompanyPrintRow {
  name?: unknown
  company_name?: unknown
  tax_id?: unknown
  phone_no?: unknown
  email?: unknown
  website?: unknown
}

const defaultPrintSettings: PrintCompanySettings = {
  companyName: '',
  taxNumber: '',
  phone: '',
  commercialRegister: '',
  address: '',
  header: '',
  footer: '',
  logo: '',
}

function asString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
}

function normalizePrintSettings(value: unknown): PrintCompanySettings {
  const record =
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    companyName: asString(record.companyName),
    taxNumber: asString(record.taxNumber),
    phone: asString(record.phone),
    commercialRegister: asString(record.commercialRegister),
    address: asString(record.address),
    header: asString(record.header),
    footer: asString(record.footer),
    logo: asString(record.logo),
  }
}

function getCachedPrintSettings(): PrintCompanySettings {
  try {
    const raw = localStorage.getItem(PRINT_SETTINGS_CACHE_KEY)
    return raw ? normalizePrintSettings(JSON.parse(raw)) : { ...defaultPrintSettings }
  } catch {
    return { ...defaultPrintSettings }
  }
}

function cachePrintSettings(settings: PrintCompanySettings): void {
  try {
    localStorage.setItem(PRINT_SETTINGS_CACHE_KEY, JSON.stringify(settings))
  } catch {
    return
  }
}

export async function getSystemSettings(): Promise<ApiResponse<SystemSettings>> {
  return getDoc<SystemSettings>(SETTINGS_DOCTYPE, SETTINGS_DOCTYPE)
}

export async function updateSystemSettings(
  data: Partial<SystemSettings>,
): Promise<ApiResponse<SystemSettings>> {
  return updateDoc<SystemSettings>(SETTINGS_DOCTYPE, SETTINGS_DOCTYPE, data)
}

export async function getPrintSettings(): Promise<ApiResponse<PrintCompanySettings>> {
  const cached = getCachedPrintSettings()
  if (cached.companyName) return { success: true, data: cached }
  const result = await getDocList<CompanyPrintRow>(
    'Company',
    undefined,
    ['name', 'company_name', 'tax_id', 'phone_no', 'email', 'website'],
    'name asc',
    1,
  )
  if (!result.success) {
    return {
      success: false,
      error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch company settings' },
    }
  }
  const company = result.data?.[0]
  const settings = normalizePrintSettings({
    ...cached,
    companyName: asString(company?.company_name) || asString(company?.name),
    taxNumber: asString(company?.tax_id),
    phone: asString(company?.phone_no),
    address: asString(company?.website),
  })
  cachePrintSettings(settings)
  return { success: true, data: settings }
}

export function savePrintSettings(
  settings: PrintCompanySettings,
): ApiResponse<PrintCompanySettings> {
  const normalized = normalizePrintSettings(settings)
  cachePrintSettings(normalized)
  return { success: true, data: normalized }
}

export async function getSetting<T = unknown>(key: string): Promise<ApiResponse<T>> {
  const result = await getDoc<Record<string, unknown>>(SETTINGS_DOCTYPE, SETTINGS_DOCTYPE)
  if (result.success && result.data) {
    return { success: true, data: result.data[key] as T }
  }
  if (result.error) {
    return { success: false, error: result.error }
  }
  return { success: false }
}

export async function setSetting(key: string, value: unknown): Promise<ApiResponse<void>> {
  return updateDoc(SETTINGS_DOCTYPE, SETTINGS_DOCTYPE, { [key]: value })
}
