// ============================================================
// FastFree Auth — Authentication Service
// Handles login, logout, session management via frappe-js-sdk
// ============================================================

import type { AuthUser, SessionData, ApiResponse, UserRole } from '../types'
import { login as apiLogin, getCurrentUser, logout as apiLogout, getDocList } from './api.service'

// ------------------------------------------------------------
// State
// ------------------------------------------------------------

let _currentSession: SessionData | null = null
let _sessionCheckInterval: ReturnType<typeof setInterval> | null = null

// ------------------------------------------------------------
// Role mapping
// ------------------------------------------------------------

const SWIFT_ROLES = ['System Manager', 'Administrator']
const OPERATOR_ROLES = ['Operator']

function mapFrappeRolesToUserRole(frappeRoles: string[]): UserRole {
  if (frappeRoles.some(r => SWIFT_ROLES.includes(r))) return 'SWIFT'
  if (frappeRoles.some(r => OPERATOR_ROLES.includes(r))) return 'OPERATOR'
  return 'USER'
}

/**
 * Fetch the Frappe roles for a user and map to our UserRole.
 */
async function fetchUserRole(userName: string): Promise<UserRole> {
  const res = await getDocList<{ role: string }>('Has Role', { parent: userName }, ['role'])
  if (res.success && res.data) {
    return mapFrappeRolesToUserRole(res.data.map(r => r.role))
  }
  return 'USER'
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

/**
 * Login with email and password.
 */
export async function login(
  email: string,
  password: string,
): Promise<ApiResponse<SessionData>> {
  const res = await apiLogin(email, password)

  if (!res.success) {
    return {
      success: false,
      error: res.error || { code: 'LOGIN_FAILED', message: 'Login failed' },
    }
  }

  // Get user info after successful login
  const userRes = await getCurrentUser()
  if (!userRes.success || !userRes.data) {
    return {
      success: false,
      error: { code: 'USER_FETCH_FAILED', message: 'Login succeeded but failed to get user info' },
    }
  }

  const role = await fetchUserRole(userRes.data.user)

  const user: AuthUser = {
    id: userRes.data.user,
    name: userRes.data.user,
    email,
    role,
  }

  _currentSession = {
    user,
    sessionId: 'cookie-based',
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  }

  startSessionCheck()

  return { success: true, data: _currentSession }
}

/**
 * Get the current session from the server.
 */
export async function getSession(): Promise<ApiResponse<SessionData>> {
  const userRes = await getCurrentUser()

  if (!userRes.success || !userRes.data) {
    _currentSession = null
    return {
      success: false,
      error: { code: 'NO_SESSION', message: 'No active session' },
    }
  }

  const user: AuthUser = {
    id: userRes.data.user,
    name: userRes.data.user,
    email: userRes.data.email,
    role: await fetchUserRole(userRes.data.user),
  }

  _currentSession = {
    user,
    sessionId: 'cookie-based',
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  }

  startSessionCheck()

  return { success: true, data: _currentSession }
}

/**
 * Logout the current user.
 */
export async function logout(): Promise<ApiResponse<void>> {
  const res = await apiLogout()

  _currentSession = null
  stopSessionCheck()

  if (res.success) {
    return { success: true }
  }

  return {
    success: false,
    error: res.error || { code: 'LOGOUT_FAILED', message: 'Logout failed' },
  }
}

/**
 * Get the current session data (cached).
 */
export function getCurrentSession(): SessionData | null {
  return _currentSession
}

/**
 * Check if the user is logged in.
 */
export function isLoggedIn(): boolean {
  return _currentSession !== null
}

/**
 * Refresh the session.
 */
export async function refreshSession(): Promise<ApiResponse<SessionData>> {
  return getSession()
}

// ------------------------------------------------------------
// Session management
// ------------------------------------------------------------

function startSessionCheck(): void {
  stopSessionCheck()
  _sessionCheckInterval = setInterval(async () => {
    try {
      const res = await getCurrentUser()
      if (!res.success) {
        _currentSession = null
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-session-expired'))
        }
      }
    } catch {
      // Network error — session check will retry on next interval
    }
  }, 5 * 60 * 1000) // Check every 5 minutes
}

function stopSessionCheck(): void {
  if (_sessionCheckInterval) {
    clearInterval(_sessionCheckInterval)
    _sessionCheckInterval = null
  }
}

/**
 * Destroy the auth service (cleanup).
 */
export function destroyAuthService(): void {
  stopSessionCheck()
  _currentSession = null
}
