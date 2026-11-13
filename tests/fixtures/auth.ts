/**
 * Auth fixtures — users, sessions, licenses, settings and permission checks.
 */
import type {
  AppSettings,
  AuthUser,
  LicenseInfo,
  PermissionCheck,
  SessionData,
} from 'fastfree-auth'
import { defineFactory, millisFromNow, unique } from './core'

export const user = defineFactory<AuthUser>(() => ({
  id: unique('usr'),
  name: 'Test User',
  email: `${unique('usr')}@fastfree.test`,
  role: 'OPERATOR',
  permissions: [],
}))

export const session = defineFactory<SessionData>(() => ({
  user: user(),
  sessionId: unique('sess'),
  expiresAt: millisFromNow(60 * 60 * 1000),
}))

export const license = defineFactory<LicenseInfo>(() => ({
  key: 'FF-TEST-0000-0000',
  type: 'standard',
  status: 'active',
  expiresAt: millisFromNow(30 * 24 * 60 * 60 * 1000),
  maxUsers: 10,
  maxDevices: 5,
  activatedDevices: [],
}))

export const appSettings = defineFactory<AppSettings>(() => ({
  language: 'en',
  theme: 'light',
  notifications: true,
  autoSave: true,
}))

export const permissionCheck = defineFactory<PermissionCheck>(() => ({
  action: 'read',
  doctype: 'Employee',
}))
