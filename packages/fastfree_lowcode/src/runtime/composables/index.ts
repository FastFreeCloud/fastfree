// Desktop
export { createDesktopStore, useDesktopStore } from './useDesktopStore'
export { useColumnSettings } from './useColumnSettings'
export { useCrudStore } from './useCrudStore'
export { useInlineEdit } from './useInlineEdit'

// Screen Registry
export {
  registerScreen,
  registerScreens,
  getScreenComponent,
  getScreenRegistration,
  hasScreen,
  getRegisteredScreenTypes,
  unregisterScreen,
  clearScreenRegistry,
  registerBuiltinScreens,
} from './screen-registry'
export type { ScreenRegistration } from './screen-registry'

// Groups Store
export { useGroupsStore, registerGroup, registerGroupPage, SYSTEM_GROUP_ID, FAVORITES_GROUP_ID } from './useGroupsStore'
export type { GroupPage, Group } from './useGroupsStore'

// New Composables
export { useContainerWidth } from './useContainerWidth'
export { useNotify } from './useNotify'
export { useConfirmDialog } from './useConfirmDialog'
export { usePrint } from './usePrint'
export { useExcelExport } from './useExcelExport'
export { useThemeToggle } from './useThemeToggle'
export { useThemeManager } from './useThemeManager'
export { useThemeStore, getThemeStore } from './useThemeStore'
export type { BrandColors, ThemePreset, ThemeConfig } from './useThemeStore'
export { useDateTime } from './useDateTime'
export { useScreenAccess } from './useScreenAccess'
export { piniaDebugPlugin } from './usePiniaDebug'
export { useErrorLogStore } from './useErrorLogStore'
export { useLcI18nStore, getLcI18nStore, MESSAGES_KEYS, getNamespace, getKeyName } from './useLcI18nStore'
export { useSplashCoordinator, getSplashCoordinator } from './useSplashCoordinator'
export type { SplashCoordinator } from './useSplashCoordinator'

// Shared Helpers
export { useFormatNumber } from './useFormatNumber'
export { useStatusHelpers } from './useStatusHelpers'
