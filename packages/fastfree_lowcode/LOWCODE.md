# fastfree-lowcode

> Quasar App Extension for low-code UI engine — window manager, CRUD tables, dynamic forms, desktop shell, theming, i18n

**Version:** 0.1.0 | **License:** MIT | **Engine:** Node.js >= 18

---

## Installation

```bash
quasar ext add fastfree-lowcode
```

### What the extension auto-configures

1. Adds boot file: `boot.register.ts`
2. Adds CSS: `lowcode.scss`
3. Adds icon extras: `material-icons`, `mdi-v7`
4. Adds Quasar plugins: `Notify`, `Dialog`, `Loading`

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Desktop Shell                  │
│         (fastfree_lowcode runtime)          │
│                                             │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │ Screen       │  │ Groups Store       │   │
│  │ Registry     │  │ (dock navigation)  │   │
│  └──────────────┘  └────────────────────┘   │
│                                             │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │ Desktop      │  │ i18n Store         │   │
│  │ Store        │  │ (translations)     │   │
│  │ (windows)    │  │                    │   │
│  └──────────────┘  └────────────────────┘   │
│                                             │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │ Theme Store  │  │ Config System      │   │
│  │ (dark/light) │  │ (mergeConfig)      │   │
│  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Core APIs

### Screen Registry

```ts
import { registerScreen, getScreenComponent } from 'quasar-app-extension-fastfree-lowcode/src/runtime'

// Register a screen component
registerScreen('my-screen', {
  component: MyScreen,        // Vue component
  label: 'screens.myScreen', // i18n key
  icon: 'mdi-star',          // Material icon
  groupId: 'system',         // Parent group
})

// Get a registered component
const component = getScreenComponent('my-screen')
```

**All methods:**

| Method | Description |
|--------|-------------|
| `registerScreen(type, registration)` | Register a single screen |
| `registerScreens(entries)` | Register multiple screens |
| `getScreenComponent(type)` | Get Vue component by type |
| `getScreenRegistration(type)` | Get full registration info |
| `hasScreen(type)` | Check if screen exists |
| `getRegisteredScreenTypes()` | List all registered types |
| `unregisterScreen(type)` | Remove a screen |
| `clearScreenRegistry()` | Remove all screens |
| `registerBuiltinScreens()` | Register all built-in screens |

### Groups Store (Navigation)

```ts
import { registerGroup, registerGroupPage, useGroupsStore } from 'quasar-app-extension-fastfree-lowcode/src/runtime'

// Create a navigation group (appears in dock)
registerGroup('My Group', 'mdi-folder', 'my-group')

// Add a page to the group
registerGroupPage('My Group', {
  screenType: 'my-screen',
  label: 'screens.myScreen',
  icon: 'mdi-star',
})

// Access the store directly
const store = useGroupsStore()
store.groups          // All groups
store.activeGroup     // Currently selected group
store.setActiveGroup('my-group')
```

**Interfaces:**

```ts
interface Group {
  id: string
  name: string
  icon: string
  pages: GroupPage[]
}

interface GroupPage {
  id: string
  screenType: string
  label: string
  icon: string
  pinned?: boolean
}
```

**Constants:** `SYSTEM_GROUP_ID = 'system'`, `FAVORITES_GROUP_ID = 'favorites'`

### Desktop Store (Window Management)

```ts
import { useDesktopStore } from 'quasar-app-extension-fastfree-lowcode/src/runtime'

const desktop = useDesktopStore()

// Open a window
desktop.openWindow('my-screen', 'My Screen', 'mdi-star')

// Manage windows
desktop.toggleMinimize(windowId)
desktop.toggleMaximize(windowId)
desktop.closeWindow(windowId)
desktop.bringToFront(windowId)

// Query
desktop.sortedWindows          // All windows in z-order
desktop.isWindowOpen('my-screen')
desktop.getWindowsByType('my-screen')
```

### i18n (Translations)

```ts
import { useLcI18n, registerMessages } from 'quasar-app-extension-fastfree-lowcode/src/runtime'

// Use in components
const { t } = useLcI18n()
t('common.search')        // "Search..."
t('screens.settings')     // "Settings"

// Register additional translations
registerMessages('my-ns', {
  greeting: 'Hello',
}, {
  greeting: 'مرحبا',
})
// Usage: t('my-ns.greeting')
```

### Theme System

```ts
import { useThemeStore } from 'quasar-app-extension-fastfree-lowcode/src/runtime'

const theme = useThemeStore()
theme.toggleMode()           // light -> dark -> system
theme.selectPreset('ocean')  // 10 presets available
theme.setBrandColor('primary', '#1565C0')
theme.exportConfig()         // Export as JSON
theme.importConfig(json)     // Import from JSON
```

### CRUD Store

```ts
import { useCrudStore } from 'quasar-app-extension-fastfree-lowcode/src/runtime'

const users = useCrudStore({
  name: 'users',
  endpoint: '/api/users',
  optimistic: true,
})

await users.fetchItems()
await users.createItem({ name: 'John' })
await users.updateItem(id, { name: 'Jane' })
await users.deleteItem(id)
```

### Validators

```ts
import { VALIDATORS } from 'quasar-app-extension-fastfree-lowcode/src/runtime'

// Quasar-compatible validation rules
const rules = [
  VALIDATORS.required('Field is required'),
  VALIDATORS.email('Invalid email'),
  VALIDATORS.minLength(3),
  VALIDATORS.phone('Invalid phone'),
]
```

### Formatters

```ts
import { formatters } from 'quasar-app-extension-fastfree-lowcode/src/runtime'

formatters.number(1234567.89)           // "1,234,567.89"
formatters.currency(1234.56, 'SAR')    // "SAR 1,234.56"
formatters.date('2024-01-15')           // "1/15/2024"
formatters.fileSize(1536)               // "1.50 KB"
formatters.percent(0.85)                // "85%"
```

---

## Built-in Screens

| Screen Type | Component | Icon | Description |
|-------------|-----------|------|-------------|
| `settings` | `LcSettingsScreen` | `mdi-cog-outline` | App settings |
| `about` | `LcAboutScreen` | `mdi-information-outline` | About info |
| `theme` | `LcThemeScreen` | `mdi-palette-outline` | Theme customization |
| `translation-editor` | `LcTranslationEditorScreen` | `mdi-translate` | Translation management |
| `error-logs` | `LcErrorLogScreen` | `mdi-bug-outline` | Error log viewer |
| `pwa-update` | `LcPwaUpdateScreen` | `mdi-cellphone-arrow-down` | PWA update |
| `shortcuts` | `LcShortcutsScreen` | `mdi-keyboard-outline` | Keyboard shortcuts |
| `structure-inspector` | `LcStructureInspector` | `mdi-file-tree-outline` | Structure inspector |
| `pinia-debugger` | `PiniaStateDebugger` | `mdi-database-outline` | Pinia state debugger |

---

## Components

| Component | Description |
|-----------|-------------|
| `DesktopShell` | Main app shell with dock and window management |
| `DesktopHeader` | Top header bar |
| `DesktopDock` | Bottom navigation dock |
| `WindowPanel` | Windowed screen container |
| `DynamicTable` | Data table with sorting, filtering, pagination |
| `DynamicForm` | Auto-generated forms from schema |
| `LcSmartPagination` | Smart pagination component |
| `LcSmartFilter` | Smart filter component |
| `LcPageHeader` | Page header layout |
| `LcSplashScreen` | Splash/loading screen |
| `LcSettingsScreen` | Settings management |
| `LcThemeScreen` | Theme customization |
| `LcTranslationEditorScreen` | Translation editor |
| `LcErrorLogScreen` | Error log viewer |
| `LcAboutScreen` | About information |
| `LcPwaUpdateScreen` | PWA update prompt |
| `LcShortcutsScreen` | Keyboard shortcuts |
| `EmptyState` | Empty state placeholder |
| `AddRowButton` | Add row button |

---

## DesktopShell Props

```vue
<DesktopShell
  title="My App"
  icon="dashboard"
  :gradient="['#0D47A1', '#1565C0']"
  :auto-open-first="true"
  :screen-filter="(id) => id !== 'pinia-debugger'"
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `'Desktop'` | App title in header |
| `icon` | `string` | `'dashboard'` | App icon |
| `gradient` | `[string, string]` | `['#0D47A1', '#1565C0']` | Header gradient |
| `autoOpenFirst` | `boolean` | `true` | Auto-open first screen |
| `screenFilter` | `(id: string) => boolean` | - | Filter screens |

---

## Configuration

### `mergeConfig(partial?)`

```ts
import { mergeConfig } from 'quasar-app-extension-fastfree-lowcode/src/runtime'

const config = mergeConfig({
  locale: 'ar',
  desktop: {
    dockPosition: 'bottom',
    dockStyle: 'glass',
    screens: {
      'my-screen': {
        maxInstances: 2,
        defaultWidth: 800,
        defaultHeight: 500,
      }
    }
  },
  api: {
    baseUrl: '/api',
    timeout: 15000,
  },
  splash: {
    mode: 'component',
    delay: 1000,
  }
})
```

### Config Interfaces

```ts
interface LcConfig {
  locale: string
  theme: Record<string, string>
  messages: Partial<LcMessages>
  api: Partial<LcApiConfig>
  desktop: Partial<LcDesktopConfig>
  error: Partial<LcErrorConfig>
  splash?: Partial<LcSplashConfig>
  capacitor?: Partial<LcCapacitorConfig>
  pwa?: Partial<LcPwaConfig>
  font?: Partial<LcFontConfig>
}

interface ScreenConfig {
  maxInstances?: number
  defaultWidth?: number
  defaultHeight?: number
  maximizeOnOpen?: boolean
  icon?: string
  label?: string
}
```

---

## CSS Variables

The theme system sets 30+ CSS custom properties:

```css
--lc-surface, --lc-surface-alt
--lc-on-surface, --lc-on-surface-muted
--lc-border, --lc-border-light
--lc-primary, --lc-primary-dark, --lc-primary-light
--lc-secondary, --lc-accent
--lc-positive, --lc-negative, --lc-info, --lc-warning
--lc-bg-primary
--lc-dock-bg, --lc-dock-border
--lc-scrollbar-thumb, --lc-scrollbar-track
```

---

## Peer Dependencies

| Package | Version |
|---------|---------|
| `vue` | ^3.4.0 |
| `quasar` | ^2.0.0 |
| `@quasar/app-vite` | ^3.2.0 |
| `pinia` | ^2.0.0 (optional) |
| `vue-router` | ^4.0.0 (optional) |
