import { getThemeStore, type BrandColors, type ThemePreset, type ThemeConfig } from './useThemeStore'

export type { BrandColors, ThemePreset, ThemeConfig }

export function useThemeManager() {
  const store = getThemeStore()

  const config = {
    get mode() { return store.mode },
    get preset() { return store.presetName },
    get customLight() { return store.customLight },
    get customDark() { return store.customDark },
  }

  return {
    isDark: store.isDark,
    toggleTheme: store.toggleMode,
    config,
    PRESETS: store.PRESETS,
    BRAND_NAMES: store.BRAND_NAMES,
    setMode: store.setMode,
    setPreset: store.selectPreset,
    setBrandColor: store.setBrandColor,
    getCurrentBrandColor: store.getBrandColor,
    resetToDefaults: store.resetToDefaults,
    exportTheme: store.exportConfig,
    importTheme: store.importConfig,
  }
}
