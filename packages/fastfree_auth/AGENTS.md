# AGENTS.md — FastFree Auth

## ملاحظات سريعة

- TypeCheck: `cd apps/fastfree_ledger && pnpm vue-tsc --noEmit`
- Lint: `cd apps/fastfree_ledger && pnpm eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"`
- Boot Order: `fastfree-auth-init` يشتغل أول حاجة في Boot Files

## وصف الحزمة

بكج `fastfree-auth` مسؤول عن المصادقة (Authentication)، إدارة المستخدمين، إدارة الأدوار والصلاحيات، الترخيص (License)، والخدمات الأساسية المشتركة (API, Cache, Storage, Realtime, Settings, File).

**الإصدار:** `0.1.0`
**التبعيات الأساسية:** `frappe-js-sdk@^1.13.0`, `dexie@^4.0.0`, `socket.io-client@^4.0.0`
**التبعيات المشتركة:** `vue@^3.5.22`, `pinia@^2.0.0`, `quasar@^2.22.0`, `vue-router@^4.0.0`, `typescript@^5.0.0`

## هيكل الملفات

```
packages/fastfree_auth/
├── AGENTS.md                          # هذا الملف
├── package.json                       # 61 سطر
└── src/
    ├── index.ts                       # Entry point — كل الـ exports (158 سطر)
    ├── init.ts                        # Initialization + lowcode registry loader (86 سطر)
    ├── boot.ts                        # Quasar boot file template (15 سطر)
    ├── screenRegistration.ts          # تسجيل الشاشات مع lowcode shell (49 سطر)
    ├── locales/
    │   ├── index.ts                   # barrel export (2 سطر)
    │   ├── en.ts                      # 145 مفتاح ترجمة EN (147 سطر)
    │   └── ar.ts                      # 145 مفتاح ترجمة AR (147 سطر)
    ├── screens/
    │   ├── index.ts                   # barrel export (9 سطر)
    │   ├── AuthLogin.vue              # شاشة تسجيل الدخول (160 سطر)
    │   ├── UsersManager.vue           # إدارة المستخدمين CRUD (317 سطر)
    │   ├── RolesManager.vue           # إدارة الأدوار والصلاحيات (292 سطر)
    │   ├── LicenseInfo.vue            # معلومات الترخيص وتفعيله (157 سطر)
    │   └── UserProfile.vue            # الملف الشخصي + تغيير كلمة المرور (162 سطر)
    ├── services/
    │   ├── index.ts                   # barrel export لكل الخدمات (146 سطر)
    │   ├── api.service.ts             # Frappe SDK wrapper — CRUD + Call (433 سطر)
    │   ├── auth.service.ts            # Login + session + role fetch (195 سطر)
    │   ├── user.service.ts            # User profile + management (283 سطر)
    │   ├── license.service.ts         # License verification + activation (153 سطر)
    │   ├── permission.service.ts      # RBAC — screen + action permissions (131 سطر)
    │   ├── file.service.ts            # Upload + download + delete (113 سطر)
    │   ├── storage.service.ts         # Offline/POS storage — Dexie.js (509 سطر)
    │   ├── realtime.service.ts        # Socket.io realtime events (118 سطر)
    │   ├── cache.service.ts           # Metadata + DocType schema caching (198 سطر)
    │   └── settings.service.ts        # System-wide FastFree Settings doctype (49 سطر)
    ├── stores/
    │   ├── index.ts                   # barrel export (8 سطر)
    │   ├── useAuthStore.ts            # Pinia — auth state + login/logout (117 سطر)
    │   ├── useLicenseStore.ts         # Pinia — license state + activation (122 سطر)
    │   ├── usePermissionStore.ts      # Pinia — role + screen permissions (84 سطر)
    │   └── useSettingsStore.ts        # Pinia — user settings + Dexie persistence (128 سطر)
    └── types/
        └── index.ts                   # كل الـ interfaces + constants (99 سطر)
```

## الأنواع (Types)

### src/types/index.ts

| الـ Interface | الحقول | الوصف |
|---------------|--------|-------|
| `AuthUser` | `id: string`, `name: string`, `email: string`, `role: UserRole`, `avatar?: string`, `permissions?: string[]` | بيانات المستخدم الأساسية |
| `UserRole` | `'SWIFT' \| 'OPERATOR' \| 'USER'` | Type alias للأدوار |
| `SessionData` | `user: AuthUser`, `sessionId: string`, `expiresAt: number` | بيانات الجلسة |
| `PermissionCheck` | `action: string`, `doctype: string` | فحص صلاحية |
| `ScreenPermission` | `id: string`, `label: string`, `icon: string` | صلاحية شاشة |
| `LicenseInfo` | `key: string`, `type: 'trial'\|'standard'\|'enterprise'`, `status: 'active'\|'expired'\|'suspended'`, `expiresAt: number\|null`, `maxUsers: number`, `maxDevices: number`, `activatedDevices: string[]` | معلومات الترخيص |
| `ApiResponse<T>` | `success: boolean`, `data?: T`, `error?: { code, message, details? }` | استجابة API عامة |
| `PaginatedResponse<T>` | `data: T[]`, `total: number`, `page: number`, `limit: number` | استجابة مقسمة للصفحات |
| `AppSettings` | `language: string`, `theme: string`, `notifications: boolean`, `autoSave: boolean` | إعدادات المستخدم |
| `FastFreeAuthConfig` | `baseUrl: string`, `app?: App`, `storagePrefix?: string` | إعدادات الحزمة |

**ثابت:** `DEFAULT_SETTINGS` — `{ language: 'ar', theme: 'light', notifications: true, autoSave: true }`

### src/services/settings.service.ts

| الـ Interface | الحقول |
|---------------|--------|
| `SystemSettings` | `companyName`, `currency`, `dateFormat`, `timeFormat`, `numberFormat`, `defaultWarehouse?`, `defaultCurrency?`, `taxTemplate?`, `printSettings?` |

### src/services/storage.service.ts

| الـ Interface | الحقول |
|---------------|--------|
| `SettingRecord` | `id: string`, `key: string`, `value: unknown`, `updatedAt: number` |
| `DocumentRecord` | `id: string`, `doctype: string`, `data: Record<string, unknown>`, `updatedAt: number` |
| `SyncQueueItem` | `id?: number`, `action: 'create'\|'update'\|'delete'`, `doctype: string`, `docName?: string`, `data?`, `timestamp: number`, `synced: boolean` |
| `StorageTable` | `'settings' \| 'documents' \| 'sync_queue'` |
| `FastFreeStorageConfig` | `dbName?: string`, `version?: number` |

### src/services/realtime.service.ts

| الـ Interface | الحقول |
|---------------|--------|
| `RealtimeConfig` | `url: string`, `token?: string`, `reconnect?`, `reconnectAttempts?`, `reconnectDelay?` |
| `RealtimeEvent` | `'doc_update' \| 'doc_insert' \| 'doc_delete' \| 'user_typing' \| 'notification'` |
| `DocEvent` | `doctype: string`, `docname: string`, `user: string`, `timestamp: number` |
| `NotificationEvent` | `user: string`, `message: string`, `timestamp: number`, `read: boolean` |
| `EventCallback` | `(data: DocEvent \| NotificationEvent) => void` |

## الخدمات (Services)

### api.service.ts — Frappe SDK Wrapper

| الدالة | الـ Params | الوصف |
|--------|-----------|-------|
| `initApiService(baseUrl)` | `string` | تهيئة FrappeApp + auth/db/call/file |
| `getBaseUrl()` | — | إرجاع Base URL |
| `getFrappeApp()` | — | إرجاع FrappeApp instance |
| `getAuth()` | — | إرجاع FrappeAuth |
| `getDb()` | — | إرجاع FrappeDB |
| `getCall()` | — | إرجاع FrappeCall |
| `getFile()` | — | إرجاع FrappeFile |
| `login(email, password)` | `string, string` | تسجيل الدخول |
| `getCurrentUser()` | — | إرجاع المستخدم الحالي `{ user, email }` |
| `logout()` | — | تسجيل الخروج |
| `getDoc<T>(doctype, name)` | `string, string` | جلب مستند |
| `getDocList<T>(doctype, filters?, fields?, orderBy?, limit?)` | `string, ...` | جلب قائمة مستندات |
| `createDoc<T>(doctype, data)` | `string, Record` | إنشاء مستند |
| `updateDoc<T>(doctype, name, data)` | `string, string, Record` | تحديث مستند |
| `deleteDoc(doctype, name)` | `string, string` | حذف مستند |
| `docExists(doctype, name)` | `string, string` | فحص وجود مستند |
| `getCount(doctype, filters?)` | `string, Record?` | عدد المستندات |
| `callGet<T>(method, params?)` | `string, Record?` | استدعاء API GET |
| `callPost<T>(method, params?)` | `string, Record?` | استدعاء API POST |
| `callPut<T>(method, params?)` | `string, Record?` | استدعاء API PUT |
| `callDelete<T>(method, params?)` | `string, Record?` | استدعاء API DELETE |

### auth.service.ts — Authentication + Session

| الدالة | الـ Params | الوصف |
|--------|-----------|-------|
| `login(email, password)` | `string, string` | تسجيل الدخول + إنشاء session + جلب الدور |
| `getSession()` | — | جلب الجلسة من السيرفر |
| `logout()` | — | تسجيل الخروج + تنظيف الجلسة |
| `getCurrentSession()` | — | إرجاع الجلسة المخزنة (cached) |
| `isLoggedIn()` | — | فحص هل المستخدم مسجل دخول |
| `refreshSession()` | — | تحديث الجلسة |
| `destroyAuthService()` | — | تنظيف شامل |

**ملاحظة:** `startSessionCheck()` يتحقق كل 5 دقائق، يطلق `auth-session-expired` custom event عند انتهاء الجلسة.

### user.service.ts — User Profile + Management

| الدالة | الـ Params | الوصف |
|--------|-----------|-------|
| `getCurrentUserProfile()` | — | جلب profile المستخدم الحالي |
| `updateProfile(data)` | `Partial<Pick<UserProfile, 'name'\|'phone'\|'avatar'>>` | تحديث الاسم/الهاتف/الصورة |
| `changePassword(currentPassword, newPassword)` | `string, string` | تغيير كلمة المرور |
| `getUserSettings()` | — | جلب إعدادات المستخدم |
| `updateUserSettings(settings)` | `Partial<UserSettings>` | تحديث الإعدادات |
| `listUsers()` | — | جلب كل المستخدمين + أدوارهم (batch fetch) |
| `createUser(userData)` | `{ email, name, role, password? }` | إنشاء مستخدم جديد |
| `updateUserRole(userId, role)` | `string, string` | تحديث الدور عبر Has Role child table |
| `deleteUser(userId)` | `string` | حذف مستخدم |
| `resetPassword(userName, newPassword)` | `string, string` | إعادة تعيين كلمة المرور (Admin) |

### license.service.ts — License Management

| الدالة | الـ Params | الوصف |
|--------|-----------|-------|
| `initLicenseService()` | — | تهيئة + تحديث الترخيص + بدء الفحص الدوري |
| `getLicenseInfo()` | — | إرجاع معلومات الترخيص الحالية |
| `isLicenseValid()` | — | فحص هل الترخيص صالح (active + not expired) |
| `isFeatureAvailable(feature)` | `string` | فحص توفر ميزة معينة (trial محدود) |
| `canAddUser()` | — | فحص هل يمكن إضافة مستخدم جديد |
| `refreshLicense()` | — | تحديث معلومات الترخيص من السيرفر |
| `activateLicense(key)` | `string` | تفعيل مفتاح ترخيص |
| `getExpirationDate()` | — | إرجاع تاريخ الانتهاء |
| `isExpiringSoon()` | — | فحص هل ينتهي خلال 7 أيام |
| `destroyLicenseService()` | — | تنظيف |

### permission.service.ts — RBAC Permissions

| الدالة | الـ Params | الوصف |
|--------|-----------|-------|
| `initPermissions(role, customScreens?)` | `UserRole, string[]?` | تهيئة الصلاحيات |
| `getUserRole()` | — | إرجاع الدور الحالي |
| `getEffectiveScreens()` | — | إرجاع الشاشات المتاحة للدور |
| `canAccessScreen(screenId)` | `string` | فحص صلاحية الوصول لشاشة |
| `can(action, doctype)` | `string, string` | فحص صلاحية إجراء على doctype |
| `getAllScreens()` | — | إرجاع كل الشاشات المتاحة |
| `getUserScreens()` | — | إرجاع شاشات المستخدم الفعلية |
| `setUserScreens(screens)` | `string[] \| null` | تعيين شاشات مخصصة (Admin) |
| `resetPermissions()` | — | إعادة تعيين لل defaults |

**الإを見せ defaults:**
- `SWIFT`: كل الشاشات (invoices, invoices-list, companies, backup, errors, print-settings, permissions, dev-settings)
- `OPERATOR`: invoices, invoices-list, companies, backup, errors, print-settings
- `USER`: invoices, invoices-list, companies, errors

### file.service.ts — File Operations

| الدالة | الـ Params | الوصف |
|--------|-----------|-------|
| `uploadFile(doctype, docname, file, fieldName?)` | `string, string, File, string?` | رفع ملف |
| `getFileUrl(fileUrl)` | `string` | إرجاع رابط الملف |
| `downloadFile(fileUrl)` | `string` | تحميل ملف كـ Blob |
| `deleteFile(fileName)` | `string` | حذف ملف |

### storage.service.ts — Offline/POS Storage (Dexie.js)

| الدالة | الـ Params | الوصف |
|--------|-----------|-------|
| `initStorage(config?)` | `FastFreeStorageConfig?` | تهيئة IndexedDB (fastfree-storage) |
| `getStorage()` | — | إرجاع Dexie instance |
| `getStorageSetting<T>(key)` | `string` | جلب إعداد بالـ key |
| `setStorageSetting(key, value)` | `string, unknown` | حفظ إعداد |
| `deleteStorageSetting(key)` | `string` | حذف إعداد |
| `getAllStorageSettings<T>()` | — | جلب كل الإعدادات |
| `clearStorageSettings()` | — | مسح كل الإعدادات |
| `getStorageDocument<T>(id)` | `string` | جلب مستند بالـ ID |
| `setStorageDocument(id, doctype, data)` | `string, string, Record` | حفظ مستند |
| `deleteStorageDocument(id)` | `string` | حذف مستند |
| `getAllStorageDocuments<T>(doctype?)` | `string?` | جلب مستندات (فلتر اختياري) |
| `clearStorageDocuments()` | — | مسح كل المستندات |
| `addToSyncQueue(item)` | `Omit<SyncQueueItem, ...>` | إضافة لقائمة المزامنة |
| `getSyncQueue()` | — | جلب العناصر غير المزامنة |
| `markSynced(id)` | `number` | تحديد كـ synced |
| `clearSyncQueue()` | — | مسح العناصر المزامنة |
| `destroyStorage()` | — | إغلاق IndexedDB |

**الجداول:** `settings` (id, key), `documents` (id, doctype), `sync_queue` (++id, timestamp, synced)

### realtime.service.ts — Socket.io Realtime

| الدالة | الـ Params | الوصف |
|--------|-----------|-------|
| `initRealtime(config)` | `RealtimeConfig` | إنشاء Socket.io connection |
| `getRealtime()` | — | إرجاع Socket instance |
| `disconnectRealtime()` | — | قطع الاتصال |
| `onRealtimeEvent(event, callback)` | `RealtimeEvent, EventCallback` | الاستماع لحدث |
| `offRealtimeEvent(event, callback?)` | `RealtimeEvent, EventCallback?` | إيقاف الاستماع |
| `emitRealtimeEvent(event, data?)` | `string, unknown?` | إرسال حدث |

### cache.service.ts — Metadata + DocType Caching (Dexie.js)

| الدالة | الـ Params | الوصف |
|--------|-----------|-------|
| `getCached<T>(key)` | `string` | جلب من الكاش (TTL-aware) |
| `setCached(key, data, ttlMs?)` | `string, unknown, number?` | حفظ في الكاش |
| `getOrFetch<T>(key, fetcher, ttlMs?)` | `string, Function, number?` | جلب من الكاش أو السيرفر |
| `cacheDocType(doctype)` | `string` | كاش DocType schema (1 ساعة TTL) |
| `getDocTypeSchema(doctype)` | `string` | جلب DocType schema من الكاش |
| `clearCache()` | — | مسح كل الكاش |
| `clearExpired()` | — | مسح الكاش المنتهي |
| `destroyCache()` | — | إغلاق قاعدة الكاش |

### settings.service.ts — System Settings

| الدالة | الـ Params | الوصف |
|--------|-----------|-------|
| `getSystemSettings()` | — | جلب إعدادات النظام من FastFree Settings |
| `updateSystemSettings(data)` | `Partial<SystemSettings>` | تحديث إعدادات النظام |
| `getSetting<T>(key)` | `string` | جلب إعداد محدد |
| `setSetting(key, value)` | `string, unknown` | تعيين إعداد |

## الشاشات (Screens)

### AuthLogin.vue — شاشة تسجيل الدخول

- **المسار:** `auth-login`
- **الأيقونة:** `mdi-login`
- **الوظيفة:** نموذج تسجيل دخول (email + password) مع إعدادات الاتصال (server URL dialog)
- **المتطلبات:** `useAuthStore`, `useLcI18n`
- **الأحداث:** `success`, `error`
- **try/catch:** في `handleLogin()` مع `$q.notify`

### UsersManager.vue — إدارة المستخدمين

- **المسار:** `auth-users`
- **الأيقونة:** `mdi-account-group`
- **الوظيفة:** CRUD كاملة — جلب المستخدمين، إضافة، تعديل (اسم + إيميل + دور)، حذف، إعادة تعيين كلمة المرور
- **المتطلبات:** `listUsers`, `createUser`, `updateUserRole`, `deleteUser`, `resetPassword` من `user.service.ts` + `updateDoc` من `api.service.ts`
- **النافذة:** create/edit dialog + reset password dialog
- **try/catch:** في `saveUser()`, `resetPassword()`, `fetchUsers()`

### RolesManager.vue — إدارة الأدوار والصلاحيات

- **المسار:** `auth-roles`
- **الأيقونة:** `mdi-shield-account`
- **الوظيفة:** عرض الأدوار الافتراضية (SWIFT/OPERATOR/USER) + إنشاء/تعديل/حذف أدوار مخصصة مخزنة في localStorage
- **المتطلبات:** `useLcI18n` فقط (بيانات محلية)
- **الصلاحيات المتاحة:** invoices, invoices-list, companies, backup, restore, errors, print-settings, permissions, dev-settings

### LicenseInfo.vue — معلومات الترخيص

- **المسار:** `auth-license`
- **الأيقونة:** `mdi-license`
- **الوظيفة:** عرض معلومات الترخيص (نوع + حالة + تاريخ الانتهاء + max users) + تفعيل مفتاح ترخيص جديد
- **المتطلبات:** `useLicenseStore`
- **التحذير:** banner تحذيري عند اقتراب الانتهاء (`expiringSoon`)
- **try/catch:** في `fetchLicense()`

### UserProfile.vue — الملف الشخصي

- **المسار:** `auth-profile`
- **الأيقونة:** `mdi-account-circle`
- **الوظيفة:** تعديل الاسم/الهاتف/اللغة + تغيير كلمة المرور
- **المتطلبات:** `useSettingsStore`, `getCurrentUserProfile`, `updateProfile`, `changePassword`
- **try/catch:** في `fetchProfile()`

## الـ Store (Pinia)

### useAuthStore (`fastfree-auth`)

| الحالة | النوع | الوصف |
|--------|-------|-------|
| `user` | `ref<AuthUser \| null>` | المستخدم الحالي |
| `sessionId` | `ref<string \| null>` | رقم الجلسة |
| `loading` | `ref<boolean>` | حالة التحميل |
| `error` | `ref<string \| null>` | رسالة الخطأ |

| Getter | الوصف |
|--------|-------|
| `isLoggedIn` | هل المستخدم مسجل دخول |
| `isSwift` | هل الدور SWIFT |
| `isOperator` | هل الدور OPERATOR |
| `isUser` | هل الدور USER |
| `userName` | اسم المستخدم |
| `userEmail` | إيميل المستخدم |

| Action | الوصف |
|--------|-------|
| `login(email, password)` | تسجيل الدخول |
| `fetchSession()` | جلب الجلسة |
| `logout()` | تسجيل الخروج |
| `$reset()` | إعادة تعيين |
| `destroy()` | تنظيف شامل |

### useLicenseStore (`fastfree-license`)

| الحالة | النوع |
|--------|-------|
| `license` | `ref<LicenseInfo \| null>` |
| `loading` | `ref<boolean>` |
| `error` | `ref<string \| null>` |

| Getter | الوصف |
|--------|-------|
| `isValid` | هل الترخيص صالح |
| `isTrial` | هل تجريبي |
| `isStandard` | هل قياسي |
| `isEnterprise` | هل مؤسسي |
| `isExpired` | هل منتهي |
| `expiresAt` | تاريخ الانتهاء |
| `expiringSoon` | ينتهي خلال 7 أيام |
| `maxUsers` | الحد الأقصى للمستخدمين |

| Action | الوصف |
|--------|-------|
| `init()` | تهيئة + تحميل |
| `fetchLicense()` | تحديث من السيرفر |
| `activate(key)` | تفعيل مفتاح |
| `canAccessFeature(feature)` | فحص توفر ميزة |
| `$reset()` | إعادة تعيين |
| `destroy()` | تنظيف |

### usePermissionStore (`fastfree-permissions`)

| الحالة | النوع |
|--------|-------|
| `role` | `ref<UserRole>` |
| `screens` | `ref<ScreenPermission[]>` |
| `allScreens` | `ref<ScreenPermission[]>` |

| Getter | الوصف |
|--------|-------|
| `effectiveScreens` | الشاشات الفعلية |
| `isSwift` | هل SWIFT |
| `isOperator` | هل OPERATOR |
| `isUser` | هل USER |

| Action | الوصف |
|--------|-------|
| `init(role, customScreens?)` | تهيئة |
| `canAccessScreen(screenId)` | فحص صلاحية شاشة |
| `can(action, doctype)` | فحص صلاحية إجراء |
| `updateScreens(screens)` | تحديث الشاشات |
| `$reset()` | إعادة تعيين |

### useSettingsStore (`fastfree-settings`)

| الحالة | النوع |
|--------|-------|
| `settings` | `ref<AppSettings>` |
| `loading` | `ref<boolean>` |
| `error` | `ref<string \| null>` |
| `loaded` | `ref<boolean>` |

| Getter | الوصف |
|--------|-------|
| `language` | اللغة الحالية |
| `theme` | السمة الحالية |
| `notifications` | الإشعارات مفعّلة |
| `autoSave` | الحفظ التلقائي مفعّل |

| Action | الوصف |
|--------|-------|
| `loadFromStorage()` | تحميل من Dexie |
| `fetchSettings()` | تحميل من السيرفر |
| `updateSettings(data)` | تحديث |
| `setLanguage(lang)` | تغيير اللغة |
| `setTheme(theme)` | تغيير السمة |
| `toggleNotifications()` | تبديل الإشعارات |
| `toggleAutoSave()` | تبديل الحفظ التلقائي |
| `$reset()` | إعادة تعيين |

**ملاحظة:** `watch(settings)` يحفظ تلقائياً في Dexie عند كل تغيير.

## الترجمات (i18n)

- **145 مفتاح** في كل من `AUTH_MESSAGES_EN` و `AUTH_MESSAGES_AR`
- **Namespace:** `auth.*` (يُسجّل عبر `registerMessages('auth', en, ar)`)
- **المجموعة:** `groups.authentication` — "المصادقة" / "Authentication"

### توزيع المفاتيح:

| القسم | عدد المفاتيح |
|-------|-------------|
| Screen labels | 10 |
| Common | 15 |
| Groups | 1 |
| Login | 11 |
| Users | 24 |
| Roles | 34 |
| License | 20 |
| Profile | 12 |
| **المجموع** | **145 × 2 (EN+AR)** |

## التبعيات (Dependencies)

### أساسية (dependencies)
| الباقة | الإصدار | الاستخدام |
|--------|---------|----------|
| `frappe-js-sdk` | `^1.13.0` | Frappe REST API + Auth + DB + File |
| `dexie` | `^4.0.0` | IndexedDB wrapper (Storage + Cache) |
| `socket.io-client` | `^4.0.0` | Realtime WebSocket |

### تطوير (devDependencies)
| الباقة | الإصدار |
|--------|---------|
| `@quasar/app-vite` | `^3.2.0` |
| `quasar` | `^2.22.0` |
| `vue` | `^3.5.22` |
| `pinia` | `^2.0.0` |
| `vue-router` | `^4.0.0` |
| `typescript` | `^5.0.0` |

### مشتركة (peerDependencies)
| الباقة | الإصدار | مطلوب؟ |
|--------|---------|--------|
| `vue` | `^3.4.0` | نعم |
| `pinia` | `^2.0.0` | نعم |
| `quasar` | `^2.0.0` | نعم |
| `vue-router` | `^4.0.0` | نعم |
| `@quasar/app-vite` | `^3.2.0` | نعم |
| `quasar-app-extension-fastfree-lowcode` | `workspace:^0.1.0` | نعم (غير اختياري) |

## سجل التغييرات

### 2026-08-07 — تحسينات شاملة

#### File Splitting
- `init.ts` — 474→79 سطر (83%↓)
- `locales/en.ts` — 145 مفتاح EN
- `locales/ar.ts` — 145 مفتاح AR
- `locales/index.ts` — barrel export
- `screenRegistration.ts` — تسجيل الشاشات

#### Type Safety
- `api.service.ts` — return type أُضيف email field
- `auth.service.ts` — `email: userRes.data.email` (كان `userRes.data.user`)

#### Error Handling
- `getCurrentUser()` — try/catch في setInterval

#### إصلاحات RBAC
- Edit name/email يبعت للسيرفر ( UsersManager)
- Password reset نقل لـ user.service.ts
- `updateUserRole()` يستخدم Has Role child table
- Permissions بتخزن IDs مش labels
- Batch fetch للـ roles (N+1 fixed)

#### Accessibility
- ARIA labels على كل الأزرار

#### Cleanup
- console.log اتمسحت

### 2026-08-08 — إصلاحات Error Handling

- AuthLogin — try/catch في `handleLogin()`
- LicenseInfo — try/catch في `fetchLicense()`
- UserProfile — try/catch + loading في `fetchProfile()`
