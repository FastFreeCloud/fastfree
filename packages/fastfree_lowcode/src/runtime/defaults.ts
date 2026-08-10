import type { DockItem } from './types'
import type {
  LcDesktopConfig,
  LcApiConfig,
  LcErrorConfig,
  LcSplashConfig,
  LcCapacitorConfig,
  LcPwaConfig,
  LcFontConfig,
} from './types'

export const DEFAULT_DOCK_ITEMS: DockItem[] = [
  { id: 'error-logs', icon: 'mdi-bug-outline', label: 'Error Log' },
  { id: 'about', icon: 'mdi-information-outline', label: 'About' },
  { id: 'settings', icon: 'mdi-cog-outline', label: 'Settings' },
  { id: 'translation-editor', icon: 'mdi-translate', label: 'Translation Editor' },
  { id: 'theme', icon: 'mdi-palette-outline', label: 'Theme' },
  { id: 'pwa-update', icon: 'mdi-cellphone-arrow-down', label: 'PWA Update' },
  { id: 'shortcuts', icon: 'mdi-keyboard-outline', label: 'Shortcuts' },
  { id: 'pinia-debugger', icon: 'mdi-database-search', label: 'Pinia Debugger' },
]

export const LC_DEFAULT_SPLASH: LcSplashConfig = {
  mode: "component",
  delay: 1200,
  message: "Loading...",
  spinnerColor: "primary",
  backgroundColor: "#1565C0",
}

export const LC_DEFAULT_DESKTOP: LcDesktopConfig = {
  storeId: "desktop",
  headerHeight: 56,
  switcherHeight: 40,
  dockHeight: 77,
  defaultWidth: 900,
  defaultHeight: 550,
  dockPosition: "bottom",
  dockStyle: "glass",
  headerGradient: ["#0D47A1", "#1565C0"],
  screens: {
    "translation-editor": {
      maxInstances: 1,
      defaultWidth: 1200,
      defaultHeight: 600,
      maximizeOnOpen: false,
    },
    settings: {
      maxInstances: 1,
      defaultWidth: 800,
      defaultHeight: 600,
      maximizeOnOpen: false,
    },
    theme: {
      maxInstances: 1,
      defaultWidth: 680,
      defaultHeight: 550,
      maximizeOnOpen: false,
    },
    about: {
      maxInstances: 1,
      defaultWidth: 500,
      defaultHeight: 400,
      maximizeOnOpen: false,
    },
    "error-logs": {
      maxInstances: 1,
      defaultWidth: 700,
      defaultHeight: 500,
      maximizeOnOpen: false,
    },
    "pwa-update": {
      maxInstances: 1,
      defaultWidth: 500,
      defaultHeight: 400,
      maximizeOnOpen: false,
    },
    shortcuts: {
      maxInstances: 1,
      defaultWidth: 650,
      defaultHeight: 500,
      maximizeOnOpen: false,
    },
    "pinia-debugger": {
      maxInstances: 1,
      defaultWidth: 900,
      defaultHeight: 600,
      maximizeOnOpen: false,
    },
    "structure-inspector": {
      maxInstances: 1,
      defaultWidth: 800,
      defaultHeight: 600,
      maximizeOnOpen: false,
    },
  },
  persistState: true,
}

export const LC_DEFAULT_API: LcApiConfig = {
  baseUrl: "/api",
  timeout: 10000,
}

export const LC_DEFAULT_ERROR: LcErrorConfig = {
  throttleMs: 60000,
  notificationTimeout: 8000,
  notificationPosition: "top",
  lcpBadThreshold: 4000,
  lcpImproveThreshold: 2500,
  clsBadThreshold: 0.25,
  clsImproveThreshold: 0.1,
  memoryPressureThreshold: 85,
  memoryCheckInterval: 30000,
}

export const LC_DEFAULT_CAPACITOR: LcCapacitorConfig = {
  enabled: false,
  statusBarColor: "#1565C0",
  nativeSplashAutoHide: true,
}

export const LC_DEFAULT_PWA: LcPwaConfig = {
  enabled: false,
  settingsEndpoint: "/settings-print",
}

export const LC_DEFAULT_FONT: LcFontConfig = {
  cairo: false,
}
