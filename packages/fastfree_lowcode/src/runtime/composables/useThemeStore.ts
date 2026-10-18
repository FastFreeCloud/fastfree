import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { Dark, setCssVar, colors } from 'quasar'
import { getLcI18nStore } from '../i18n'
import { getThemeConfig, setThemeConfig } from './useThemeStorage'

const { lighten } = colors

const STORAGE_KEY = 'lc-theme-manager'
const isServer = typeof window === 'undefined'

export interface BrandColors {
  primary: string
  secondary: string
  accent: string
  positive: string
  negative: string
  info: string
  warning: string
}

export interface ThemePreset {
  name: string
  label: string
  description?: string
  icon?: string
  badge?: string
  light: BrandColors
  dark: BrandColors
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system'
  preset: string
  customLight: Partial<BrandColors>
  customDark: Partial<BrandColors>
}

export const DEFAULT_CONFIG: ThemeConfig = {
  mode: 'light',
  preset: 'lite',
  customLight: {},
  customDark: {},
}

const BRAND_NAMES: (keyof BrandColors)[] = [
  'primary', 'secondary', 'accent',
  'positive', 'negative', 'info', 'warning',
]

export const PRESETS: ThemePreset[] = [
  {
    name: 'lite',
    label: 'Native Lite',
    description: 'Clean, crisp enterprise light mode with signature primary color',
    icon: 'mdi-weather-sunny',
    badge: 'Default',
    light: {
      primary: '#2563EB',
      secondary: '#0D9488',
      accent: '#6366F1',
      positive: '#10B981',
      negative: '#EF4444',
      info: '#0284C7',
      warning: '#F59E0B',
    },
    dark: {
      primary: '#3B82F6',
      secondary: '#14B8A6',
      accent: '#818CF8',
      positive: '#10B981',
      negative: '#EF4444',
      info: '#38BDF8',
      warning: '#F59E0B',
    },
  },
  {
    name: 'dark',
    label: 'Deep Dark',
    description: 'Sleek dark palette with 14:1 contrast and vibrant accents',
    icon: 'mdi-weather-night',
    badge: 'Night',
    light: {
      primary: '#1D4ED8',
      secondary: '#0F766E',
      accent: '#4F46E5',
      positive: '#059669',
      negative: '#DC2626',
      info: '#0284C7',
      warning: '#D97706',
    },
    dark: {
      primary: '#3B82F6',
      secondary: '#14B8A6',
      accent: '#8B5CF6',
      positive: '#10B981',
      negative: '#F43F5E',
      info: '#38BDF8',
      warning: '#FBBF24',
    },
  },
  {
    name: 'executive',
    label: 'Executive',
    description: 'High-contrast mode tailored for data density, financial tables, and analytical clarity',
    icon: 'mdi-chart-box-outline',
    badge: 'Contrast',
    light: {
      primary: '#1E40AF',
      secondary: '#0E7490',
      accent: '#7E22CE',
      positive: '#047857',
      negative: '#B91C1C',
      info: '#0369A1',
      warning: '#B45309',
    },
    dark: {
      primary: '#2563EB',
      secondary: '#06B6D4',
      accent: '#A855F7',
      positive: '#10B981',
      negative: '#F43F5E',
      info: '#00E5FF',
      warning: '#FACC15',
    },
  },
]

function getPreset(name: string): ThemePreset | undefined {
  return PRESETS.find(p => p.name === name)
}

function getSystemMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

let systemMediaQuery: MediaQueryList | null = null
function watchSystemTheme() {
  if (typeof window === 'undefined') return
  systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemMediaQuery.addEventListener('change', onSystemThemeChange)
}

function onSystemThemeChange() {
  const store = _store
  if (store && store.mode === 'system') {
    store.apply()
  }
}

function destroy() {
  if (systemMediaQuery) {
    systemMediaQuery.removeEventListener('change', onSystemThemeChange)
    systemMediaQuery = null
  }
}

function resolveBrandColors(config: ThemeConfig, resolvedMode?: 'light' | 'dark'): BrandColors {
  const effectiveMode = resolvedMode ?? (config.mode === 'system' ? getSystemMode() : config.mode)
  const preset = getPreset(config.preset)
  const defaults = preset ? preset[effectiveMode] : PRESETS[0]![effectiveMode]
  const overrides = effectiveMode === 'light' ? config.customLight : config.customDark
  const result = { ...defaults }
  for (const name of BRAND_NAMES) {
    if (overrides[name]) {
      result[name] = overrides[name]
    }
  }
  return result
}

export const useThemeStore = defineStore('lc-theme', () => {
  const mode = ref<'light' | 'dark' | 'system'>(DEFAULT_CONFIG.mode)
  const presetName = ref<string>(DEFAULT_CONFIG.preset)
  const customLight = ref<Partial<BrandColors>>({})
  const customDark = ref<Partial<BrandColors>>({})
  const appSignature = ref<{ primary: string; secondary?: string | undefined } | null>(null)

  const computedPresets = computed<ThemePreset[]>(() => {
    if (!appSignature.value) return PRESETS
    return PRESETS.map(p => ({
      ...p,
      light: {
        ...p.light,
        primary: appSignature.value!.primary,
        ...(appSignature.value!.secondary ? { secondary: appSignature.value!.secondary } : {}),
      },
      dark: {
        ...p.dark,
        primary: appSignature.value!.primary,
        ...(appSignature.value!.secondary ? { secondary: appSignature.value!.secondary } : {}),
      },
    }))
  })

  function getPreset(name: string): ThemePreset | undefined {
    return computedPresets.value.find(p => p.name === name) ?? PRESETS.find(p => p.name === name)
  }

  const getResolvedMode = computed<'light' | 'dark'>(() => {
    if (mode.value === 'system') return getSystemMode()
    return mode.value
  })

  const isDark = computed(() => getResolvedMode.value === 'dark')
  const isSystem = computed(() => mode.value === 'system')
  const currentPreset = computed(() => getPreset(presetName.value) || computedPresets.value[0] || PRESETS[0]!)
  const isCustom = computed(() => presetName.value === 'custom')

  const activeColors = computed<BrandColors>(() => {
    const resolved = getResolvedMode.value
    const preset = currentPreset.value
    const basePalette = preset ? preset[resolved] : PRESETS[0]![resolved]
    const defaults: BrandColors = {
      ...basePalette,
      ...(appSignature.value?.primary ? { primary: appSignature.value.primary } : {}),
      ...(appSignature.value?.secondary ? { secondary: appSignature.value.secondary } : {}),
    }
    const overrides = resolved === 'light' ? customLight.value : customDark.value
    const result = { ...defaults }
    for (const name of BRAND_NAMES) {
      if (overrides[name]) {
        result[name] = overrides[name]
      }
    }
    return result
  })

  function setAppSignature(primaryColor: string, secondaryColor?: string) {
    appSignature.value = secondaryColor
      ? { primary: primaryColor, secondary: secondaryColor }
      : { primary: primaryColor }
    if (customLight.value.primary) customLight.value.primary = primaryColor
    if (customDark.value.primary) customDark.value.primary = primaryColor
    if (secondaryColor) {
      if (customLight.value.secondary) customLight.value.secondary = secondaryColor
      if (customDark.value.secondary) customDark.value.secondary = secondaryColor
    }
    apply()
  }

  function apply() {
    if (isServer) return
    const colors = activeColors.value
    const isDarkMode = getResolvedMode.value === 'dark'
    const isExecutive = presetName.value === 'executive' && isDarkMode

    Dark.set(isDarkMode)

    // Synchronize Quasar CSS variables
    setCssVar('primary', colors.primary)
    setCssVar('secondary', colors.secondary)
    setCssVar('accent', colors.accent)
    setCssVar('positive', colors.positive)
    setCssVar('negative', colors.negative)
    setCssVar('info', colors.info)
    setCssVar('warning', colors.warning)
    setCssVar('dark', isExecutive ? '#090d16' : (isDarkMode ? '#111827' : '#1e293b'))
    setCssVar('dark-page', isExecutive ? '#030712' : (isDarkMode ? '#0b101b' : '#ffffff'))

    const root = document.documentElement
    const batch: Record<string, string> = {
      '--lc-primary': colors.primary,
      '--lc-primary-dark': lighten(colors.primary, -15),
      '--lc-primary-light': lighten(colors.primary, 15),
      '--lc-secondary': colors.secondary,
      '--lc-secondary-dark': lighten(colors.secondary, -15),
      '--lc-secondary-light': lighten(colors.secondary, 15),
      '--lc-accent': colors.accent,
      '--lc-accent-dark': lighten(colors.accent, -15),
      '--lc-accent-light': lighten(colors.accent, 15),
      '--lc-positive': colors.positive,
      '--lc-negative': colors.negative,
      '--lc-warning': colors.warning,
      '--lc-info': colors.info,
      '--lc-dark': isExecutive ? '#090d16' : (isDarkMode ? '#111827' : '#1e293b'),
      '--active-brand-color': colors.primary,

      // Quasar CSS var fallbacks on root
      '--q-primary': colors.primary,
      '--q-secondary': colors.secondary,
      '--q-accent': colors.accent,
      '--q-positive': colors.positive,
      '--q-negative': colors.negative,
      '--q-info': colors.info,
      '--q-warning': colors.warning,
      '--q-dark': isExecutive ? '#090d16' : (isDarkMode ? '#111827' : '#1e293b'),
      '--q-dark-page': isExecutive ? '#030712' : (isDarkMode ? '#0b101b' : '#ffffff'),
    }

    if (isExecutive) {
      // Executive / High-Contrast Mode (Theme 3 from fastfree-apps-showcase.html)
      Object.assign(batch, {
        '--lc-surface': '#090d16',
        '--lc-surface-alt': '#030712',
        '--lc-surface-container': '#0f172a',
        '--lc-surface-container-low': '#030712',
        '--lc-surface-container-lowest': '#000000',
        '--lc-on-surface': '#ffffff',
        '--lc-on-surface-variant': '#f1f5f9',
        '--lc-surface-variant': '#0f172a',
        '--lc-outline-variant': 'rgba(255, 255, 255, 0.3)',
        '--lc-on-surface-muted': '#cbd5e1',
        '--lc-border': 'rgba(255, 255, 255, 0.2)',
        '--lc-border-light': 'rgba(255, 255, 255, 0.1)',
        '--lc-bg-primary': '#030712',
        '--lc-on-primary': '#ffffff',
        '--lc-scrollbar-thumb': 'rgba(255, 255, 255, 0.35)',
        '--lc-scrollbar-thumb-hover': 'rgba(255, 255, 255, 0.55)',
        '--lc-table-header-text': '#ffffff',
        '--lc-table-cell-border': 'rgba(255, 255, 255, 0.1)',
        '--lc-table-row-hover': 'rgba(37, 99, 235, 0.15)',
        '--lc-dock-bg': '#030712',
        '--lc-dock-border': colors.primary,
        '--lc-card-bg': '#090d16',
        '--lc-card-border': 'rgba(255, 255, 255, 0.2)',
        '--lc-titlebar-bg': '#000000',
        '--lc-titlebar-border': colors.primary,
      })
    } else if (isDarkMode) {
      // Deep Dark Night Mode (Theme 2 from fastfree-apps-showcase.html)
      Object.assign(batch, {
        '--lc-surface': '#111827',
        '--lc-surface-alt': '#0b101b',
        '--lc-surface-container': '#1e293b',
        '--lc-surface-container-low': '#0e1524',
        '--lc-surface-container-lowest': '#0b101b',
        '--lc-on-surface': '#f8fafc',
        '--lc-on-surface-variant': '#cbd5e1',
        '--lc-surface-variant': '#1e293b',
        '--lc-outline-variant': 'rgba(255, 255, 255, 0.12)',
        '--lc-on-surface-muted': '#94a3b8',
        '--lc-border': 'rgba(255, 255, 255, 0.08)',
        '--lc-border-light': 'rgba(255, 255, 255, 0.04)',
        '--lc-bg-primary': '#0b101b',
        '--lc-on-primary': '#ffffff',
        '--lc-scrollbar-thumb': 'rgba(255, 255, 255, 0.22)',
        '--lc-scrollbar-thumb-hover': 'rgba(255, 255, 255, 0.38)',
        '--lc-table-header-text': '#cbd5e1',
        '--lc-table-cell-border': 'rgba(255, 255, 255, 0.04)',
        '--lc-table-row-hover': 'rgba(255, 255, 255, 0.04)',
        '--lc-dock-bg': 'rgba(17, 24, 39, 0.85)',
        '--lc-dock-border': 'rgba(255, 255, 255, 0.1)',
        '--lc-card-bg': '#111827',
        '--lc-card-border': 'rgba(255, 255, 255, 0.07)',
        '--lc-titlebar-bg': '#111827',
        '--lc-titlebar-border': 'rgba(255, 255, 255, 0.08)',
      })
    } else {
      // Native Lite Corporate Mode (Theme 1 from fastfree-apps-showcase.html - Default)
      Object.assign(batch, {
        '--lc-surface': '#ffffff',
        '--lc-surface-alt': '#f8fafc',
        '--lc-surface-container': '#f1f5f9',
        '--lc-surface-container-low': '#f8fafc',
        '--lc-surface-container-lowest': '#ffffff',
        '--lc-on-surface': '#0f172a',
        '--lc-on-surface-variant': '#334155',
        '--lc-surface-variant': '#e2e8f0',
        '--lc-outline-variant': '#cbd5e1',
        '--lc-on-surface-muted': '#64748b',
        '--lc-border': '#e2e8f0',
        '--lc-border-light': '#f1f5f9',
        '--lc-bg-primary': '#f8fafc',
        '--lc-on-primary': '#ffffff',
        '--lc-scrollbar-thumb': 'rgba(0, 0, 0, 0.2)',
        '--lc-scrollbar-thumb-hover': 'rgba(0, 0, 0, 0.35)',
        '--lc-table-header-text': '#475569',
        '--lc-table-cell-border': '#f1f5f9',
        '--lc-table-row-hover': '#f0f4ff',
        '--lc-dock-bg': 'rgba(255, 255, 255, 0.95)',
        '--lc-dock-border': '#e2e8f0',
        '--lc-card-bg': '#ffffff',
        '--lc-card-border': '#e2e8f0',
        '--lc-titlebar-bg': '#ffffff',
        '--lc-titlebar-border': '#e2e8f0',
      })
    }

    batch['--lc-transition-duration'] = '0.3s'
    batch['--lc-transition-easing'] = 'ease'
    for (const [key, value] of Object.entries(batch)) {
      root.style.setProperty(key, value)
    }
  }

  function toggleMode() {
    if (mode.value === 'light') {
      setMode('dark')
    } else {
      setMode('light')
    }
  }

  function setMode(m: 'light' | 'dark' | 'system') {
    mode.value = m
    if (m === 'light' && presetName.value === 'dark') {
      presetName.value = 'lite'
    } else if (m === 'dark' && presetName.value === 'lite') {
      presetName.value = 'dark'
    }
    apply()
  }

  function selectPreset(name: string) {
    const hasCustom = Object.keys(customLight.value).length > 0 || Object.keys(customDark.value).length > 0
    if (hasCustom && !isServer) {
      const msg = getLcI18nStore().t('settings.customColorsLost')
      if (!window.confirm(msg)) return
    }
    presetName.value = name
    if (name === 'lite') {
      mode.value = 'light'
    } else if (name === 'dark' || name === 'executive') {
      mode.value = 'dark'
    }
    customLight.value = {}
    customDark.value = {}
    apply()
  }

  function setBrandColor(name: keyof BrandColors, value: string) {
    presetName.value = 'custom'
    const resolved = getResolvedMode.value
    if (resolved === 'light') {
      customLight.value = { ...customLight.value, [name]: value }
    } else {
      customDark.value = { ...customDark.value, [name]: value }
    }
    apply()
  }

  function getBrandColor(name: keyof BrandColors): string {
    return activeColors.value[name]
  }

  function resetToDefaults() {
    mode.value = DEFAULT_CONFIG.mode
    presetName.value = DEFAULT_CONFIG.preset
    customLight.value = {}
    customDark.value = {}
    apply()
  }

  function exportConfig(): string {
    return JSON.stringify({
      mode: mode.value,
      preset: presetName.value,
      customLight: customLight.value,
      customDark: customDark.value,
    }, null, 2)
  }

  function importConfig(json: string): boolean {
    try {
      const data = JSON.parse(json)
      if (!data || typeof data !== 'object') return false
      const pn = typeof data.preset === 'string' && getPreset(data.preset) ? data.preset : DEFAULT_CONFIG.preset
      mode.value = data.mode === 'dark' ? 'dark' : data.mode === 'system' ? 'system' : 'light'
      presetName.value = pn
      customLight.value = typeof data.customLight === 'object' ? { ...data.customLight } : {}
      customDark.value = typeof data.customDark === 'object' ? { ...data.customDark } : {}
      apply()
      return true
    } catch {
      return false
    }
  }

  const MODE_MIRROR_KEY = 'lc-theme-mode'
  const LEGACY_MODE_KEY = 'lc-theme-manager'
  const VALID_MODES = ['light', 'dark', 'system'] as const

  function readMirroredMode(): 'light' | 'dark' | 'system' | null {
    if (isServer) return null
    // 1. Our own mirror (plain string, written on every change)
    try {
      const raw = localStorage.getItem(MODE_MIRROR_KEY)
      if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
    } catch { /* ignore */ }
    // 2. Legacy localStorage value from older builds (string or { mode })
    try {
      const legacy = localStorage.getItem(LEGACY_MODE_KEY)
      if (legacy === 'light' || legacy === 'dark' || legacy === 'system') return legacy
      if (legacy) {
        const parsed: unknown = JSON.parse(legacy)
        if (parsed && typeof parsed === 'object') {
          const m = (parsed as Record<string, unknown>).mode
          if (m === 'light' || m === 'dark' || m === 'system') return m
        }
      }
    } catch { /* ignore */ }
    return null
  }

  async function loadConfig() {
    if (isServer) return
    try {
      const saved = await getThemeConfig<ThemeConfig>(STORAGE_KEY)
      if (saved) {
        mode.value = (VALID_MODES as readonly string[]).includes(saved.mode) ? saved.mode : DEFAULT_CONFIG.mode
        presetName.value = typeof saved.preset === 'string' && getPreset(saved.preset) ? saved.preset : DEFAULT_CONFIG.preset
        customLight.value = typeof saved.customLight === 'object' ? saved.customLight : {}
        customDark.value = typeof saved.customDark === 'object' ? saved.customDark : {}
        apply()
        return
      }
    } catch { /* ignore */ }
    // IndexedDB empty or blocked → fall back to localStorage mirror/legacy
    const mirrored = readMirroredMode()
    if (mirrored) {
      mode.value = mirrored
      apply()
    }
  }

  watch(
    [mode, presetName, customLight, customDark],
    () => {
      if (isServer) return
      try {
        void setThemeConfig(STORAGE_KEY, {
          mode: mode.value,
          preset: presetName.value,
          customLight: { ...customLight.value },
          customDark: { ...customDark.value },
        })
      } catch { /* ignore */ }
      // Synchronous mirror: survives even when IndexedDB is blocked
      try {
        localStorage.setItem(MODE_MIRROR_KEY, mode.value)
      } catch { /* ignore */ }
    },
  )

  apply()
  watchSystemTheme()
  loadConfig()

  return {
    mode,
    presetName,
    customLight,
    customDark,
    appSignature,
    getResolvedMode,
    isDark,
    isSystem,
    isCustom,
    activeColors,
    currentPreset,
    PRESETS: computedPresets,
    BRAND_NAMES,
    DEFAULT_CONFIG,
    toggleMode,
    setMode,
    selectPreset,
    setBrandColor,
    getBrandColor,
    setAppSignature,
    resetToDefaults,
    exportConfig,
    importConfig,
    apply,
    destroy,
  }
})

let _store: ReturnType<typeof useThemeStore> | null = null

export function getThemeStore(): ReturnType<typeof useThemeStore> {
  if (!_store) {
    _store = useThemeStore()
  }
  return _store
}
