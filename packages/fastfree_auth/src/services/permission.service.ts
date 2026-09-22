// ============================================================
// FastFree Auth — Permission Service
// Handles role-based access control and screen permissions
// ============================================================

import type { UserRole, ScreenPermission } from '../types'
import { getCurrentSession } from './auth.service'

// ------------------------------------------------------------
// Role defaults — Phase-1 source of truth.
//
// There is intentionally NO backend permissions table yet: the role's
// screen lists below are the authoritative mapping until a server-side
// model lands. initPermissions() (wired into auth.service login/getSession)
// stores the active role so canAccessScreen/can reflect it.
// ------------------------------------------------------------

const DEFAULT_SCREENS: ScreenPermission[] = [
  { id: 'invoices', label: 'screens.invoices', icon: 'mdi-receipt-text-check' },
  { id: 'invoices-list', label: 'screens.invoicesList', icon: 'mdi-format-list-bulleted' },
  { id: 'companies', label: 'screens.companies', icon: 'mdi-office-building' },
  { id: 'backup', label: 'screens.backup', icon: 'mdi-database-cog' },
  { id: 'errors', label: 'screens.errors', icon: 'mdi-bug' },
  { id: 'print-settings', label: 'screens.printSettings', icon: 'mdi-printer' },
  { id: 'permissions', label: 'screens.permissions', icon: 'mdi-shield-account' },
  { id: 'dev-settings', label: 'screens.devSettings', icon: 'mdi-cog' },
]

const ROLE_DEFAULT_SCREEN_IDS: Record<UserRole, string[]> = {
  SWIFT: DEFAULT_SCREENS.map(s => s.id),
  OPERATOR: ['invoices', 'invoices-list', 'companies', 'backup', 'errors', 'print-settings'],
  USER: ['invoices', 'invoices-list', 'companies', 'errors'],
}

// ------------------------------------------------------------
// State
// ------------------------------------------------------------

let _userScreens: string[] | null = null
let _userRole: UserRole = 'USER'
let _initialized = false

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

/**
 * Initialize permissions for the current user.
 * Stores the role and clears any custom override unless one is provided.
 */
export function initPermissions(role: UserRole, customScreens?: string[]): void {
  _userRole = role
  _userScreens = customScreens || null
  _initialized = true
}

/**
 * Whether initPermissions() has been called in this session.
 */
export function isPermissionsInitialized(): boolean {
  return _initialized
}

/**
 * Get the current user's role.
 * The live session (set by auth.service login/getSession) wins; the stored
 * initialized role covers pre-session contexts. Defaults to USER only when
 * neither is available.
 */
export function getUserRole(): UserRole {
  const session = getCurrentSession()
  if (session?.user.role) {
    return session.user.role
  }
  return _userRole
}

/**
 * Get the list of screen IDs the user can access.
 */
export function getEffectiveScreens(): string[] {
  if (_userScreens) {
    return _userScreens
  }
  return ROLE_DEFAULT_SCREEN_IDS[getUserRole()] || ROLE_DEFAULT_SCREEN_IDS.USER
}

/**
 * Check if the user can access a specific screen.
 */
export function canAccessScreen(screenId: string): boolean {
  const role = getUserRole()
  if (role === 'SWIFT') return true

  const screens = getEffectiveScreens()
  return screens.includes(screenId)
}

/**
 * Check if the user can perform an action on a doctype.
 */
export function can(action: string, doctype: string): boolean {
  const role = getUserRole()

  // SWIFT role has full access
  if (role === 'SWIFT') return true

  // OPERATOR role has most permissions
  if (role === 'OPERATOR') {
    // Deny user management
    if (doctype === 'User' && action !== 'read') return false
    return true
  }

  // USER role has read-only access to most things
  if (role === 'USER') {
    if (action === 'read') return true
    return false
  }

  return false
}

/**
 * Get all available screen permissions.
 */
export function getAllScreens(): ScreenPermission[] {
  return [...DEFAULT_SCREENS]
}

/**
 * Get the user's effective screen permissions.
 */
export function getUserScreens(): ScreenPermission[] {
  const effectiveIds = getEffectiveScreens()
  return DEFAULT_SCREENS.filter(s => effectiveIds.includes(s.id))
}

/**
 * Set custom screens for the current user (admin function).
 */
export function setUserScreens(screens: string[] | null): void {
  _userScreens = screens
}

/**
 * Reset permissions to defaults.
 */
export function resetPermissions(): void {
  _userScreens = null
  _userRole = 'USER'
  _initialized = false
}
