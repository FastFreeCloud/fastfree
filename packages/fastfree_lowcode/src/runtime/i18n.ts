import { inject } from 'vue'
import { LC_CONFIG_KEY, type LcFullConfig, type LcMessages } from './config'
import { t as sharedT } from './translate'
export { setSharedConfig, getSharedConfig } from './shared-config'

export function useLcConfig(): LcFullConfig {
  const config = inject<LcFullConfig>(LC_CONFIG_KEY)
  if (!config) {
    throw new Error('[fastfree-lowcode] Config not found. Ensure boot.register.ts is loaded.')
  }
  return config
}

export function useLcI18n(): { t: (key: string, params?: Record<string, string | number>) => string } {
  function t(key: string, params?: Record<string, string | number>): string {
    return sharedT(key, params)
  }

  return { t }
}

export { useLcI18nStore, getLcI18nStore, registerMessages, MESSAGES_KEYS, getAllMessageKeys, getNamespace, getKeyName, getValue, getOverridesForLocale, setOverridesForLocale } from './composables/useLcI18nStore'
