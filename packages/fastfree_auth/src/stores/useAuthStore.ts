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

// ------------------------------------------------------------
// Session persistence marker (localStorage)
// ------------------------------------------------------------
// The Frappe session itself lives in an HttpOnly cookie; this marker
// only records that a login happened so restoreSession() knows it is
// worth asking the server to rehydrate (getSession) after a reload.
// It is NOT a credential and is cleared on logout.

const AUTH_SESSION_MARKER_KEY = 'fastfree_auth_session'

interface AuthSessionMarker {
  email: string
  at: number
}

function readSessionMarker(): AuthSessionMarker | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_MARKER_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { email, at } = parsed as Partial<AuthSessionMarker>
    if (typeof email !== 'string' || typeof at !== 'number') return null
    return { email, at }
  } catch {
    return null
  }
}

function writeSessionMarker(email: string): void {
  if (typeof window === 'undefined') return
  try {
    const marker: AuthSessionMarker = { email, at: Date.now() }
    window.localStorage.setItem(AUTH_SESSION_MARKER_KEY, JSON.stringify(marker))
  } catch {
    // Storage unavailable (e.g. private mode) — session still works in memory.
  }
}

function clearSessionMarker(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(AUTH_SESSION_MARKER_KEY)
  } catch {
    // Best effort — a missing/unreadable marker is treated as logged out on read.
  }
}

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
      writeSessionMarker(res.data.user.email)
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

  /**
   * Rehydrate the session after a reload.
   * Only hits the server when a login marker was persisted; the Frappe
   * cookie then proves the session via the existing getSession() service.
   * Returns true when a session is active afterwards.
   */
  async function restoreSession(): Promise<boolean> {
    const cached = getCurrentSession()
    if (cached) {
      user.value = cached.user
      sessionId.value = cached.sessionId
      return true
    }

    if (!readSessionMarker()) return false

    const res = await getSession()
    if (res.success && res.data) {
      user.value = res.data.user
      sessionId.value = res.data.sessionId
      return true
    }

    clearSessionMarker()
    return false
  }

  async function logout(): Promise<void> {
    await serviceLogout()
    clearSessionMarker()
    user.value = null
    sessionId.value = null
    error.value = null
  }

  function $reset(): void {
    clearSessionMarker()
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
    restoreSession,
    logout,
    $reset,
    destroy,
  }
})
