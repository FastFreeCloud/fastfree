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
  light: BrandColors
  dark: BrandColors
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system'
  preset: string
  customLight: Partial<BrandColors>
  customDark: Partial<BrandColors>
}

const BRAND_NAMES: (keyof BrandColors)[] = [
  'primary', 'secondary', 'accent',
  'positive', 'negative', 'info', 'warning',
]

const PRESETS: ThemePreset[] = [
  {
    name: 'ocean',
    label: 'Ocean',
    light: {
      primary: '#1565C0',
      secondary: '#00897B',
      accent: '#7E57C2',
      positive: '#21BA45',
      negative: '#C10015',
      info: '#31CCEC',
      warning: '#F2C037',
    },
    dark: {
      primary: '#42A5F5',
      secondary: '#00897B',
      accent: '#5C6BC0',
      positive: '#21BA45',
      negative: '#C10015',
      info: '#31CCEC',
      warning: '#F2C037',
    },
  },
  {
    name: 'quasar',
    label: 'Quasar Default',
    light: {
      primary: '#1976D2',
      secondary: '#26A69A',
      accent: '#9C27B0',
      positive: '#21BA45',
      negative: '#C10015',
      info: '#31CCEC',
      warning: '#F2C037',
    },
    dark: {
      primary: '#1976D2',
      secondary: '#26A69A',
      accent: '#CE93D8',
      positive: '#21BA45',
      negative: '#C10015',
      info: '#31CCEC',
      warning: '#F2C037',
    },
  },
  {
    name: 'forest',
    label: 'Forest',
    light: {
      primary: '#2E7D32',
      secondary: '#00695C',
      accent: '#4527A0',
      positive: '#21BA45',
      negative: '#C10015',
      info: '#00ACC1',
      warning: '#F9A825',
    },
    dark: {
      primary: '#4CAF50',
      secondary: '#00897B',
      accent: '#5C6BC0',
      positive: '#66BB6A',
      negative: '#EF5350',
      info: '#00ACC1',
      warning: '#F57F17',
    },
  },
  {
    name: 'sunset',
    label: 'Sunset',
    light: {
      primary: '#E65100',
      secondary: '#BF360C',
      accent: '#6A1B9A',
      positive: '#21BA45',
      negative: '#C10015',
      info: '#00838F',
      warning: '#F9A825',
    },
    dark: {
      primary: '#FF7043',
      secondary: '#E64A19',
      accent: '#7E57C2',
      positive: '#66BB6A',
      negative: '#EF5350',
      info: '#00ACC1',
      warning: '#F57F17',
    },
  },
  {
    name: 'midnight',
    label: 'Midnight',
    light: {
      primary: '#37474F',
      secondary: '#455A64',
      accent: '#5E35B1',
      positive: '#2E7D32',
      negative: '#C62828',
      info: '#0277BD',
      warning: '#F57F17',
    },
    dark: {
      primary: '#78909C',
      secondary: '#90A4AE',
      accent: '#9575CD',
      positive: '#66BB6A',
      negative: '#EF5350',
      info: '#4FC3F7',
      warning: '#FFB74D',
    },
  },
  {
    name: 'gold',
    label: 'Gold',
    light: {
      primary: '#5D4037',
      secondary: '#8D6E63',
      accent: '#BF360C',
      positive: '#2E7D32',
      negative: '#C62828',
      info: '#00838F',
      warning: '#F9A825',
    },
    dark: {
      primary: '#FFB300',
      secondary: '#FF8F00',
      accent: '#CE93D8',
      positive: '#66BB6A',
      negative: '#EF5350',
      info: '#00ACC1',
      warning: '#FFCA28',
    },
  },
  {
    name: 'lavender',
    label: 'Lavender',
    light: {
      primary: '#5E35B1',
      secondary: '#3949AB',
      accent: '#D81B60',
      positive: '#2E7D32',
      negative: '#C62828',
      info: '#0277BD',
      warning: '#F57F17',
    },
    dark: {
      primary: '#7E57C2',
      secondary: '#5C6BC0',
      accent: '#F06292',
      positive: '#66BB6A',
      negative: '#EF5350',
      info: '#4FC3F7',
      warning: '#FFB74D',
    },
  },
  {
    name: 'crimson',
    label: 'Crimson',
    light: {
      primary: '#C62828',
      secondary: '#AD1457',
      accent: '#4527A0',
      positive: '#2E7D32',
      negative: '#B71C1C',
      info: '#00838F',
      warning: '#F57F17',
    },
    dark: {
      primary: '#EF5350',
      secondary: '#D81B60',
      accent: '#7E57C2',
      positive: '#66BB6A',
      negative: '#E53935',
      info: '#00ACC1',
      warning: '#FFB74D',
    },
  },
  {
    name: 'mint',
    label: 'Mint',
    light: {
      primary: '#00796B',
      secondary: '#2E7D32',
      accent: '#7B1FA2',
      positive: '#2E7D32',
      negative: '#C62828',
      info: '#0097A7',
      warning: '#F57F17',
    },
    dark: {
      primary: '#26A69A',
      secondary: '#66BB6A',
      accent: '#CE93D8',
      positive: '#66BB6A',
      negative: '#EF5350',
      info: '#4DD0E1',
      warning: '#FFCA28',
    },
  },
  {
    name: 'arctic',
    label: 'Arctic',
    light: {
      primary: '#0277BD',
      secondary: '#00838F',
      accent: '#5C6BC0',
      positive: '#2E7D32',
      negative: '#C62828',
      info: '#00ACC1',
      warning: '#F57F17',
    },
    dark: {
      primary: '#4FC3F7',
      secondary: '#4DD0E1',
      accent: '#7986CB',
      positive: '#66BB6A',
      negative: '#EF5350',
      info: '#4DD0E1',
      warning: '#FFCA28',
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
  const mode = ref<'light' | 'dark' | 'system'>('system')
  const presetName = ref<string>('ocean')
  const customLight = ref<Partial<BrandColors>>({})
  const customDark = ref<Partial<BrandColors>>({})

  const getResolvedMode = computed<'light' | 'dark'>(() => {
    if (mode.value === 'system') return getSystemMode()
    return mode.value
  })

  const isDark = computed(() => getResolvedMode.value === 'dark')
  const isSystem = computed(() => mode.value === 'system')
  const currentPreset = computed(() => getPreset(presetName.value) || null)
  const isCustom = computed(() => presetName.value === 'custom')

  const activeColors = computed<BrandColors>(() => {
    const resolved = getResolvedMode.value
    const preset = currentPreset.value
    const defaults = preset ? preset[resolved] : PRESETS[0]![resolved]
    const overrides = resolved === 'light' ? customLight.value : customDark.value
    const result = { ...defaults }
    for (const name of BRAND_NAMES) {
      if (overrides[name]) {
        result[name] = overrides[name]
      }
    }
    return result
  })

  function apply() {
    if (isServer) return
    const colors = activeColors.value
    const isDarkMode = getResolvedMode.value === 'dark'
    Dark.set(isDarkMode)
    for (const name of BRAND_NAMES) {
      setCssVar(name, colors[name])
    }
    const root = document.documentElement
    const batch: Record<string, string> = {
      '--lc-primary-dark': lighten(colors.primary, -15),
      '--lc-primary-light': lighten(colors.primary, 15),
      '--lc-secondary-light': lighten(colors.secondary, 15),
      '--lc-accent-light': lighten(colors.accent, 15),
    }
    if (isDarkMode) {
      const surfaceAlt = lighten('#1e1e2e', -5)
      Object.assign(batch, {
        '--lc-surface': '#1e1e2e',
        '--lc-surface-alt': surfaceAlt,
        '--lc-surface-container': surfaceAlt,
        '--lc-surface-container-low': lighten('#1e1e2e', -3),
        '--lc-surface-container-lowest': lighten('#1e1e2e', -1),
        '--lc-on-surface': '#e0e0e0',
        '--lc-on-surface-muted': '#999999',
        '--lc-border': 'rgba(255,255,255,0.12)',
        '--lc-border-light': 'rgba(255,255,255,0.06)',
        '--lc-bg-primary': '#1a1a2e',
        '--lc-on-primary': '#ffffff',
        '--lc-scrollbar-thumb': '#555555',
        '--lc-scrollbar-thumb-hover': '#777777',
        '--lc-table-header-text': '#e0e0e0',
        '--lc-table-cell-border': '#2a2a3c',
        '--lc-table-row-hover': '#16213e',
        '--lc-dock-bg': 'rgba(26,26,46,0.92)',
        '--lc-dock-border': 'rgba(255,255,255,0.1)',
      })
    } else {
      const surfaceAlt = lighten(colors.primary, 95)
      Object.assign(batch, {
        '--lc-surface': '#ffffff',
        '--lc-surface-alt': surfaceAlt,
        '--lc-surface-container': '#f8f9fa',
        '--lc-surface-container-low': '#f5f6f8',
        '--lc-surface-container-lowest': '#fafbfc',
        '--lc-on-surface': '#1a1a2e',
        '--lc-on-surface-muted': '#555555',
        '--lc-border': 'rgba(0,0,0,0.12)',
        '--lc-border-light': 'rgba(0,0,0,0.06)',
        '--lc-bg-primary': '#f0f2f5',
        '--lc-on-primary': '#ffffff',
        '--lc-scrollbar-thumb': '#c4c8cf',
        '--lc-scrollbar-thumb-hover': '#a0a5ad',
        '--lc-table-header-text': '#495057',
        '--lc-table-cell-border': '#f0f0f0',
        '--lc-table-row-hover': '#f0f4ff',
        '--lc-dock-bg': 'rgba(255,255,255,0.85)',
        '--lc-dock-border': 'rgba(255,255,255,0.4)',
      })
    }
    batch['--lc-transition-duration'] = '0.3s'
    batch['--lc-transition-easing'] = 'ease'
    for (const [key, value] of Object.entries(batch)) {
      root.style.setProperty(key, value)
    }
  }

  function toggleMode() {
    if (mode.value === 'light') mode.value = 'dark'
    else if (mode.value === 'dark') mode.value = 'system'
    else mode.value = 'light'
    apply()
  }

  function setMode(m: 'light' | 'dark' | 'system') {
    mode.value = m
    apply()
  }

  function selectPreset(name: string) {
    const hasCustom = Object.keys(customLight.value).length > 0 || Object.keys(customDark.value).length > 0
    if (hasCustom && !isServer) {
      const msg = getLcI18nStore().t('settings.customColorsLost')
      if (!window.confirm(msg)) return
    }
    presetName.value = name
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
    mode.value = 'system'
    presetName.value = 'ocean'
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
      const pn = typeof data.preset === 'string' && getPreset(data.preset) ? data.preset : 'custom'
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

  async function loadConfig() {
    if (isServer) return
    try {
      const saved = await getThemeConfig<ThemeConfig>(STORAGE_KEY)
      if (saved) {
        const validModes = ['light', 'dark', 'system']
        mode.value = validModes.includes(saved.mode) ? saved.mode : 'system'
        presetName.value = typeof saved.preset === 'string' ? saved.preset : 'ocean'
        customLight.value = typeof saved.customLight === 'object' ? saved.customLight : {}
        customDark.value = typeof saved.customDark === 'object' ? saved.customDark : {}
        apply()
      }
    } catch { /* ignore */ }
  }

  watch(
    [mode, presetName, customLight, customDark],
    () => {
      if (isServer) return
      try {
        setThemeConfig(STORAGE_KEY, {
          mode: mode.value,
          preset: presetName.value,
          customLight: customLight.value,
          customDark: customDark.value,
        })
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
    getResolvedMode,
    isDark,
    isSystem,
    isCustom,
    activeColors,
    currentPreset,
    PRESETS,
    BRAND_NAMES,
    toggleMode,
    setMode,
    selectPreset,
    setBrandColor,
    getBrandColor,
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
