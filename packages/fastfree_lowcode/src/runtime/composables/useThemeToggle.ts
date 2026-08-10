import { ref, type Ref } from 'vue'
import { Dark, setCssVar } from 'quasar'

const DEEP_OCEAN = {
  primary: '#0D47A1',
  secondary: '#00897B',
  accent: '#5C6BC0',
  dark: '#1a1a2e',
  'dark-page': '#16213e',
  'surface': '#ffffff',
  'surface-alt': '#f8f9fa',
  'on-surface': '#1a1a2e',
  'on-surface-muted': '#555555',
  border: 'rgba(0, 0, 0, 0.12)',
  'primary-dark': '#0D47A1',
}

const LIGHT_OCEAN = {
  primary: '#1565C0',
  secondary: '#00897B',
  accent: '#7E57C2',
  dark: '#1d1d1d',
  'dark-page': '#121212',
  'surface': '#ffffff',
  'surface-alt': '#f8f9fa',
  'on-surface': '#1a1a2e',
  'on-surface-muted': '#555555',
  border: 'rgba(0, 0, 0, 0.12)',
  'primary-dark': '#0D47A1',
}

export function useThemeToggle() {
  const isDark: Ref<boolean> = ref(Dark.isActive)

  function toggleTheme() {
    const next = !Dark.isActive
    Dark.set(next)
    isDark.value = next
    applyThemeColors(next)
  }

  function applyThemeColors(dark: boolean) {
    const vars = dark ? DEEP_OCEAN : LIGHT_OCEAN
    for (const [key, value] of Object.entries(vars)) {
      setCssVar(`--lc-${key}`, value)
    }
  }

  return { isDark, toggleTheme }
}