import type { LcMessages } from './config'
import { getLcI18nStore } from './composables/useLcI18nStore'

export function t(key: string, params?: Record<string, string | number>): string {
  const store = getLcI18nStore()
  return store.t(key, params)
}
