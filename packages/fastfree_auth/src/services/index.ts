// ============================================================
// FastFree Auth — Services barrel export
// ============================================================

export {
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
} from './api.service'

export {
  login as authLogin,
  getSession,
  logout as authLogout,
  getCurrentSession,
  isLoggedIn,
  refreshSession,
  destroyAuthService,
} from './auth.service'

export {
  initPermissions,
  getUserRole,
  getEffectiveScreens,
  canAccessScreen,
  can,
  getAllScreens,
  getUserScreens,
  setUserScreens,
  resetPermissions,
} from './permission.service'

export {
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
} from './license.service'

export {
  getCurrentUserProfile,
  updateProfile,
  changePassword,
  getUserSettings,
  updateUserSettings,
  listUsers,
  createUser,
  updateUserRole,
  deleteUser,
} from './user.service'

export {
  getSystemSettings,
  updateSystemSettings,
  getSetting,
  setSetting,
} from './settings.service'

export type { SystemSettings } from './settings.service'

export {
  uploadFile,
  getFileUrl,
  downloadFile,
  deleteFile,
} from './file.service'

export {
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
} from './storage.service'

export type {
  SettingRecord,
  DocumentRecord,
  SyncQueueItem,
  StorageTable,
  FastFreeStorageConfig,
} from './storage.service'

export {
  initRealtime,
  getRealtime,
  disconnectRealtime,
  onRealtimeEvent,
  offRealtimeEvent,
  emitRealtimeEvent,
} from './realtime.service'

export type {
  RealtimeConfig,
  RealtimeEvent,
  DocEvent,
  NotificationEvent,
  EventCallback,
} from './realtime.service'

export {
  getCached,
  setCached,
  getOrFetch,
  cacheDocType,
  getDocTypeSchema,
  clearCache,
  clearExpired,
  destroyCache,
} from './cache.service'
