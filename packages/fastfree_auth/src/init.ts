// ============================================================
// FastFree Auth — Initialization
// Central initialization function for the auth package
// ============================================================

import type { App } from 'vue'
import { initApiService, getAuth, getDb, getFile } from './services/api.service'
import { en, ar } from './locales'
import { registerAuthScreens } from './screenRegistration'
import type { ScreenRegistration } from 'quasar-app-extension-fastfree-lowcode/src/runtime'
import type { GroupPage } from 'quasar-app-extension-fastfree-lowcode/src/runtime'

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface FastFreeAuthOptions {
  baseUrl: string
  app?: App
  storagePrefix?: string
  persistUrl?: boolean
}

// ------------------------------------------------------------
// Lowcode registry loader
// ------------------------------------------------------------

type RegisterScreen = (type: string, config: ScreenRegistration) => void
type RegisterGroup = (name: string, icon: string) => void
type RegisterGroupPage = (groupName: string, page: Omit<GroupPage, 'id'>) => GroupPage | null
type RegisterMessages = (namespace: string, en: Record<string, string>, ar: Record<string, string>) => void

let registerScreen: RegisterScreen | null = null
let registerGroup: RegisterGroup | null = null
let registerGroupPage: RegisterGroupPage | null = null
let registerMessages: RegisterMessages | null = null

async function loadLowcodeRegistry(): Promise<void> {
  try {
    const mod = await import('quasar-app-extension-fastfree-lowcode/src/runtime/index')
    registerScreen = mod.registerScreen
    registerGroup = mod.registerGroup
    registerGroupPage = mod.registerGroupPage
    registerMessages = mod.registerMessages
  } catch {
    console.warn('[FastFree Auth] Could not load lowcode registry. Screens will not be registered.')
  }
}

// ------------------------------------------------------------
// Main initialization
// ------------------------------------------------------------

/**
 * Initialize FastFree Auth package.
 * Must be called once before using any auth services.
 */
export async function initFastFreeAuth(options: FastFreeAuthOptions): Promise<void> {
  initApiService(options.baseUrl)

  await loadLowcodeRegistry()

  if (registerMessages) {
    registerMessages('auth', en, ar)
  }

  if (registerScreen && registerGroup && registerGroupPage) {
    registerAuthScreens(registerScreen, registerGroup, registerGroupPage)
  }

  if (options.baseUrl && options.persistUrl !== false) {
    localStorage.setItem('fastfree_base_url', options.baseUrl)
  }

  if (options.app) {
    options.app.provide('fastfree-auth', getAuth())
    options.app.provide('fastfree-db', getDb())
    options.app.provide('fastfree-file', getFile())
  }
}

/**
 * Get the stored base URL.
 */
export function getStoredBaseUrl(): string {
  return localStorage.getItem('fastfree_base_url') || window.location.origin
}
