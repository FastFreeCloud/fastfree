// ============================================================
// FastFree Auth — License Store (Pinia)
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LicenseInfo } from '../types'
import {
  initLicenseService,
  getLicenseInfo,
  isLicenseValid as serviceIsLicenseValid,
  isFeatureAvailable as serviceIsFeatureAvailable,
  refreshLicense,
  activateLicense as serviceActivateLicense,
  isExpiringSoon as serviceIsExpiringSoon,
  destroyLicenseService,
} from '../services/license.service'

export const useLicenseStore = defineStore('fastfree-license', () => {
  // ------------------------------------------------------------
  // State
  // ------------------------------------------------------------

  const license = ref<LicenseInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ------------------------------------------------------------
  // Getters
  // ------------------------------------------------------------

  const isValid = computed(() => serviceIsLicenseValid())
  const isTrial = computed(() => license.value?.type === 'trial')
  const isStandard = computed(() => license.value?.type === 'standard')
  const isEnterprise = computed(() => license.value?.type === 'enterprise')
  const isExpired = computed(() => license.value?.status === 'expired')
  const expiresAt = computed(() => license.value?.expiresAt)
  const expiringSoon = computed(() => serviceIsExpiringSoon())
  const maxUsers = computed(() => license.value?.maxUsers || 0)

  // ------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------

  async function init(): Promise<void> {
    loading.value = true
    error.value = null

    await initLicenseService()
    license.value = getLicenseInfo()

    loading.value = false
  }

  async function fetchLicense(): Promise<void> {
    loading.value = true
    error.value = null

    const res = await refreshLicense()
    if (res.success && res.data) {
      license.value = res.data
    } else {
      error.value = res.error?.message || 'Failed to fetch license'
    }

    loading.value = false
  }

  async function activate(key: string): Promise<boolean> {
    loading.value = true
    error.value = null

    const res = await serviceActivateLicense(key)
    if (res.success && res.data) {
      license.value = res.data
      loading.value = false
      return true
    }

    error.value = res.error?.message || 'Activation failed'
    loading.value = false
    return false
  }

  function canAccessFeature(feature: string): boolean {
    return serviceIsFeatureAvailable(feature)
  }

  function $reset(): void {
    license.value = null
    loading.value = false
    error.value = null
  }

  function destroy(): void {
    destroyLicenseService()
    $reset()
  }

  return {
    // State
    license,
    loading,
    error,
    // Getters
    isValid,
    isTrial,
    isStandard,
    isEnterprise,
    isExpired,
    expiresAt,
    expiringSoon,
    maxUsers,
    // Actions
    init,
    fetchLicense,
    activate,
    canAccessFeature,
    $reset,
    destroy,
  }
})
