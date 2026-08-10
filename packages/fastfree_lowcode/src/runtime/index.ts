// ============================================================
// Components
// ============================================================
export {
  DesktopShell, DesktopHeader, DesktopDock, WindowPanel, GroupWorkspace,
  LcSmartPagination, LcSmartFilter, LcPageHeader, LcSplashScreen,
  LcHeaderActions, LcConnectionScreen, LcErrorLogScreen, LcAboutScreen,
  LcSettingsScreen, LcThemeScreen, LcTranslationEditorScreen, LcPwaUpdateScreen,
  LcShortcutsScreen,
  DynamicTable, DynamicForm, FilterToolbar, PaginationBar,
  EmptyState, AddRowButton,
} from './components'

// ============================================================
// Composables
// ============================================================
export {
  createDesktopStore, useDesktopStore,
  useColumnSettings, useCrudStore, useInlineEdit,
  // Screen Registry
  registerScreen, registerScreens, getScreenComponent, getScreenRegistration,
  hasScreen, getRegisteredScreenTypes, unregisterScreen, clearScreenRegistry,
  registerBuiltinScreens,
  // Groups Store
  useGroupsStore, registerGroup, registerGroupPage, SYSTEM_GROUP_ID, FAVORITES_GROUP_ID,
  // Other
  useContainerWidth, useNotify, useConfirmDialog,
  usePrint, useExcelExport, useThemeToggle, useThemeManager,
  useThemeStore, getThemeStore,
  useDateTime, useScreenAccess, piniaDebugPlugin, useErrorLogStore,
  useSplashCoordinator, getSplashCoordinator,
  // Shared Helpers
  useFormatNumber, useStatusHelpers,
} from './composables'

// ============================================================
// Utils
// ============================================================
export { VALIDATORS, formatters } from './utils'
export { useSaudiValidators } from './validators/saudi-validators'

// ============================================================
// Boot
// ============================================================
export { createApiClient, errorHandler, hideNativeSplash } from './boot'

// ============================================================
// Config
// ============================================================
export {
  mergeConfig, LC_CONFIG_KEY,
  LC_DEFAULT_MESSAGES, LC_DEFAULT_MESSAGES_AR,
  LC_DEFAULT_DESKTOP, LC_DEFAULT_API, LC_DEFAULT_ERROR,
  LC_DEFAULT_SPLASH,
} from './config'
export type {
  LcConfig, LcFullConfig, LcMessages,
  LcDesktopConfig, LcApiConfig, LcErrorConfig,
  ScreenConfig,
  LcCapacitorConfig, LcPwaConfig, LcFontConfig,
  LcSplashConfig,
} from './config'

// ============================================================
// i18n
// ============================================================
export { useLcI18n, useLcConfig, setSharedConfig, getSharedConfig, getLcI18nStore, useLcI18nStore, registerMessages, getValue, getOverridesForLocale, setOverridesForLocale, getNamespace, getKeyName, getAllMessageKeys } from './i18n'
export { getSupportedLanguages, setSupportedLanguages } from './shared-config'
export { DEFAULT_DOCK_ITEMS } from './defaults'

// ============================================================
// Styles (side-effect import for consumers)
// ============================================================
import './styles/lowcode.scss'
import './styles/shared-tables.scss'

// ============================================================
// Types
// ============================================================
export type { WindowInfo, DesktopStoreOptions } from './composables/useDesktopStore'
export type { ColumnDef, ColumnSettingsOptions, ColumnDefaults } from './composables/useColumnSettings'
export type { CrudStoreOptions } from './composables/useCrudStore'
export type { EditableRow, InlineEditOptions } from './composables/useInlineEdit'
export type { DockItem } from './types'
export type { ScreenRegistration } from './composables/screen-registry'
export type { GroupPage, Group } from './composables/useGroupsStore'

export type { PrintCompany, PrintColumn, PrintTableOptions } from './composables/usePrint'
export type { ExcelCompany, ExcelColumn, ExcelExportOptions } from './composables/useExcelExport'
export type { DateTimeInfo } from './composables/useDateTime'
export type { ScreenAccessOptions, ScreenAccessReturn } from './composables/useScreenAccess'
export type { PiniaDebugOptions } from './composables/usePiniaDebug'
export type { LogEntry, ErrorStats } from './composables/useErrorLogStore'
export type { SplashCoordinator } from './composables'
