import { reactive, type UnwrapNestedRefs } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'
import { LC_DEFAULT_MESSAGES, LC_DEFAULT_MESSAGES_AR, type LcMessages } from '../config'
import { getSharedConfig } from '../shared-config'

const STORAGE_KEY = 'lc-locale'
const STORAGE_PREFIX = 'lc-translation-overrides-'
function getStorageKey(locale: string): string {
  return `${STORAGE_PREFIX}${locale}`
}

interface RegisteredMessages {
  namespace: string
  en: Record<string, string>
  ar: Record<string, string>
}

const registeredMessages: RegisteredMessages[] = []

function detectBrowserLocale(): string {
  try {
    const lang = navigator.language || (navigator as unknown as Record<string, string[]>).languages?.[0] || ''
    if (lang.startsWith('ar')) return 'ar'
    return 'en'
  } catch {
    return 'en'
  }
}

function loadLocale(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || getSharedConfig().locale || detectBrowserLocale()
  } catch {
    return getSharedConfig().locale || detectBrowserLocale()
  }
}

function saveLocale(lang: string) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch { /* ignore */ }
}

function getBaseMessages(lang: string): LcMessages {
  const base = lang === 'ar' ? { ...LC_DEFAULT_MESSAGES_AR } : { ...LC_DEFAULT_MESSAGES }
  // Merge registered messages
  for (const reg of registeredMessages) {
    const msgs = lang === 'ar' ? reg.ar : reg.en
    for (const [key, value] of Object.entries(msgs)) {
      const fullKey = `${reg.namespace}.${key}`
      ;(base as Record<string, string>)[fullKey] = value
    }
  }
  return base
}

let _migrated = false

function loadOverrides(lang: string): Partial<LcMessages> {
  try {
    if (!_migrated) {
      const oldKey = 'lc-translation-overrides'
      const oldRaw = localStorage.getItem(oldKey)
      if (oldRaw) {
        try {
          const oldData = JSON.parse(oldRaw) as Record<string, string>
          if (typeof oldData === 'object' && oldData !== null) {
            const targetKey = getStorageKey(lang)
            if (!localStorage.getItem(targetKey)) {
              localStorage.setItem(targetKey, JSON.stringify(oldData))
            }
          }
        } catch { /* old format parse error */ }
        localStorage.removeItem(oldKey)
      }
      _migrated = true
    }
    const raw = localStorage.getItem(getStorageKey(lang))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function saveOverrides(lang: string, overrides: Partial<LcMessages>) {
  try {
    localStorage.setItem(getStorageKey(lang), JSON.stringify(overrides))
  } catch { /* ignore */ }
}

export function getValue(key: string, targetLocale: string): string {
  const localeOverrides = getOverridesForLocale(targetLocale)
  if (localeOverrides && (localeOverrides as unknown as Record<string, string>)[key]) {
    return (localeOverrides as unknown as Record<string, string>)[key] ?? ''
  }
  const baseMessages = getBaseMessages(targetLocale)
  if (baseMessages && (baseMessages as unknown as Record<string, string>)[key]) {
    return (baseMessages as unknown as Record<string, string>)[key] ?? ''
  }
  const enMessages = getBaseMessages('en')
  return enMessages ? (enMessages as unknown as Record<string, string>)[key] || key : key
}

export function getOverridesForLocale(targetLocale: string): Partial<LcMessages> {
  try {
    const raw = localStorage.getItem(getStorageKey(targetLocale))
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function setOverridesForLocale(targetLocale: string, overrides: Partial<LcMessages>) {
  try {
    localStorage.setItem(getStorageKey(targetLocale), JSON.stringify(overrides))
  } catch { /* ignore */ }
}

function applyOverrides(base: LcMessages, overrides: Partial<LcMessages>): LcMessages {
  const result = { ...base }
  for (const key of Object.keys(overrides) as (keyof LcMessages)[]) {
    if (overrides[key] !== undefined && overrides[key] !== null && overrides[key] !== '') {
      ;(result as Record<string, string>)[key as string] = overrides[key] as string
    }
  }
  return result
}

export function replaceParams(msg: string, params?: Record<string, string | number>): string {
  if (!params) return msg
  let result = msg
  for (const [k, v] of Object.entries(params)) {
    result = result.replaceAll(`{${k}}`, String(v))
  }
  return result
}

export function getAllMessageKeys(): string[] {
  const core = Object.keys(LC_DEFAULT_MESSAGES)
  const registered = registeredMessages.flatMap(r => [
    ...Object.keys(r.en).map(k => `${r.namespace}.${k}`),
  ])
  return [...core, ...registered]
}

export const MESSAGES_KEYS: (keyof LcMessages)[] = Object.keys(LC_DEFAULT_MESSAGES) as (keyof LcMessages)[]

export function getNamespace(key: keyof LcMessages): string {
  const dot = (key as string).indexOf('.')
  return dot > 0 ? (key as string).substring(0, dot) : 'other'
}

export function getKeyName(key: keyof LcMessages): string {
  const dot = (key as string).indexOf('.')
  return dot > 0 ? (key as string).substring(dot + 1) : (key as string)
}

export const useLcI18nStore = defineStore('lc-i18n', () => {
  const initialLocale = loadLocale()
  const initialOverrides = loadOverrides(initialLocale)
  const messages: UnwrapNestedRefs<LcMessages> = reactive(
    applyOverrides(getBaseMessages(initialLocale), initialOverrides),
  ) as UnwrapNestedRefs<LcMessages>
  const locale = reactive({ value: initialLocale })

  function setLocale(lang: string) {
    const base = getBaseMessages(lang)
    const overrides = loadOverrides(lang)
    const merged = applyOverrides(base, overrides)
    for (const key of Object.keys(merged) as (keyof LcMessages)[]) {
      ;(messages as Record<string, string>)[key as string] = merged[key] as string
    }
    locale.value = lang
    saveLocale(lang)

    try {
      const $q = useQuasar()
      const packPromise = lang === 'ar'
        ? import('quasar/lang/ar')
        : import('quasar/lang/en-US')
      packPromise.then((mod) => { $q.lang.set(mod.default) }).catch(() => {})
    } catch { /* Quasar lang pack not available */ }
  }

  function t(key: string, params?: Record<string, string | number>): string {
    const msg = (messages as Record<string, string>)[key as string]
    if (msg !== undefined && msg !== null && msg !== '') return replaceParams(msg, params)
    // Fallback to English base messages
    const fallback = LC_DEFAULT_MESSAGES[key as keyof typeof LC_DEFAULT_MESSAGES]
    if (fallback !== undefined) return replaceParams(fallback, params)
    return key as string
  }

  function setOverrides(overrides: Partial<LcMessages>) {
    const base = getBaseMessages(locale.value)
    const merged = applyOverrides(base, overrides)
    for (const key of Object.keys(merged) as (keyof LcMessages)[]) {
      ;(messages as Record<string, string>)[key as string] = merged[key] as string
    }
    saveOverrides(locale.value, overrides)
  }

  function getOverrides(): Partial<LcMessages> {
    return loadOverrides(locale.value)
  }

  function resetOverrides() {
    try {
      localStorage.removeItem(getStorageKey(locale.value))
    } catch { /* ignore */ }
    const base = getBaseMessages(locale.value)
    for (const key of Object.keys(base) as (keyof LcMessages)[]) {
      ;(messages as Record<string, string>)[key as string] = base[key] as string
    }
  }

  function resetKeyOverride(key: keyof LcMessages) {
    const overrides = loadOverrides(locale.value)
    delete overrides[key]
    saveOverrides(locale.value, overrides)
    const base = getBaseMessages(locale.value)
    ;(messages as Record<string, string>)[key as string] = base[key] as string
  }

  function registerMessages(namespace: string, en: Record<string, string>, ar: Record<string, string>) {
    registeredMessages.push({ namespace, en, ar })
    const lang = locale.value
    for (const [key, value] of Object.entries(lang === 'ar' ? ar : en)) {
      const fullKey = `${namespace}.${key}`
      ;(messages as Record<string, string>)[fullKey] = value
    }
  }

  const _setOverridesForLocale = (targetLocale: string, overrides: Partial<LcMessages>) => {
    setOverridesForLocale(targetLocale, overrides)
    if (targetLocale === locale.value) {
      const base = getBaseMessages(targetLocale)
      const merged = applyOverrides(base, overrides)
      for (const key of Object.keys(merged) as (keyof LcMessages)[]) {
        ;(messages as Record<string, string>)[key as string] = merged[key] as string
      }
    }
  }

  return {
    messages,
    locale,
    setLocale,
    t,
    setOverrides,
    getOverrides,
    resetOverrides,
    resetKeyOverride,
    registerMessages,
    getValue,
    getOverridesForLocale,
    setOverridesForLocale: _setOverridesForLocale,
  }
})

// Module-level register function — safe to call before Pinia is initialized
// Messages are saved in the array and merged lazily via getBaseMessages()
export function registerMessages(namespace: string, en: Record<string, string>, ar: Record<string, string>) {
  registeredMessages.push({ namespace, en, ar })
  // If the store is already created, merge immediately
  if (_store) {
    const lang = _store.locale.value
    for (const [key, value] of Object.entries(lang === 'ar' ? ar : en)) {
      const fullKey = `${namespace}.${key}`
      ;(_store.messages as Record<string, string>)[fullKey] = value
    }
  }
  // Otherwise, messages will be merged when getBaseMessages() is called during store creation
}

// Singleton instance — created once, imported anywhere
let _store: ReturnType<typeof useLcI18nStore> | null = null

export function getLcI18nStore(): ReturnType<typeof useLcI18nStore> {
  if (!_store) {
    try {
      _store = useLcI18nStore()
    } catch {
      // Pinia not initialized yet — return a minimal proxy that defers to getBaseMessages()
      // This prevents crashes when boot files call registerMessages() before app.use(pinia)
      console.warn('[fastfree-lowcode] Pinia not ready yet — translations will be merged later')
      return createDeferredStore()
    }
  }
  return _store
}

// Deferred store — allows registerMessages() to work before Pinia is ready
// Once Pinia initializes, the real store takes over via getBaseMessages()
function createDeferredStore() {
  const pendingMessages: Record<string, string> = {}
  const deferred = {
    locale: { value: loadLocale() },
    messages: pendingMessages,
    t: (key: string, params?: Record<string, string | number>): string => {
      const msg = pendingMessages[key]
      if (msg !== undefined) return replaceParams(msg, params)
      const fallback = LC_DEFAULT_MESSAGES[key as keyof typeof LC_DEFAULT_MESSAGES]
      if (fallback !== undefined) return replaceParams(fallback, params)
      return key
    },
  }
  // Override _store getter so next call returns the deferred proxy
  // and registerMessages() can populate pendingMessages
  _store = deferred as unknown as ReturnType<typeof useLcI18nStore>
  return deferred as unknown as ReturnType<typeof useLcI18nStore>
}
