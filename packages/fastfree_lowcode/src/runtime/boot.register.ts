import WindowPanel from './components/WindowPanel.vue'
import DesktopDock from './components/DesktopDock.vue'
import DynamicTable from './components/DynamicTable.vue'
import DynamicForm from './components/DynamicForm.vue'
import FilterToolbar from './components/FilterToolbar.vue'
import PaginationBar from './components/PaginationBar.vue'
import EmptyState from './components/EmptyState.vue'
import AddRowButton from './components/AddRowButton.vue'
import LcConnectionScreen from './components/LcConnectionScreen.vue'
import LcErrorLogScreen from './components/LcErrorLogScreen.vue'
import LcAboutScreen from './components/LcAboutScreen.vue'
import LcSettingsScreen from './components/LcSettingsScreen.vue'
import LcTranslationEditorScreen from './components/LcTranslationEditorScreen.vue'
import LcPwaUpdateScreen from './components/LcPwaUpdateScreen.vue'
import LcThemeScreen from './components/LcThemeScreen.vue'
import LcSplashScreen from './components/LcSplashScreen.vue'
import LcShortcutsScreen from './components/LcShortcutsScreen.vue'
import LcErrorBoundary from './components/LcErrorBoundary.vue'

import { createDesktopStore } from './composables/useDesktopStore'
import { LC_CONFIG_KEY, mergeConfig } from './config'
import { setSharedConfig } from './shared-config'
import { getLanguageInfo } from './languages'
import { getLcI18nStore } from './composables/useLcI18nStore'
import { getThemeStore } from './composables/useThemeStore'
import errorHandler from './boot/error-handler'
import { getSplashCoordinator } from './composables/useSplashCoordinator'

export { createDesktopStore }

export default function ({ app }: { app: { provide: (key: string | symbol, value: unknown) => void; component: (name: string, component: unknown) => void; config: { globalProperties: Record<string, unknown>; errorHandler?: (err: unknown, instance: unknown, info: string) => void; warnHandler?: (msg: string, instance: unknown, trace: string) => void } } }) {
  // TODO: Pass user config to mergeConfig() — e.g. mergeConfig(window.__LC_CONFIG__)
  // The global __LC_CONFIG__ or a meta tag can be used to supply custom configuration
  const config = mergeConfig()
  setSharedConfig(config)

  app.provide(LC_CONFIG_KEY, config)

  // Initialize splash coordinator (shows loading overlay during boot)
  const splash = getSplashCoordinator()
  splash.show()
  app.config.globalProperties.$lcConfig = config

  // Initialize i18n store and apply saved locale
  const i18nStore = getLcI18nStore()
  const savedLang = i18nStore.locale.value
  const langInfo = getLanguageInfo(savedLang)
  if (langInfo?.direction === 'rtl') {
    const $q = app.config.globalProperties.$q as { direction?: string; lang?: { set: (m: unknown) => void } } | undefined
    if ($q) $q.direction = 'rtl'
    document.documentElement.dir = 'rtl'
    if (savedLang === 'ar') {
      import('quasar/lang/ar').then((mod) => {
        $q?.lang?.set(mod.default)
      }).catch(() => {})
    }
  }

  // Initialize theme store — loads saved config and applies CSS vars + dark mode
  getThemeStore()

  // Apply user config theme overrides on top (highest priority)
  if (config.theme && Object.keys(config.theme).length > 0) {
    const root = document.documentElement
    for (const [key, value] of Object.entries(config.theme)) {
      const varName = key.startsWith('--') ? key : `--lc-${key}`
      root.style.setProperty(varName, value)
    }
  }

  app.component('WindowPanel', WindowPanel)
  app.component('DesktopDock', DesktopDock)
  app.component('DynamicTable', DynamicTable)
  app.component('DynamicForm', DynamicForm)
  app.component('FilterToolbar', FilterToolbar)
  app.component('PaginationBar', PaginationBar)
  app.component('EmptyState', EmptyState)
  app.component('AddRowButton', AddRowButton)
  app.component('LcConnectionScreen', LcConnectionScreen)
  app.component('LcErrorLogScreen', LcErrorLogScreen)
  app.component('LcAboutScreen', LcAboutScreen)
  app.component('LcSettingsScreen', LcSettingsScreen)
  app.component('LcTranslationEditorScreen', LcTranslationEditorScreen)
  app.component('LcPwaUpdateScreen', LcPwaUpdateScreen)
  app.component('LcThemeScreen', LcThemeScreen)
  app.component('LcSplashScreen', LcSplashScreen)
  app.component('LcShortcutsScreen', LcShortcutsScreen)
  app.component('LcErrorBoundary', LcErrorBoundary)

  app.provide('createDesktopStore', createDesktopStore)
  app.config.globalProperties.$createDesktopStore = createDesktopStore

  // Initialize global error monitoring automatically
  try {
    errorHandler({ app })
  } catch { /* ignore */ }

  // Optional boots — run only when enabled in config
  if (config.font?.cairo) {
    void import('./boot/fontsource').catch(() => {})
  }
  if (config.capacitor?.enabled) {
    void import('./boot/capacitor').then(m => m.default?.()).catch(() => {})
  }
  if (config.pwa?.enabled) {
    void import('./boot/pwa-update').then(m => m.default?.()).catch(() => {})
  }
}
