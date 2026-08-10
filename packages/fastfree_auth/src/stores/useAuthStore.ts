// ============================================================
// FastFree Auth — Auth Store (Pinia)
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthUser } from '../types'
import {
  login as serviceLogin,
  getSession,
  logout as serviceLogout,
  getCurrentSession,
  isLoggedIn as serviceIsLoggedIn,
  destroyAuthService,
} from '../services/auth.service'

export const useAuthStore = defineStore('fastfree-auth', () => {
  // ------------------------------------------------------------
  // State
  // ------------------------------------------------------------

  const user = ref<AuthUser | null>(null)
  const sessionId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ------------------------------------------------------------
  // Getters
  // ------------------------------------------------------------

  const isLoggedIn = computed(() => !!user.value)
  const isSwift = computed(() => user.value?.role === 'SWIFT')
  const isOperator = computed(() => user.value?.role === 'OPERATOR')
  const isUser = computed(() => user.value?.role === 'USER')
  const userName = computed(() => user.value?.name || '')
  const userEmail = computed(() => user.value?.email || '')

  // ------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------

  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null

    const res = await serviceLogin(email, password)

    if (res.success && res.data) {
      user.value = res.data.user
      sessionId.value = res.data.sessionId
      loading.value = false
      return true
    }

    error.value = res.error?.message || 'Login failed'
    loading.value = false
    return false
  }

  async function fetchSession(): Promise<boolean> {
    const session = getCurrentSession()
    if (session) {
      user.value = session.user
      sessionId.value = session.sessionId
      return true
    }

    const res = await getSession()
    if (res.success && res.data) {
      user.value = res.data.user
      sessionId.value = res.data.sessionId
      return true
    }

    return false
  }

  async function logout(): Promise<void> {
    await serviceLogout()
    user.value = null
    sessionId.value = null
    error.value = null
  }

  function $reset(): void {
    user.value = null
    sessionId.value = null
    loading.value = false
    error.value = null
  }

  function destroy(): void {
    destroyAuthService()
    $reset()
  }

  return {
    // State
    user,
    sessionId,
    loading,
    error,
    // Getters
    isLoggedIn,
    isSwift,
    isOperator,
    isUser,
    userName,
    userEmail,
    // Actions
    login,
    fetchSession,
    logout,
    $reset,
    destroy,
  }
})
