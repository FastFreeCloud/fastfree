# @fastfree/lowcode

> Low-code engine for Quasar — Window Manager, CRUD Table, Dynamic Form, and more.

[![npm version](https://img.shields.io/npm/v/quasar-app-extension-fastfree-lowcode.svg)](https://npmjs.com/package/quasar-app-extension-fastfree-lowcode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A complete low-code framework for [Quasar](https://quasar.dev) that provides a desktop-style window manager, dynamic CRUD tables, dynamic forms, a full i18n system (EN + AR), theme management, and centralized error logging — all auto-registered via a single boot file.

## Table of Contents

- [Features](#features)
- [Install](#install)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Components](#components)
- [Composables](#composables)
- [Utils](#utils)
- [Boot Modules](#boot-modules)
- [Configuration](#configuration)
- [Theming](#theming)
- [i18n](#i18n)
- [Types](#types)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Window Manager** — Desktop-style windowing system with drag, resize, minimize, maximize, z-order, and bounds persistence
- **CRUD Table** — Server-side paginated table (`DynamicTable`) with search, sort, column settings, Excel export, and print
- **Dynamic Form** — Form generation from field definitions with validation support
- **i18n (EN + AR)** — 393 translation keys with runtime locale switching and per-locale overrides
- **Theme Manager** — 10 built-in presets, custom colors, system dark mode detection, and CSS variable injection
- **Error Log** — Centralized error collector with 7 monitoring sources (Vue, Promise, Browser, Network, Performance, Memory)
- **Saudi Validators** — IBAN, National ID, Commercial Registration, VAT, Arabic text validation
- **Screen Registry** — Dynamic component registration with lazy loading and RBAC access control

## Install

```bash
# Using pnpm (recommended)
pnpm add quasar-app-extension-fastfree-lowcode

# Using npm
npm install quasar-app-extension-fastfree-lowcode
```

### Peer Dependencies

| Package | Version | Required |
|---------|---------|----------|
| `vue` | `>=3.4.0` | Yes |
| `quasar` | `>=2.0.0` | Yes |
| `@quasar/app-vite` | `>=3.2.0` | Yes |
| `pinia` | `>=2.0.0` | Optional |
| `vue-router` | `>=4.0.0` | Optional |

## Quick Start

```bash
quasar ext add fastfree-lowcode
```

The extension auto-registers all components, composables, and boot files. Start using them immediately:

```vue
<template>
  <DesktopShell />
</template>

<script setup lang="ts">
import { DesktopShell } from 'quasar-app-extension-fastfree-lowcode/runtime'
</script>
```

Or use individual components:

```vue
<template>
  <DynamicTable
    :columns="columns"
    fetch-url="/api/users"
    title="Users"
    icon="people"
    @edit="onEdit"
    @delete="onDelete"
  />
</template>

<script setup lang="ts">
import { DynamicTable } from 'quasar-app-extension-fastfree-lowcode/runtime'

const columns = [
  { name: 'id', label: 'ID', field: 'id', sortable: true },
  { name: 'name', label: 'Name', field: 'name', sortable: true },
  { name: 'email', label: 'Email', field: 'email', sortable: true },
]

function onEdit(row: Record<string, unknown>) { /* ... */ }
function onDelete(row: Record<string, unknown>) { /* ... */ }
</script>
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    quasar.config.ts                      │
│                  (lowcode configuration)                 │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Boot: boot.register.ts                      │
│   ┌──────────┬──────────┬──────────┬──────────────────┐ │
│   │  axios   │  error   │capacitor │  fontsource      │ │
│   │  client  │ handler  │  native  │  cairo font      │ │
│   └──────────┴──────────┴──────────┴──────────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Components  │  │  Composables │  │    Utils     │
│              │  │              │  │              │
│ DesktopShell │  │ useDesktop   │  │ VALIDATORS   │
│ DynamicTable │  │ useGroups    │  │ formatters   │
│ DynamicForm  │  │ useTheme     │  │ saudi-       │
│ WindowPanel  │  │ useCrud      │  │  validators  │
│ Dock, etc.   │  │ useI18n, etc │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 Pinia Stores (4 stores)                 │
│  ┌──────────┬──────────┬──────────┬──────────────────┐  │
│  │ desktop  │ lc-groups│ lc-i18n  │ lc-theme         │  │
│  └──────────┴──────────┴──────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Components

### Desktop Shell

| Component | Description |
|-----------|-------------|
| `DesktopShell` | Main layout — window manager + dock + header |
| `DesktopHeader` | Header with customizable gradient background |
| `DesktopDock` | macOS-style taskbar with touch support, RTL, context menu |
| `WindowPanel` | Window with drag, resize, favorite, minimize/maximize |
| `GroupWorkspace` | Workspace with app grid, search, pinned pages, keyboard nav |

### Screens

| Component | Description |
|-----------|-------------|
| `LcSplashScreen` | Splash screen with gradient, progress bar, animation |
| `LcSettingsScreen` | Settings — theme mode, language, presets, colors, export/import |
| `LcThemeScreen` | Theme customization screen |
| `LcShortcutsScreen` | Keyboard shortcuts editor with search and categories |
| `LcErrorLogScreen` | Error log viewer with filtering, export, and clear |
| `LcAboutScreen` | System info — browser, OS, screen, date |
| `LcConnectionScreen` | Network connection status screen |
| `LcTranslationEditorScreen` | Runtime translation editor for all languages |
| `LcPwaUpdateScreen` | PWA update management screen |

### Base Components

| Component | Description |
|-----------|-------------|
| `DynamicTable` | Server-side paginated table with search, sort, export, print, aggregates |
| `DynamicForm` | Dynamic form generation from field definitions with validation |
| `FilterToolbar` | Multi-column filter with column visibility toggle |
| `PaginationBar` | Pagination with rows-per-page selector |
| `EmptyState` | Empty data placeholder with optional action button |
| `AddRowButton` | Add row action button for tables |

### Utility Components

| Component | Description |
|-----------|-------------|
| `LcHeaderActions` | Theme toggle, live clock, Hijri date display |
| `LcPageHeader` | Reusable page header |
| `LcSmartFilter` | Smart filter with advanced options |
| `LcSmartPagination` | Smart pagination with responsive layout |
| `LcStructureInspector` | App structure inspector |
| `WindowSwitcherBar` | Window switcher bar |
| `PiniaPersistenceInfo` | Pinia persistence info display |
| `PiniaStateDebugger` | Pinia state debugger |
| `PiniaStateTreeView` | Pinia state tree viewer |

## Composables

### State Management

| Composable | Description | Persistence |
|------------|-------------|-------------|
| `useDesktopStore` / `createDesktopStore` | Window CRUD + Z-order + bounds cache | localStorage |
| `useGroupsStore` | Groups CRUD + pages + favorites + pin | localStorage |
| `useLcI18nStore` | i18n locale + overrides + namespace registration | localStorage |
| `useThemeStore` / `getThemeStore` | 10 presets + custom colors + system detection | localStorage |
| `useErrorLogStore` | Error entries + stats + export (max 500) | — |
| `useCrudStore` | Generic CRUD factory with optimistic updates | — |

```ts
// Example: Open a window
import { useDesktopStore } from 'quasar-app-extension-fastfree-lowcode/runtime'

const desktop = useDesktopStore()
desktop.openWindow('settings', 'Settings', 'mdi-cog', 900, 550)
desktop.toggleMinimize('settings')
desktop.closeWindow('settings')
```

```ts
// Example: Generic CRUD store
import { useCrudStore } from 'quasar-app-extension-fastfree-lowcode/runtime'

const users = useCrudStore<{ id: number; name: string; email: string }>({
  name: 'users',
  endpoint: '/api/users',
})

await users.fetchItems({ page: 1, limit: 25, search: 'john' })
await users.createItem({ name: 'John', email: 'john@example.com' })
await users.updateItem(1, { name: 'John Doe' })
await users.deleteItem(1)
```

### Screen Registry

| Function | Description |
|----------|-------------|
| `registerScreen` | Register a single screen component |
| `registerScreens` | Register multiple screens at once |
| `getScreenComponent` | Get a registered component by type |
| `hasScreen` | Check if a screen type is registered |
| `unregisterScreen` | Remove a screen from the registry |
| `clearScreenRegistry` | Remove all registered screens |
| `registerBuiltinScreens` | Register all built-in screens |

```ts
import { registerScreen } from 'quasar-app-extension-fastfree-lowcode/runtime'

registerScreen({
  type: 'users',
  component: () => import('./screens/UserList.vue'),
  icon: 'people',
  label: 'Users',
  defaultWidth: 1000,
  defaultHeight: 600,
})
```

### UI Helpers

| Composable | Description |
|------------|-------------|
| `useColumnSettings` | Persistent column order, visibility, and widths |
| `useInlineEdit` | Inline editing with auto-save, validation, keyboard nav |
| `useContainerWidth` | Responsive container width with breakpoints |
| `useNotify` | Notification helpers (saved, error, warning, info, create) |
| `useConfirmDialog` | Confirmation dialogs for delete and custom actions |
| `usePrint` | HTML table print generation with branding |
| `useExcelExport` | ExcelJS integration with styled headers |
| `useDateTime` | Gregorian + Hijri (umalqura) date utilities |
| `useScreenAccess` | RBAC + static/reactive/custom access filtering |
| `useFormatNumber` | Locale-aware number/currency/percent formatting |
| `useStatusHelpers` | Status translation + color mapping |
| `useKeyboardShortcuts` | Configurable shortcuts with persistence |
| `useSplashCoordinator` | Loading/transition/ready phase management |

```ts
// Example: Excel export
import { useExcelExport } from 'quasar-app-extension-fastfree-lowcode/runtime'

const { exportToExcel } = useExcelExport()

await exportToExcel({
  columns: [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Name', key: 'name', width: 30 },
  ],
  data: rows,
  fileName: 'users-export.xlsx',
  company: { name: 'My Company', logo: '/logo.png' },
})
```

```ts
// Example: Number formatting
import { useFormatNumber } from 'quasar-app-extension-fastfree-lowcode/runtime'

const { formatNumber, formatCurrency, formatPercent } = useFormatNumber()

formatNumber(1234567.89)          // "1,234,567.89"
formatCurrency(1234.5, 'USD')    // "$1,234.50"
formatPercent(0.85)              // "85.0%"
```

### Theme

| Composable | Description |
|------------|-------------|
| `useThemeStore` | Full theme store with 10 presets + custom colors |
| `useThemeToggle` | Dark/light mode toggle |
| `useThemeManager` | Wrapper for useThemeStore |
| `useThemeStorage` | Dexie IndexedDB persistence |

### Debug

| Composable | Description |
|------------|-------------|
| `piniaDebugPlugin` | Pinia plugin with action tracing and error reporting |

## Utils

### VALIDATORS

Reusable validation functions that return Quasar-compatible rule functions.

```ts
import { VALIDATORS } from 'quasar-app-extension-fastfree-lowcode/runtime'

const fields = [
  { name: 'email', rules: [VALIDATORS.required(), VALIDATORS.email()] },
  { name: 'phone', rules: [VALIDATORS.phone()] },
  { name: 'age', rules: [VALIDATORS.numeric(), VALIDATORS.min(0), VALIDATORS.max(150)] },
  { name: 'url', rules: [VALIDATORS.url()] },
  { name: 'password', rules: [VALIDATORS.minLength(8), VALIDATORS.maxLength(64)] },
  { name: 'code', rules: [VALIDATORS.pattern(/^[A-Z]{3}$/)] },
]
```

| Validator | Signature | Description |
|-----------|-----------|-------------|
| `required` | `(message?: string) => Rule` | Non-empty value |
| `email` | `(message?: string) => Rule` | Valid email format |
| `minLength` | `(min: number, message?: string) => Rule` | Minimum string length |
| `maxLength` | `(max: number, message?: string) => Rule` | Maximum string length |
| `phone` | `(message?: string) => Rule` | Phone number (7–15 digits) |
| `numeric` | `(message?: string) => Rule` | Numeric string or number |
| `min` | `(min: number, message?: string) => Rule` | Minimum numeric value |
| `max` | `(max: number, message?: string) => Rule` | Maximum numeric value |
| `pattern` | `(re: RegExp, message?: string) => Rule` | Custom regex match |
| `url` | `(message?: string) => Rule` | Valid URL format |

### Saudi Validators

| Validator | Signature | Description |
|-----------|-----------|-------------|
| `useSaudiValidators().required` | `(message?) => Rule` | Non-empty (AR) |
| `useSaudiValidators().phone` | `(message?) => Rule` | Saudi phone number |
| `useSaudiValidators().nationalId` | `(message?) => Rule` | Saudi National ID (10 digits) |
| `useSaudiValidators().commercialRegistration` | `(message?) => Rule` | Saudi CR number |
| `useSaudiValidators().vatNumber` | `(message?) => Rule` | Saudi VAT number |
| `useSaudiValidators().email` | `(message?) => Rule` | Email address |
| `useSaudiValidators().iban` | `(message?) => Rule` | Saudi IBAN |
| `useSaudiValidators().arabicText` | `(message?) => Rule` | Arabic text only |

### formatters

Locale-aware formatting utilities using `Intl`.

```ts
import { formatters } from 'quasar-app-extension-fastfree-lowcode/runtime'

formatters.number(1234567.89)                          // "1,234,567.89"
formatters.number(1234567.89, { locale: 'ar' })       // "١٬٢٣٤٬٥٦٧٫٨٩"
formatters.currency(1234.5, 'USD')                     // "$1,234.50"
formatters.currency(1234.5, 'EUR', { locale: 'de' })  // "1.234,50 €"
formatters.date('2026-07-24')                          // "7/24/2026"
formatters.dateTime('2026-07-24T10:30:00')             // "7/24/2026, 10:30:00 AM"
formatters.percent(0.85)                               // "85.0%"
formatters.fileSize(1536)                              // "1.5 KB"
formatters.fileSize(1073741824)                        // "1.0 GB"
```

## Boot Modules

| Module | Description |
|--------|-------------|
| `createApiClient` | Fetch-based API client with error handling, timeout, and i18n-aware messages |
| `errorHandler` | 7-source error monitor — Vue, Promise, Browser, Network, Performance (LCP/CLS), Memory |
| `hideNativeSplash` | Capacitor native splash screen + status bar management |

```ts
import { createApiClient } from 'quasar-app-extension-free-lowcode/runtime'

const api = createApiClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  headers: { Authorization: 'Bearer token123' },
})

const users = await api.get('/users')
const created = await api.post('/users', { name: 'John' })
await api.put('/users/1', { name: 'John Doe' })
await api.delete('/users/1')
```

**Error handling:** Automatically maps HTTP status codes to localized messages (401 → session expired, 403 → no permission, 404 → not found, 500 → server error, timeout, offline).

## Configuration

Override defaults via `quasar.config.ts`:

```ts
// quasar.config.ts
import { defineConfig } from '@quasar/app-vite'

export default defineConfig({
  framework: {
    config: {
      lowcode: {
        locale: 'ar',
        theme: {
          primary: '#1976D2',
        },
        messages: {
          search: 'بحث...',
          noData: 'لا توجد بيانات',
          total: 'المجموع',
        },
        api: {
          baseUrl: '/api',
          timeout: 15000,
        },
        desktop: {
          storeId: 'my-desktop',
          headerHeight: 60,
          dockHeight: 80,
          defaultWidth: 900,
          defaultHeight: 550,
        },
        error: {
          throttleMs: 60000,
          notificationTimeout: 8000,
          notificationPosition: 'top',
        },
      },
    },
  },
})
```

### Config Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `locale` | `string` | `'en'` | Locale for formatting and i18n |
| `theme` | `Record<string, string>` | `{}` | CSS custom property overrides |
| `messages` | `Partial<LcMessages>` | `{}` | Override any of the 393 translation keys |
| `api.baseUrl` | `string` | `'/api'` | Base URL for the API client |
| `api.timeout` | `number` | `10000` | Request timeout in milliseconds |
| `desktop.storeId` | `string` | `'desktop'` | Pinia store ID for the desktop store |
| `desktop.headerHeight` | `number` | `56` | Header height in pixels |
| `desktop.dockHeight` | `number` | `77` | Dock height in pixels |
| `desktop.defaultWidth` | `number` | `900` | Default window width |
| `desktop.defaultHeight` | `number` | `550` | Default window height |
| `desktop.dockPosition` | `'bottom' \| 'top'` | `'bottom'` | Dock position |
| `desktop.dockStyle` | `'glass' \| 'solid'` | `'glass'` | Dock visual style |
| `error.throttleMs` | `number` | `60000` | Error notification throttle |
| `error.notificationTimeout` | `number` | `5000` | Notification auto-dismiss |
| `splash.mode` | `string` | `'auto'` | Splash screen mode |
| `splash.delay` | `number` | `1500` | Splash delay in ms |
| `capacitor.enabled` | `boolean` | `false` | Enable Capacitor support |
| `pwa.enabled` | `boolean` | `false` | Enable PWA support |
| `font.cairo` | `boolean` | `true` | Load Cairo variable font |

## Theming

Override CSS custom properties in your global CSS:

```css
:root {
  --lc-primary: #6200EE;
  --lc-primary-dark: #3700B3;
  --lc-surface: #1E1E2E;
  --lc-on-surface: #E0E0E0;
  --lc-surface-variant: #2A2A3C;
  --lc-radius-lg: 16px;
}
```

### Design Tokens

| Token | Default | Description |
|-------|---------|-------------|
| `--lc-bg-primary` | `#f0f2f5` | Page background |
| `--lc-surface` | `#ffffff` | Card/surface background |
| `--lc-surface-variant` | `#f8f9fa` | Alternate surface |
| `--lc-on-surface` | `#1a1a2e` | Text on surface |
| `--lc-on-surface-variant` | `#6b7280` | Muted text |
| `--lc-outline-variant` | `#e5e7eb` | Border color |
| `--lc-primary` | `#1565C0` | Primary color |
| `--lc-primary-dark` | `#0D47A1` | Primary dark |
| `--lc-on-primary` | `#ffffff` | Text on primary |
| `--lc-accent` | `#7E57C2` | Accent color |
| `--lc-positive` | `#21BA45` | Success color |
| `--lc-negative` | `#C10015` | Error/danger color |
| `--lc-warning` | `#F2C037` | Warning color |
| `--lc-info` | `#31CCEC` | Info color |
| `--lc-header-height` | `56px` | Header height |
| `--lc-dock-height` | `70px` | Dock height |
| `--lc-font-size-sm` | `12px` | Small font size |
| `--lc-font-size-base` | `14px` | Base font size |
| `--lc-font-size-lg` | `16px` | Large font size |
| `--lc-radius-sm` | `6px` | Small border radius |
| `--lc-radius-md` | `10px` | Medium border radius |
| `--lc-radius-lg` | `12px` | Large border radius |

## i18n

393 translation keys in EN + AR with runtime switching and per-locale overrides.

```ts
import { useLcI18n } from 'quasar-app-extension-free-lowcode/runtime'

const { t } = useLcI18n()

t('common.search')       // "Search..." (or locale override)
t('common.noData')       // "No data"
t('error.sessionExpired') // "Session expired, please login again"
```

### Message Categories

| Category | Keys | Description |
|----------|------|-------------|
| `common.*` | 52 | General UI labels |
| `validation.*` | 11 | Form validation messages |
| `error.*` | 12 | API and network errors |
| `system.*` | 11 | System-level errors |
| `errorLog.*` | 16 | Error log screen |
| `about.*` | 11 | About screen |
| `settings.*` | 36 | Settings screen |
| `shortcuts.*` | 19 | Keyboard shortcuts |
| `groups.*` | 13 | Group workspace |
| `screens.*` | 14 | Screen labels |
| `inspector.*` | 57 | Structure inspector |
| `translationEditor.*` | 24 | Translation editor |
| `pwa.*` | 32 | PWA management |
| `debugger.*` | 53 | Pinia debugger |
| `export.*` | 7 | Export utilities |
| `print.*` | 4 | Print utilities |

Override any message in the config:

```ts
framework: {
  config: {
    lowcode: {
      locale: 'ar',
      messages: {
        'common.search': 'بحث...',
        'common.noData': 'لا توجد بيانات',
        'common.total': 'المجموع',
      },
    },
  },
},
```

## Types

All TypeScript types are exported for type-safe usage:

```ts
import type {
  // Configuration
  LcConfig,
  LcFullConfig,
  LcMessages,
  LcDesktopConfig,
  LcApiConfig,
  LcErrorConfig,
  LcSplashConfig,
  LcCapacitorConfig,
  LcPwaConfig,
  LcFontConfig,
  ScreenConfig,

  // Window Manager
  WindowInfo,
  DesktopStoreOptions,
  DockItem,

  // Table & Columns
  ColumnDef,
  ColumnSettingsOptions,
  ColumnDefaults,

  // CRUD
  CrudStoreOptions,

  // Inline Edit
  EditableRow,
  InlineEditOptions,

  // Screen Registry
  ScreenRegistration,

  // Groups
  GroupPage,
  Group,

  // Theme
  BrandColors,
  ThemePreset,
  ThemeConfig,

  // Print & Export
  PrintCompany,
  PrintColumn,
  PrintTableOptions,
  ExcelCompany,
  ExcelColumn,
  ExcelExportOptions,

  // Date & Time
  DateTimeInfo,

  // Access Control
  ScreenAccessOptions,
  ScreenAccessReturn,

  // Debug
  PiniaDebugOptions,

  // Error Log
  LogEntry,
  ErrorStats,

  // Splash
  SplashCoordinator,
} from 'quasar-app-extension-free-lowcode/runtime'
```

## Contributing

```bash
# TypeCheck
cd apps/fastfree_ledger && pnpm vue-tsc --noEmit

# Lint Check
cd apps/fastfree_ledger && pnpm eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"

# Dev Server
cd apps/fastfree_ledger && pnpm dev
```

## License

MIT — see [LICENSE](./LICENSE) for details.
