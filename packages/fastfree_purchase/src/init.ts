import type { Component } from 'vue'
import { PURCHASE_MESSAGES_EN } from './locales/en'
import { PURCHASE_MESSAGES_AR } from './locales/ar'
import { registerPurchaseScreens } from './screens/register'

interface ScreenRegistration {
  component: Component
  label?: string
  icon?: string
  groupId?: string
}

interface GroupPage {
  screenType: string
  label: string
  icon: string
}

let registerMessages: ((namespace: string, en: Record<string, string>, ar: Record<string, string>) => void) | null = null
let registerScreen: ((type: string, registration: ScreenRegistration) => void) | null = null
let registerGroup: ((name: string, icon: string) => void) | null = null
let registerGroupPage: ((groupName: string, page: GroupPage) => void) | null = null

async function loadLowcodeRegistry(): Promise<void> {
  try {
    const mod = await import('quasar-app-extension-fastfree-lowcode/src/runtime/index')
    registerMessages = mod.registerMessages
    registerScreen = mod.registerScreen
    registerGroup = mod.registerGroup
    registerGroupPage = mod.registerGroupPage
  } catch {
    console.warn('[FastFree Purchase] Could not load lowcode registry.')
  }
}

export async function initFastFreePurchase(): Promise<void> {
  await loadLowcodeRegistry()

  if (registerMessages) {
    registerMessages('purchase', PURCHASE_MESSAGES_EN, PURCHASE_MESSAGES_AR)
  }

  if (registerScreen && registerGroup && registerGroupPage) {
    registerPurchaseScreens(registerScreen, registerGroup, registerGroupPage)
  }
}
