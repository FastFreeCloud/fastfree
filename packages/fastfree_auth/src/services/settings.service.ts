// ============================================================
// FastFree Auth — Settings Service
// System-wide app settings (not per-user settings)
// Uses Frappe's "System Settings" or custom "FastFree Settings" doctype
// ============================================================

import { getDoc, updateDoc, getDocList } from './api.service'
import type { ApiResponse } from '../types'

const SETTINGS_DOCTYPE = 'FastFree Settings'

export interface SystemSettings {
  companyName: string
  currency: string
  dateFormat: string
  timeFormat: string
  numberFormat: string
  defaultWarehouse?: string
  defaultCurrency?: string
  taxTemplate?: string
  printSettings?: {
    header?: string
    footer?: string
    logo?: string
  }
}

export async function getSystemSettings(): Promise<ApiResponse<SystemSettings>> {
  return getDoc<SystemSettings>(SETTINGS_DOCTYPE, SETTINGS_DOCTYPE)
}

export async function updateSystemSettings(data: Partial<SystemSettings>): Promise<ApiResponse<SystemSettings>> {
  return updateDoc<SystemSettings>(SETTINGS_DOCTYPE, SETTINGS_DOCTYPE, data as Record<string, unknown>)
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
