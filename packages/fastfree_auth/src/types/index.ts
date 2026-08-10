// ============================================================
// FastFree Auth — TypeScript Types
// ============================================================

// ------------------------------------------------------------
// User
// ------------------------------------------------------------
export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  permissions?: string[]
}

export type UserRole = 'SWIFT' | 'OPERATOR' | 'USER'

// ------------------------------------------------------------
// Session
// ------------------------------------------------------------
export interface SessionData {
  user: AuthUser
  sessionId: string
  expiresAt: number
}

// ------------------------------------------------------------
// Permissions
// ------------------------------------------------------------
export interface PermissionCheck {
  action: string
  doctype: string
}

export interface ScreenPermission {
  id: string
  label: string
  icon: string
}

// ------------------------------------------------------------
// License
// ------------------------------------------------------------
export interface LicenseInfo {
  key: string
  type: 'trial' | 'standard' | 'enterprise'
  status: 'active' | 'expired' | 'suspended'
  expiresAt: number | null
  maxUsers: number
  maxDevices: number
  activatedDevices: string[]
}

// ------------------------------------------------------------
// API
// ------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// ------------------------------------------------------------
// Settings
// ------------------------------------------------------------
export interface AppSettings {
  language: string
  theme: string
  notifications: boolean
  autoSave: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'ar',
  theme: 'light',
  notifications: true,
  autoSave: true,
}

// ------------------------------------------------------------
// Config
// ------------------------------------------------------------
export interface FastFreeAuthConfig {
  baseUrl: string
  app?: ReturnType<typeof import('vue')['createApp']>
  storagePrefix?: string
}
