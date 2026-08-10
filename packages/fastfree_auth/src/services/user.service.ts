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

  const allRolesRes = await getDocList<{ parent: string; role: string }>(
    'Has Role',
    undefined,
    ['parent', 'role'],
  )
  const rolesByUser = new Map<string, string[]>()
  if (allRolesRes.success && allRolesRes.data) {
    for (const r of allRolesRes.data) {
      const existing = rolesByUser.get(r.parent)
      if (existing) {
        existing.push(r.role)
      } else {
        rolesByUser.set(r.parent, [r.role])
      }
    }
  }

  const usersWithRoles = res.data.map((u: { name: string; full_name: string; email: string; enabled: number }) => {
    const roles = rolesByUser.get(u.name) || []
    let role: string = 'USER'
    if (roles.includes('System Manager') || roles.includes('Administrator')) {
      role = 'SWIFT'
    } else if (roles.includes('Operator')) {
      role = 'OPERATOR'
    }
    return {
      id: u.name,
      name: u.full_name || u.name,
      email: u.email,
      role,
    } as UserProfile
  })

  return { success: true, data: usersWithRoles }
}

/**
 * Create a new user (admin only).
 */
export async function createUser(userData: {
  email: string
  name: string
  role: string
  password?: string
}): Promise<ApiResponse<UserProfile>> {
  return createDoc<UserProfile>('User', userData as Record<string, unknown>)
}

/**
 * Update a user's role (admin only) via Has Role child table.
 */
export async function updateUserRole(
  userId: string,
  role: string,
): Promise<ApiResponse<void>> {
  const ROLE_MAP: Record<string, string> = {
    SWIFT: 'System Manager',
    OPERATOR: 'Operator',
    USER: 'User',
  }
  const frappeRole = ROLE_MAP[role] || 'User'

  try {
    const existingRes = await getDocList<{ name: string; role: string }>(
      'Has Role',
      { parent: userId } as Record<string, unknown>,
      ['name', 'role'],
    )

    if (existingRes.success && existingRes.data) {
      for (const r of existingRes.data) {
        if (r.role !== frappeRole) {
          await deleteDoc('Has Role', r.name)
        }
      }
    }

    if (existingRes.success && existingRes.data) {
      const hasTarget = existingRes.data.some(r => r.role === frappeRole)
      if (!hasTarget) {
        await createDoc('Has Role', { parent: userId, role: frappeRole } as Record<string, unknown>)
      }
    } else {
      await createDoc('Has Role', { parent: userId, role: frappeRole } as Record<string, unknown>)
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
 */
export async function resetPassword(
  userName: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc('User', userName, { new_password: newPassword })
    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}
