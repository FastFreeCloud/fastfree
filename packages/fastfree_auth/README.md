# @fastfree/auth

> Authentication & user management for FastFree ERP — Frappe/Auth API, login, roles, licensing.

[![npm version](https://img.shields.io/badge/npm-0.1.0-blue.svg)](https://npmjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Features](#features)
- [Install](#install)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Services](#services)
  - [Types](#types)
  - [Stores](#stores)
  - [Screens](#screens)
- [Configuration](#configuration)
- [License](#license)

## Features

- **Authentication** — Login, logout, session management via Frappe Auth API
- **User Management** — CRUD operations, profile editing, password changes
- **Role-Based Access Control (RBAC)** — SWIFT / OPERATOR / USER roles with screen & action permissions
- **License Management** — Trial, Standard, Enterprise tiers with activation & expiration checks
- **Offline Storage** — IndexedDB via Dexie.js for POS/offline-first scenarios
- **Realtime Events** — Socket.io integration for live document updates & notifications
- **Metadata Caching** — TTL-aware DocType schema caching with Dexie.js
- **System Settings** — Company-wide settings (currency, date format, warehouse defaults)
- **i18n** — 145 translation keys in English & Arabic
- **Quasar Screens** — 5 ready-to-use Vue screens (Login, Users, Roles, License, Profile)

## Install

```bash
# npm
npm install fastfree-auth

# pnpm
pnpm add fastfree-auth

# yarn
yarn add fastfree-auth
```

### Peer Dependencies

| Package | Version |
|---------|---------|
| `vue` | `^3.4.0` |
| `pinia` | `^2.0.0` |
| `quasar` | `^2.0.0` |
| `vue-router` | `^4.0.0` |
| `@quasar/app-vite` | `^3.2.0` |
| `quasar-app-extension-fastfree-lowcode` | `workspace:^0.1.0` |

## Quick Start

### 1. Initialize the Auth Package

```ts
// src/boot/auth.ts (Quasar Boot File)
import { boot } from 'quasar/wrappers'
import { initFastFreeAuth } from 'fastfree-auth'

export default boot(async ({ app }) => {
  await initFastFreeAuth({
    baseUrl: 'https://your-frappe-instance.com',
    app,
    storagePrefix: 'fastfree',
  })
})
```

### 2. Use the Auth Store

```vue
<template>
  <div>
    <q-btn v-if="!authStore.isLoggedIn" label="Login" @click="showLogin = true" />
    <div v-else>
      <p>Welcome, {{ authStore.userName }}</p>
      <q-btn label="Logout" @click="handleLogout" />
    </div>

    <!-- Login Dialog -->
    <q-dialog v-model="showLogin">
      <AuthLogin @success="showLogin = false" />
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore, AuthLogin } from 'fastfree-auth'

const authStore = useAuthStore()
const showLogin = ref(false)

async function handleLogout() {
  await authStore.logout()
}
</script>
```

### 3. Use Services Directly

```ts
import {
  initApiService,
  authLogin,
  listUsers,
  initPermissions,
  canAccessScreen,
} from 'fastfree-auth'

// Initialize API
initApiService('https://your-frappe-instance.com')

// Login
const result = await authLogin('user@example.com', 'password')
if (result.success) {
  console.log('Logged in as:', result.data?.user.name)
}

// Check screen access
const permResult = canAccessScreen('invoices')
if (!permResult) {
  // Redirect to unauthorized page
}

// List all users
const users = await listUsers()
if (users.success) {
  console.log('Users:', users.data)
}
```

### 4. Use License Store

```vue
<template>
  <q-banner v-if="licenseStore.expiringSoon" type="warning">
    License expires in {{ daysLeft }} days.
    <q-btn flat label="Activate" @click="showActivate = true" />
  </q-banner>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLicenseStore } from 'fastfree-auth'

const licenseStore = useLicenseStore()

const daysLeft = computed(() => {
  if (!licenseStore.expiresAt) return 0
  return Math.ceil((licenseStore.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
})
</script>
```

## API Reference

### Services

#### Authentication

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `login(email, password)` | `string, string` | `Promise<ApiResponse<SessionData>>` | Login + create session + fetch role |
| `getSession()` | — | `Promise<ApiResponse<SessionData>>` | Fetch session from server |
| `logout()` | — | `Promise<ApiResponse<void>>` | Logout + clear session |
| `getCurrentSession()` | — | `SessionData \| null` | Return cached session |
| `isLoggedIn()` | — | `boolean` | Check if user is logged in |
| `refreshSession()` | — | `Promise<ApiResponse<SessionData>>` | Refresh session |
| `destroyAuthService()` | — | `void` | Full cleanup |

#### API (Frappe SDK Wrapper)

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `initApiService(baseUrl)` | `string` | `void` | Initialize FrappeApp + auth/db/call/file |
| `getDoc<T>(doctype, name)` | `string, string` | `Promise<ApiResponse<T>>` | Fetch document |
| `getDocList<T>(doctype, filters?, fields?, orderBy?, limit?)` | `string, ...` | `Promise<ApiResponse<T[]>>` | Fetch document list |
| `createDoc<T>(doctype, data)` | `string, Record` | `Promise<ApiResponse<T>>` | Create document |
| `updateDoc<T>(doctype, name, data)` | `string, string, Record` | `Promise<ApiResponse<T>>` | Update document |
| `deleteDoc(doctype, name)` | `string, string` | `Promise<ApiResponse<void>>` | Delete document |
| `callGet<T>(method, params?)` | `string, Record?` | `Promise<ApiResponse<T>>` | Call whitelisted API (GET) |
| `callPost<T>(method, params?)` | `string, Record?` | `Promise<ApiResponse<T>>` | Call whitelisted API (POST) |

#### User Management

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getCurrentUserProfile()` | — | `Promise<ApiResponse>` | Fetch current user profile |
| `updateProfile(data)` | `Partial<Pick<UserProfile, 'name'\|'phone'\|'avatar'>>` | `Promise<ApiResponse>` | Update name/phone/avatar |
| `changePassword(current, new)` | `string, string` | `Promise<ApiResponse>` | Change password |
| `listUsers()` | — | `Promise<ApiResponse>` | List all users + roles (batch fetch) |
| `createUser(data)` | `{ email, name, role, password? }` | `Promise<ApiResponse>` | Create new user |
| `updateUserRole(userId, role)` | `string, string` | `Promise<ApiResponse>` | Update role via Has Role child table |
| `deleteUser(userId)` | `string` | `Promise<ApiResponse>` | Delete user |
| `resetPassword(userName, new)` | `string, string` | `Promise<ApiResponse>` | Reset password (Admin) |

#### License

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `initLicenseService()` | — | `void` | Init + fetch + start periodic check |
| `getLicenseInfo()` | — | `LicenseInfo \| null` | Return current license info |
| `isLicenseValid()` | — | `boolean` | Check if license is active + not expired |
| `isFeatureAvailable(feature)` | `string` | `boolean` | Check if feature is available (trial limited) |
| `canAddUser()` | — | `boolean` | Check if user limit allows new user |
| `activateLicense(key)` | `string` | `Promise<ApiResponse>` | Activate license key |
| `isExpiringSoon()` | — | `boolean` | Check if expiring within 7 days |

#### Permissions (RBAC)

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `initPermissions(role, customScreens?)` | `UserRole, string[]?` | `void` | Initialize permissions |
| `getUserRole()` | — | `UserRole` | Return current role |
| `canAccessScreen(screenId)` | `string` | `boolean` | Check screen access |
| `can(action, doctype)` | `string, string` | `boolean` | Check action on doctype |
| `getAllScreens()` | — | `ScreenPermission[]` | Return all available screens |
| `getUserScreens()` | — | `ScreenPermission[]` | Return user's actual screens |
| `setUserScreens(screens)` | `string[] \| null` | `void` | Set custom screens (Admin) |

**Default Screen Access:**

| Role | Screens |
|------|---------|
| `SWIFT` | All screens (invoices, invoices-list, companies, backup, errors, print-settings, permissions, dev-settings) |
| `OPERATOR` | invoices, invoices-list, companies, backup, errors, print-settings |
| `USER` | invoices, invoices-list, companies, errors |

#### File Operations

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `uploadFile(doctype, docname, file, fieldName?)` | `string, string, File, string?` | `Promise<ApiResponse>` | Upload file |
| `getFileUrl(fileUrl)` | `string` | `string` | Return file URL |
| `downloadFile(fileUrl)` | `string` | `Promise<Blob>` | Download file as Blob |
| `deleteFile(fileName)` | `string` | `Promise<ApiResponse>` | Delete file |

#### Offline Storage (Dexie.js)

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `initStorage(config?)` | `FastFreeStorageConfig?` | `void` | Initialize IndexedDB |
| `getStorageSetting<T>(key)` | `string` | `Promise<T \| undefined>` | Fetch setting by key |
| `setStorageSetting(key, value)` | `string, unknown` | `Promise<void>` | Save setting |
| `getStorageDocument<T>(id)` | `string` | `Promise<T \| undefined>` | Fetch document by ID |
| `setStorageDocument(id, doctype, data)` | `string, string, Record` | `Promise<void>` | Save document |
| `addToSyncQueue(item)` | `SyncQueueItem` | `Promise<number>` | Add to sync queue |
| `getSyncQueue()` | — | `Promise<SyncQueueItem[]>` | Fetch unsynced items |

#### Realtime (Socket.io)

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `initRealtime(config)` | `RealtimeConfig` | `void` | Create Socket.io connection |
| `onRealtimeEvent(event, callback)` | `RealtimeEvent, EventCallback` | `void` | Listen to event |
| `offRealtimeEvent(event, callback?)` | `RealtimeEvent, EventCallback?` | `void` | Stop listening |
| `emitRealtimeEvent(event, data?)` | `string, unknown?` | `void` | Emit event |

#### Cache (Dexie.js)

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getCached<T>(key)` | `string` | `T \| null` | Fetch from cache (TTL-aware) |
| `setCached(key, data, ttlMs?)` | `string, unknown, number?` | `void` | Save to cache |
| `getOrFetch<T>(key, fetcher, ttlMs?)` | `string, Function, number?` | `Promise<T>` | Fetch from cache or server |
| `cacheDocType(doctype)` | `string` | `Promise<void>` | Cache DocType schema (1hr TTL) |

#### Settings

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getSystemSettings()` | — | `Promise<SystemSettings>` | Fetch system settings |
| `updateSystemSettings(data)` | `Partial<SystemSettings>` | `Promise<void>` | Update system settings |
| `getSetting<T>(key)` | `string` | `T \| undefined` | Fetch specific setting |

### Types

| Interface | Fields | Description |
|-----------|--------|-------------|
| `AuthUser` | `id: string`, `name: string`, `email: string`, `role: UserRole`, `avatar?: string`, `permissions?: string[]` | Core user data |
| `UserRole` | `'SWIFT' \| 'OPERATOR' \| 'USER'` | Role type alias |
| `SessionData` | `user: AuthUser`, `sessionId: string`, `expiresAt: number` | Session data |
| `PermissionCheck` | `action: string`, `doctype: string` | Permission check payload |
| `ScreenPermission` | `id: string`, `label: string`, `icon: string` | Screen permission |
| `LicenseInfo` | `key`, `type`, `status`, `expiresAt`, `maxUsers`, `maxDevices`, `activatedDevices` | License info |
| `ApiResponse<T>` | `success: boolean`, `data?: T`, `error?: { code, message, details? }` | Standard API response |
| `PaginatedResponse<T>` | `data: T[]`, `total: number`, `page: number`, `limit: number` | Paginated response |
| `AppSettings` | `language: string`, `theme: string`, `notifications: boolean`, `autoSave: boolean` | User settings |
| `FastFreeAuthConfig` | `baseUrl: string`, `app?: App`, `storagePrefix?: string` | Package config |

### Stores

#### useAuthStore (`fastfree-auth`)

| State | Type | Description |
|-------|------|-------------|
| `user` | `ref<AuthUser \| null>` | Current user |
| `sessionId` | `ref<string \| null>` | Session ID |
| `loading` | `ref<boolean>` | Loading state |
| `error` | `ref<string \| null>` | Error message |

| Getter | Description |
|--------|-------------|
| `isLoggedIn` | Is user logged in |
| `isSwift` | Is role SWIFT |
| `isOperator` | Is role OPERATOR |
| `isUser` | Is role USER |
| `userName` | User name |
| `userEmail` | User email |

| Action | Description |
|--------|-------------|
| `login(email, password)` | Login |
| `fetchSession()` | Fetch session |
| `logout()` | Logout |
| `destroy()` | Full cleanup |

#### useLicenseStore (`fastfree-license`)

| Getter | Description |
|--------|-------------|
| `isValid` | Is license valid |
| `isTrial` | Is trial |
| `isStandard` | Is standard |
| `isEnterprise` | Is enterprise |
| `isExpired` | Is expired |
| `expiresAt` | Expiration date |
| `expiringSoon` | Expiring within 7 days |
| `maxUsers` | Max user limit |

| Action | Description |
|--------|-------------|
| `init()` | Initialize + load |
| `fetchLicense()` | Refresh from server |
| `activate(key)` | Activate license key |
| `canAccessFeature(feature)` | Check feature availability |

#### usePermissionStore (`fastfree-permissions`)

| Action | Description |
|--------|-------------|
| `init(role, customScreens?)` | Initialize |
| `canAccessScreen(screenId)` | Check screen access |
| `can(action, doctype)` | Check action permission |
| `updateScreens(screens)` | Update screens |

#### useSettingsStore (`fastfree-settings`)

| Action | Description |
|--------|-------------|
| `loadFromStorage()` | Load from Dexie |
| `fetchSettings()` | Load from server |
| `updateSettings(data)` | Update |
| `setLanguage(lang)` | Change language |
| `setTheme(theme)` | Change theme |
| `toggleNotifications()` | Toggle notifications |
| `toggleAutoSave()` | Toggle auto-save |

### Screens

| Screen | Route | Icon | Description |
|--------|-------|------|-------------|
| `AuthLogin.vue` | `auth-login` | `mdi-login` | Login form (email + password) with server URL dialog |
| `UsersManager.vue` | `auth-users` | `mdi-account-group` | Full CRUD — list, add, edit, delete users, reset password |
| `RolesManager.vue` | `auth-roles` | `mdi-shield-account` | View default roles + create/edit/delete custom roles |
| `LicenseInfo.vue` | `auth-license` | `mdi-license` | Display license info + activate new key |
| `UserProfile.vue` | `auth-profile` | `mdi-account-circle` | Edit name/phone/language + change password |

## Configuration

### FastFreeAuthConfig

```ts
interface FastFreeAuthConfig {
  baseUrl: string      // Frappe instance URL (required)
  app?: VueApp         // Vue app instance (optional, for boot integration)
  storagePrefix?: string  // IndexedDB prefix (default: 'fastfree')
}
```

### Default Settings

```ts
const DEFAULT_SETTINGS: AppSettings = {
  language: 'ar',
  theme: 'light',
  notifications: true,
  autoSave: true,
}
```

### Role Mapping

| Frappe Roles | FastFree Role |
|--------------|---------------|
| `System Manager`, `Administrator` | `SWIFT` |
| `Operator` | `OPERATOR` |
| *(everything else)* | `USER` |

### Boot Order

```
fastfree-auth-init        →  API client + auth initialized
fastfree-accounting-init  →  Accounting groups + screens registered
fastfree-inventory-init  →  Inventory groups + screens registered
fastfree-sales-init      →  Sales groups + screens registered
fastfree-purchase-init   →  Purchase groups + screens registered
fastfree-hr-init         →  HR groups + screens registered
fastfree-crm-init        →  CRM groups + screens registered
i18n                     →  Translations loaded AFTER all packages
register-service-worker  →  PWA registration (last)
```

### Exports

```ts
// Main entry
import { initFastFreeAuth, login, useAuthStore } from 'fastfree-auth'

// Sub-module imports (tree-shakeable)
import { login } from 'fastfree-auth/services'
import { useAuthStore } from 'fastfree-auth/stores'
import { AuthLogin } from 'fastfree-auth/screens'
import { AuthUser } from 'fastfree-auth/types'
```

## License

MIT License — see [LICENSE](./LICENSE) for details.
