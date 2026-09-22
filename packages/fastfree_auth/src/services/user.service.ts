// ============================================================
// FastFree Auth — User Service
// Handles user profile, settings, and management
// ============================================================

import { type AuthUser, type ApiResponse, DEFAULT_SETTINGS } from '../types'
import {
  getDoc,
  getDocList,
  createDoc,
  updateDoc,
  deleteDoc,
  callPost,
} from './api.service'
import { getCurrentSession } from './auth.service'

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

type UserProfile = AuthUser & {
  phone?: string
  avatar?: string
  lastLogin?: string
  createdAt?: string
  language?: string
  theme?: string
  notifications?: boolean
  autoSave?: boolean
}

interface UserSettings {
  language: string
  theme: string
  notifications: boolean
  autoSave: boolean
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

/**
 * Get the current user's profile.
 */
export async function getCurrentUserProfile(): Promise<ApiResponse<UserProfile>> {
  const session = getCurrentSession()
  if (!session) {
    return { success: false, error: { code: 'NO_SESSION', message: 'Not logged in' } }
  }

  return getDoc<UserProfile>('User', session.user.id)
}

/**
 * Update the current user's profile.
 */
export async function updateProfile(
  data: Partial<Pick<UserProfile, 'name' | 'phone' | 'avatar'>>,
): Promise<ApiResponse<UserProfile>> {
  const session = getCurrentSession()
  if (!session) {
    return { success: false, error: { code: 'NO_SESSION', message: 'Not logged in' } }
  }

  return updateDoc<UserProfile>('User', session.user.id, data as Record<string, unknown>)
}

/**
 * Change the current user's password.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ApiResponse<void>> {
  const res = await callPost('frappe.core.doctype.user.user.change_password', {
    old_password: currentPassword,
    new_password: newPassword,
  })

  if (res.success) {
    return { success: true }
  }

  return {
    success: false,
    error: res.error || { code: 'PASSWORD_CHANGE_FAILED', message: 'Failed to change password' },
  }
}

/**
 * Get user settings.
 */
export async function getUserSettings(): Promise<ApiResponse<UserSettings>> {
  const session = getCurrentSession()
  if (!session) {
    return { success: false, error: { code: 'NO_SESSION', message: 'Not logged in' } }
  }

  const res = await getDoc<UserProfile>('User', session.user.id)
  if (res.success && res.data) {
    return {
      success: true,
      data: {
        language: res.data.language || 'ar',
        theme: res.data.theme || 'light',
        notifications: res.data.notifications !== false,
        autoSave: res.data.autoSave !== false,
      },
    }
  }

  return {
    success: true,
    data: { ...DEFAULT_SETTINGS },
  }
}

/**
 * Update user settings.
 */
export async function updateUserSettings(
  settings: Partial<UserSettings>,
): Promise<ApiResponse<void>> {
  const session = getCurrentSession()
  if (!session) {
    return { success: false, error: { code: 'NO_SESSION', message: 'Not logged in' } }
  }

  const res = await updateDoc('User', session.user.id, settings as Record<string, unknown>)

  if (res.success) {
    return { success: true }
  }

  return {
    success: false,
    error: res.error || { code: 'SETTINGS_UPDATE_FAILED', message: 'Failed to update settings' },
  }
}

// ------------------------------------------------------------
// User Management (Admin only)
// ------------------------------------------------------------

/**
 * Get all users (admin only).
 */
export async function listUsers(): Promise<ApiResponse<UserProfile[]>> {
  const res = await getDocList<{ name: string; full_name: string; email: string; enabled: number }>(
    'User',
    undefined,
    ['name', 'full_name', 'email', 'enabled'],
  )

  if (!res.success || !res.data) {
    return { success: false, error: res.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch users' } }
  }

  // Direct REST on 'Has Role' is forbidden on Frappe v15 — read roles from each User doc instead.
  const rolesByUser = new Map<string, string[]>()
  const roleResults = await Promise.all(
    res.data.map(async (u) => {
      const docRes = await getDoc<{ roles?: Array<{ role: string }> }>('User', u.name)
      if (docRes.success && docRes.data) {
        return { name: u.name, roles: (docRes.data.roles ?? []).map((r) => r.role) }
      }
      return { name: u.name, roles: [] as string[] }
    }),
  )
  for (const r of roleResults) {
    rolesByUser.set(r.name, r.roles)
  }

  const usersWithRoles = res.data.map((u: { name: string; full_name: string; email: string; enabled: number }) => {
    const roles = rolesByUser.get(u.name) || []
    return {
      id: u.name,
      name: u.full_name || u.name,
      email: u.email,
      role: mapFrappeRolesToUserRole(roles),
    } as UserProfile
  })

  return { success: true, data: usersWithRoles }
}

/**
 * Create a new user (admin only).
 * Frappe User docname == email; display name lives in first_name/full_name.
 */
const FRAPPE_ROLE_MAP: Record<string, string> = {
  SWIFT: 'System Manager',
  OPERATOR: 'Desk User',
  USER: 'Employee',
}
// Roles managed by the app tiers (legacy 'Operator'/'User' kept so orphans get cleaned on update).
const MANAGED_ROLES = ['System Manager', 'Administrator', 'Operator', 'User', 'Desk User', 'Employee']
const NON_OPERATOR_ROLES = ['Guest', 'All', 'Customer', 'Supplier', 'Employee']

export function mapFrappeRolesToUserRole(frappeRoles: string[]): string {
  if (frappeRoles.some(r => r === 'System Manager' || r === 'Administrator')) return 'SWIFT'
  if (frappeRoles.some(r => r === 'Desk User' || (/(Manager|User)$/i.test(r) && !NON_OPERATOR_ROLES.includes(r)))) return 'OPERATOR'
  return 'USER'
}

export async function createUser(userData: {
  email: string
  name: string
  role: string
  password?: string
}): Promise<ApiResponse<UserProfile>> {
  const frappeRole = FRAPPE_ROLE_MAP[userData.role] || 'User'
  const payload: Record<string, unknown> = {
    email: userData.email,
    first_name: userData.name,
    enabled: 1,
    roles: [{ doctype: 'Has Role', parentfield: 'roles', role: frappeRole }],
  }
  if (userData.password) {
    payload.new_password = userData.password
  }
  return createDoc<UserProfile>('User', payload)
}

/**
 * Update a user's role (admin only) via Has Role child table.
 */
export async function updateUserRole(
  userId: string,
  role: string,
): Promise<ApiResponse<void>> {
  const frappeRole = FRAPPE_ROLE_MAP[role] || 'Employee'

  try {
    const existingRes = await getDoc<{ roles?: Array<{ role: string }> }>('User', userId)

    if (!existingRes.success) {
      return {
        success: false,
        error: existingRes.error || { code: 'UPDATE_ROLE_FAILED', message: 'Failed to fetch user roles' },
      }
    }

    const managedRoles = MANAGED_ROLES
    const existingRoles = (existingRes.data?.roles ?? []).map((r) => r.role)
    // PUT on User replaces the roles child table (omitted rows are deleted), so preserve unmapped roles.
    const keep = existingRoles.filter((r) => !managedRoles.includes(r))
    const roles = [...keep.map((r) => ({ role: r })), { role: frappeRole }]

    const updateRes = await updateDoc('User', userId, { roles })

    if (!updateRes.success) {
      return {
        success: false,
        error: updateRes.error || { code: 'UPDATE_ROLE_FAILED', message: 'Failed to assign role' },
      }
    }

    return { success: true }
  } catch (e: unknown) {
    return {
      success: false,
      error: { code: 'UPDATE_ROLE_FAILED', message: e instanceof Error ? e.message : String(e) },
    }
  }
}

/**
 * Delete a user (admin only).
 */
export async function deleteUser(userId: string): Promise<ApiResponse<void>> {
  const res = await deleteDoc('User', userId)
  if (res.success) {
    return { success: true }
  }
  return {
    success: false,
    error: res.error || { code: 'DELETE_USER_FAILED', message: 'Failed to delete user' },
  }
}

/**
 * Reset a user's password (admin only).
 * Mirrors changePassword conventions: callPost RPC + ApiResponse normalization.
 */
export async function resetPassword(
  userEmail: string,
  newPassword: string,
): Promise<ApiResponse<void>> {
  const res = await callPost('frappe.core.doctype.user.user.update_password', {
    user: userEmail,
    new_password: newPassword,
    logout_all_sessions: 1,
  })

  if (res.success) {
    return { success: true }
  }

  return {
    success: false,
    error: res.error || { code: 'PASSWORD_RESET_FAILED', message: 'Failed to reset password' },
  }
}
