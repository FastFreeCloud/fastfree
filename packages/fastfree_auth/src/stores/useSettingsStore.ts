// ============================================================
// FastFree Auth — Settings Store (Pinia)
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { type AppSettings, DEFAULT_SETTINGS } from '../types'
import { getUserSettings, updateUserSettings } from '../services/user.service'
import { getStorageSetting, setStorageSetting } from '../services/storage.service'

const STORAGE_KEY = 'user-settings'

export const useSettingsStore = defineStore('fastfree-settings', () => {
  // ------------------------------------------------------------
  // State
  // ------------------------------------------------------------

  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  // ------------------------------------------------------------
  // Getters
  // ------------------------------------------------------------

  const language = computed(() => settings.value.language)
  const theme = computed(() => settings.value.theme)
  const notifications = computed(() => settings.value.notifications)
  const autoSave = computed(() => settings.value.autoSave)

  // ------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------

  async function loadFromStorage(): Promise<void> {
    const res = await getStorageSetting<AppSettings>(STORAGE_KEY)
    if (res.success && res.data) {
      settings.value = { ...DEFAULT_SETTINGS, ...res.data }
    }
    loaded.value = true
  }

  async function fetchSettings(): Promise<void> {
    loading.value = true
    error.value = null

    const res = await getUserSettings()
    if (res.success && res.data) {
      settings.value = res.data
      await setStorageSetting(STORAGE_KEY, res.data)
    } else {
      error.value = res.error?.message || 'Failed to fetch settings'
    }

    loading.value = false
  }

  async function updateSettings(data: Partial<AppSettings>): Promise<boolean> {
    loading.value = true
    error.value = null

    const res = await updateUserSettings(data)
    if (res.success) {
      settings.value = { ...settings.value, ...data }
      await setStorageSetting(STORAGE_KEY, settings.value)
      loading.value = false
      return true
    }

    error.value = res.error?.message || 'Failed to update settings'
    loading.value = false
    return false
  }

  function setLanguage(lang: string): void {
    settings.value.language = lang
  }

  function setTheme(theme: string): void {
    settings.value.theme = theme
  }

  function toggleNotifications(): void {
    settings.value.notifications = !settings.value.notifications
  }

  function toggleAutoSave(): void {
    settings.value.autoSave = !settings.value.autoSave
  }

  function $reset(): void {
    settings.value = { ...DEFAULT_SETTINGS }
    loading.value = false
    error.value = null
  }

  // ------------------------------------------------------------
  // Persistence — auto-save to Dexie on every change
  // ------------------------------------------------------------

  watch(settings, async (val) => {
    if (!loaded.value) return
    await setStorageSetting(STORAGE_KEY, val)
  }, { deep: true })

  return {
    // State
    settings,
    loading,
    error,
    loaded,
    // Getters
    language,
    theme,
    notifications,
    autoSave,
    // Actions
    loadFromStorage,
    fetchSettings,
    updateSettings,
    setLanguage,
    setTheme,
    toggleNotifications,
    toggleAutoSave,
    $reset,
  }
})
