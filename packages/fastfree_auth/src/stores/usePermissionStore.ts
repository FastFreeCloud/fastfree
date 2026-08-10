// ============================================================
// FastFree Auth — Permission Store (Pinia)
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserRole, ScreenPermission } from '../types'
import {
  initPermissions,
  canAccessScreen as serviceCanAccessScreen,
  can as serviceCan,
  getAllScreens,
  getUserScreens,
  setUserScreens,
  resetPermissions,
} from '../services/permission.service'

export const usePermissionStore = defineStore('fastfree-permissions', () => {
  // ------------------------------------------------------------
  // State
  // ------------------------------------------------------------

  const role = ref<UserRole>('USER')
  const screens = ref<ScreenPermission[]>([])
  const allScreens = ref<ScreenPermission[]>([])

  // ------------------------------------------------------------
  // Getters
  // ------------------------------------------------------------

  const effectiveScreens = computed(() => screens.value)
  const isSwift = computed(() => role.value === 'SWIFT')
  const isOperator = computed(() => role.value === 'OPERATOR')
  const isUser = computed(() => role.value === 'USER')

  // ------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------

  function init(userRole: UserRole, customScreens?: string[]): void {
    role.value = userRole
    initPermissions(userRole, customScreens)
    allScreens.value = getAllScreens()
    screens.value = getUserScreens()
  }

  function canAccessScreen(screenId: string): boolean {
    return serviceCanAccessScreen(screenId)
  }

  function can(action: string, doctype: string): boolean {
    return serviceCan(action, doctype)
  }

  function updateScreens(customScreens: string[] | null): void {
    setUserScreens(customScreens)
    screens.value = getUserScreens()
  }

  function $reset(): void {
    role.value = 'USER'
    screens.value = []
    allScreens.value = []
    resetPermissions()
  }

  return {
    // State
    role,
    screens,
    allScreens,
    // Getters
    effectiveScreens,
    isSwift,
    isOperator,
    isUser,
    // Actions
    init,
    canAccessScreen,
    can,
    updateScreens,
    $reset,
  }
})
