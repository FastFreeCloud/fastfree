import { type Component, defineAsyncComponent, markRaw } from 'vue'

// ============================================================
// Screen Registry — Dynamic screen component registration
// ============================================================

export interface ScreenRegistration {
  component: Component
  label?: string
  icon?: string
  groupId?: string
}

const registry = new Map<string, ScreenRegistration>()

/**
 * Register a screen component for a given screenType.
 * External packages (e.g. fastfree_auth) call this to make their
 * screens renderable inside DesktopShell.
 *
 * @example
 * ```ts
 * import { registerScreen } from 'fastfree-lowcode'
 * import AuthLogin from './components/AuthLogin.vue'
 *
 * registerScreen('auth-login', {
 *   component: AuthLogin,
 *   label: 'screens.login',
 *   icon: 'mdi-login',
 *   groupId: 'system',
 * })
 * ```
 */
export function registerScreen(screenType: string, registration: ScreenRegistration): void {
  registry.set(screenType, {
    ...registration,
    component: markRaw(registration.component),
  })
}

/**
 * Register multiple screens at once.
 */
export function registerScreens(entries: Record<string, ScreenRegistration>): void {
  for (const [screenType, registration] of Object.entries(entries)) {
    registerScreen(screenType, registration)
  }
}

/**
 * Get a registered screen component by screenType.
 * Returns undefined if not found (DesktopShell falls back gracefully).
 */
export function getScreenComponent(screenType: string): Component | undefined {
  return registry.get(screenType)?.component
}

/**
 * Get full registration info for a screenType.
 */
export function getScreenRegistration(screenType: string): ScreenRegistration | undefined {
  return registry.get(screenType)
}

/**
 * Check if a screenType is registered.
 */
export function hasScreen(screenType: string): boolean {
  return registry.has(screenType)
}

/**
 * Get all registered screenTypes.
 */
export function getRegisteredScreenTypes(): string[] {
  return Array.from(registry.keys())
}

/**
 * Unregister a screen (useful for testing or dynamic removal).
 */
export function unregisterScreen(screenType: string): boolean {
  return registry.delete(screenType)
}

/**
 * Clear all registrations (useful for testing).
 */
export function clearScreenRegistry(): void {
  registry.clear()
}

/**
 * Register all built-in screens.
 * Called once by DesktopShell on mount.
 */
export function registerBuiltinScreens(): void {
  // Lazy import to avoid circular dependencies
  const LcSplashScreen = defineAsyncComponent(() => import('../components/LcSplashScreen.vue'))
  const LcErrorLogScreen = defineAsyncComponent(() => import('../components/LcErrorLogScreen.vue'))
  const LcAboutScreen = defineAsyncComponent(() => import('../components/LcAboutScreen.vue'))
  const LcSettingsScreen = defineAsyncComponent(() => import('../components/LcSettingsScreen.vue'))
  const LcTranslationEditorScreen = defineAsyncComponent(() => import('../components/LcTranslationEditorScreen.vue'))
  const LcThemeScreen = defineAsyncComponent(() => import('../components/LcThemeScreen.vue'))
  const LcPwaUpdateScreen = defineAsyncComponent(() => import('../components/LcPwaUpdateScreen.vue'))
  const LcShortcutsScreen = defineAsyncComponent(() => import('../components/LcShortcutsScreen.vue'))
  const LcStructureInspector = defineAsyncComponent(() => import('../components/LcStructureInspector.vue'))
  const PiniaStateDebugger = defineAsyncComponent(() => import('../components/PiniaStateDebugger.vue'))

  registerScreens({
    'splash': { component: LcSplashScreen, icon: 'mdi-power' },
    'errors': { component: LcErrorLogScreen, icon: 'mdi-bug-outline', groupId: 'system' },
    'error-logs': { component: LcErrorLogScreen, icon: 'mdi-bug-outline', groupId: 'system' },
    'about': { component: LcAboutScreen, icon: 'mdi-information-outline', groupId: 'system' },
    'settings': { component: LcSettingsScreen, icon: 'mdi-cog-outline', groupId: 'system' },
    'translation-editor': { component: LcTranslationEditorScreen, icon: 'mdi-translate', groupId: 'system' },
    'theme': { component: LcThemeScreen, icon: 'mdi-palette-outline', groupId: 'system' },
    'pwa-update': { component: LcPwaUpdateScreen, icon: 'mdi-cellphone-arrow-down', groupId: 'system' },
    'shortcuts': { component: LcShortcutsScreen, icon: 'mdi-keyboard-outline', groupId: 'system' },
    'structure-inspector': { component: LcStructureInspector, icon: 'mdi-file-tree-outline', groupId: 'system' },
    'pinia-debugger': { component: PiniaStateDebugger, icon: 'mdi-database-outline', groupId: 'system' },
  })
}
