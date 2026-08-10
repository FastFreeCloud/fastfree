import type { LcConfig, LcFullConfig } from './types'
import _LC_DEFAULT_MESSAGES from './messages-en'
import _LC_DEFAULT_MESSAGES_AR from './messages-ar'
import {
  LC_DEFAULT_DESKTOP,
  LC_DEFAULT_API,
  LC_DEFAULT_ERROR,
  LC_DEFAULT_SPLASH,
  LC_DEFAULT_CAPACITOR,
  LC_DEFAULT_PWA,
  LC_DEFAULT_FONT,
} from './defaults'

export const LC_DEFAULT_MESSAGES = _LC_DEFAULT_MESSAGES
export const LC_DEFAULT_MESSAGES_AR = _LC_DEFAULT_MESSAGES_AR

export const LC_CONFIG_KEY = 'lc-config'

export function mergeConfig(partial?: Partial<LcConfig>): LcFullConfig {
  return {
    locale: partial?.locale ?? 'en',
    theme: partial?.theme ?? {},
    messages: {
      ...(partial?.locale === 'ar'
        ? LC_DEFAULT_MESSAGES_AR
        : LC_DEFAULT_MESSAGES),
      ...partial?.messages,
    },
    api: { ...LC_DEFAULT_API, ...partial?.api },
    desktop: { ...LC_DEFAULT_DESKTOP, ...partial?.desktop },
    error: { ...LC_DEFAULT_ERROR, ...partial?.error },
    splash: { ...LC_DEFAULT_SPLASH, ...partial?.splash },
    capacitor: { ...LC_DEFAULT_CAPACITOR, ...partial?.capacitor },
    pwa: { ...LC_DEFAULT_PWA, ...partial?.pwa },
    font: { ...LC_DEFAULT_FONT, ...partial?.font },
  }
}

// Re-export types
export type {
  LcConfig,
  LcFullConfig,
  LcMessages,
  LcDesktopConfig,
  LcApiConfig,
  LcErrorConfig,
  LcSplashConfig,
  LcCapacitorConfig,
  LcPwaConfig,
  LcFontConfig,
  ScreenConfig,
} from './types'

// Re-export defaults
export {
  LC_DEFAULT_DESKTOP,
  LC_DEFAULT_API,
  LC_DEFAULT_ERROR,
  LC_DEFAULT_SPLASH,
} from './defaults'
