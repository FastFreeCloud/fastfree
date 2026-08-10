// ============================================================
// FastFree Auth — License Service
// Handles license verification and subscription management
// ============================================================

import type { LicenseInfo, ApiResponse } from '../types'
import { callGet, callPost, getCount } from './api.service'

// ------------------------------------------------------------
// State
// ------------------------------------------------------------

let _currentLicense: LicenseInfo | null = null
let _licenseCheckInterval: ReturnType<typeof setInterval> | null = null

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

/**
 * Initialize the license service.
 */
export async function initLicenseService(): Promise<void> {
  await refreshLicense()
  startLicenseCheck()
}

/**
 * Get the current license information.
 */
export function getLicenseInfo(): LicenseInfo | null {
  return _currentLicense
}

/**
 * Check if the license is valid (active and not expired).
 */
export function isLicenseValid(): boolean {
  if (!_currentLicense) return false
  if (_currentLicense.status !== 'active') return false
  if (_currentLicense.expiresAt && Date.now() > _currentLicense.expiresAt) {
    return false
  }
  return true
}

/**
 * Check if a specific feature is available under the current license.
 */
export function isFeatureAvailable(feature: string): boolean {
  if (!isLicenseValid()) return false

  // Trial licenses have limited features
  if (_currentLicense?.type === 'trial') {
    const trialFeatures = ['invoices', 'invoices-list', 'companies']
    return trialFeatures.includes(feature)
  }

  // Standard and enterprise have all features
  return true
}

/**
 * Check if the user can add more users.
 */
export async function canAddUser(): Promise<boolean> {
  if (!_currentLicense) return false
  if (!isLicenseValid()) return false

  const countRes = await getCount('User')
  if (!countRes.success || countRes.data === undefined) return false

  return countRes.data < _currentLicense.maxUsers
}

/**
 * Refresh the license information from the server.
 */
export async function refreshLicense(): Promise<ApiResponse<LicenseInfo>> {
  const res = await callGet<LicenseInfo>('fastfree.api.license.get_info')

  if (res.success && res.data) {
    _currentLicense = res.data
    return { success: true, data: res.data }
  }

  return {
    success: false,
    error: res.error || { code: 'LICENSE_FETCH_FAILED', message: 'Could not verify license' },
  }
}

/**
 * Activate a license key.
 */
export async function activateLicense(key: string): Promise<ApiResponse<LicenseInfo>> {
  const res = await callPost<LicenseInfo>('fastfree.api.license.activate', {
    license_key: key,
  })

  if (res.success && res.data) {
    _currentLicense = res.data
    return { success: true, data: res.data }
  }

  return {
    success: false,
    error: res.error || { code: 'ACTIVATION_FAILED', message: 'License activation failed' },
  }
}

/**
 * Get the license expiration date.
 */
export function getExpirationDate(): Date | null {
  if (!_currentLicense?.expiresAt) return null
  return new Date(_currentLicense.expiresAt)
}

/**
 * Check if the license is expiring soon (within 7 days).
 */
export function isExpiringSoon(): boolean {
  if (!_currentLicense?.expiresAt) return false
  const daysUntilExpiry = (_currentLicense.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)
  return daysUntilExpiry <= 7 && daysUntilExpiry > 0
}

// ------------------------------------------------------------
// License check
// ------------------------------------------------------------

function startLicenseCheck(): void {
  stopLicenseCheck()
  _licenseCheckInterval = setInterval(() => {
    refreshLicense()
  }, 60 * 60 * 1000) // Check every hour
}

function stopLicenseCheck(): void {
  if (_licenseCheckInterval) {
    clearInterval(_licenseCheckInterval)
    _licenseCheckInterval = null
  }
}

/**
 * Destroy the license service (cleanup).
 */
export function destroyLicenseService(): void {
  stopLicenseCheck()
  _currentLicense = null
}
