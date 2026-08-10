// ============================================================
// FastFree Auth — Main Entry Point
// npm package for authentication, permissions, and license
// ============================================================

// ------------------------------------------------------------
// Initialization
// ------------------------------------------------------------

export { initFastFreeAuth, getStoredBaseUrl } from './init'
export type { FastFreeAuthOptions } from './init'

// ------------------------------------------------------------
// Services
// ------------------------------------------------------------

export {
  // API
  initApiService,
  getBaseUrl,
  getFrappeApp,
  getAuth,
  getDb,
  getCall,
  getFile,
  login,
  getCurrentUser,
  logout,
  getDoc,
  getDocList,
  createDoc,
  updateDoc,
  deleteDoc,
  docExists,
  getCount,
  callGet,
  callPost,
  callPut,
  callDelete,
  // Auth
  login as authLogin,
  getSession,
  logout as authLogout,
  getCurrentSession,
  isLoggedIn,
  refreshSession,
  destroyAuthService,
  // Permissions
  initPermissions,
  getUserRole,
  getEffectiveScreens,
  canAccessScreen,
  can,
  getAllScreens,
  getUserScreens,
  setUserScreens,
  resetPermissions,
  // License
  initLicenseService,
  getLicenseInfo,
  isLicenseValid,
  isFeatureAvailable,
  canAddUser,
  refreshLicense,
  activateLicense,
  getExpirationDate,
  isExpiringSoon,
  destroyLicenseService,
  // User
  getCurrentUserProfile,
  updateProfile,
  changePassword,
  getUserSettings,
  updateUserSettings,
  listUsers,
  createUser,
  updateUserRole,
  deleteUser,
  // File
  uploadFile,
  getFileUrl,
  downloadFile,
  deleteFile,
  // Storage
  initStorage,
  getStorage,
  getStorageSetting,
  setStorageSetting,
  deleteStorageSetting,
  getAllStorageSettings,
  clearStorageSettings,
  getStorageDocument,
  setStorageDocument,
  deleteStorageDocument,
  getAllStorageDocuments,
  clearStorageDocuments,
  addToSyncQueue,
  getSyncQueue,
  markSynced,
  clearSyncQueue,
  destroyStorage,
  // Realtime
  initRealtime,
  getRealtime,
  disconnectRealtime,
  onRealtimeEvent,
  offRealtimeEvent,
  emitRealtimeEvent,
  // Cache
  getCached,
  setCached,
  getOrFetch,
  cacheDocType,
  getDocTypeSchema,
  clearCache,
  clearExpired,
  destroyCache,
} from './services'

// ------------------------------------------------------------
// Stores
// ------------------------------------------------------------

export {
  useAuthStore,
  usePermissionStore,
  useLicenseStore,
  useSettingsStore,
} from './stores'

// ------------------------------------------------------------
// Screens
// ------------------------------------------------------------

export {
  AuthLogin,
  UsersManager,
  RolesManager,
  LicenseInfo,
  UserProfile,
} from './screens'

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type {
  AuthUser,
  UserRole,
  SessionData,
  PermissionCheck,
  ScreenPermission,
  LicenseInfo as LicenseInfoType,
  ApiResponse,
  PaginatedResponse,
  AppSettings,
  FastFreeAuthConfig,
} from './types'
