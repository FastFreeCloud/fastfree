# AGENTS.md — FastFree LowCode

## ملاحظات سريعة
- TypeCheck: `cd apps/fastfree_ledger && pnpm vue-tsc --noEmit`
- Lint: `cd apps/fastfree_ledger && pnpm eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"`
- Dev Server: `cd apps/fastfree_ledger && pnpm dev`

## وصف الحزمة

`quasar-app-extension-fastfree-lowcode` — محرك منخفض الكود (Low-Code Engine) لـ Quasar Framework. يوفر إطار عمل متكامل لإدارة النوافذ (Window Manager)، الجداول التفاعلية (CRUD Table)، النماذج الديناميكية (Dynamic Form)، نظام تدويل شامل (i18n EN+AR)، إدارة المظهر (Theme Manager)، وسجل أخطاء مركزي. يعمل كامتداد (App Extension) يُسجل تلقائياً كل المكونات والأدوات المساعدة عبر Boot File.

**المتطلبات:** Node >= 18, Vue 3.4+, Quasar 2+, @quasar/app-vite 3+

## هيكل الملفات

```
packages/fastfree_lowcode/
├── AGENTS.md                          # هذا الملف
├── LOWCODE.md                         # توثيق تفصيلي للحزمة
├── README.md                          # م README
├── package.json                       # بيانات الحزمة
├── oxfmt.config.ts                    # إعداد التنسيق
├── oxlint.config.ts                   # إعداد الـ Lint
├── playground/                        # بيئة اختبار محلية
│
└── src/
    ├── index.ts                       # Entry point — يسجل Boot + CSS + Plugins
    ├── install.ts                     # سكريبت التثبيت
    ├── uninstall.ts                   # سكريبت الإلغاء
    ├── prompts.ts                     # سكريبت الأسئلة التفاعلية
    │
    ├── templates/                     # قوالب (فارغ حالياً)
    │   └── .gitkeep
    │
    └── runtime/
        ├── index.ts                   # التصديرات الرئيسية للحزمة
        ├── boot.register.ts           # Boot File الرئيسي — تسجيل كل شيء
        ├── config.ts                  # mergeConfig() + LC_CONFIG_KEY
        ├── types.ts                   # LcMessages + LcConfig + كل الـ Interfaces
        ├── types.d.ts                 # Declare module *.vue
        ├── defaults.ts                # القيم الافتراضية لكل الإعدادات
        ├── i18n.ts                    # useLcConfig + useLcI18n
        ├── translate.ts               # t() function
        ├── languages.ts               # getAllLanguages + getLanguageInfo
        ├── shared-config.ts           # Singleton config + Supported Languages
        ├── messages-en.ts             # ترجمات EN — 393 مفتاح
        ├── messages-ar.ts             # ترجمات AR — 393 مفتاح
        ├── pinia-store-registry.json  # سجل Pinia Stores
        │
        ├── boot/
        │   ├── index.ts               # تصدير Boot Modules
        │   ├── axios.ts               # createApiClient — API Client مع Error Handling
        │   ├── error-handler.ts       # معالج أخطاء شامل (Vue + Browser + Network + Performance)
        │   ├── capacitor.ts           # Capacitor — Native Platform Support
        │   ├── fontsource.ts          # Cairo Variable Font Loader
        │   └── pwa-update.ts          # PWA — Dynamic Manifest + Icon Generation
        │
        ├── components/
        │   ├── index.ts               # تصدير كل Components
        │   ├── DesktopShell.vue       # Layout الرئيسي — Window Manager + Dock
        │   ├── DesktopHeader.vue      # Header مع Gradient
        │   ├── DesktopDock.vue        # Dock — Touch-friendly + RTL + ARIA + Context Menu
        │   ├── WindowPanel.vue        # Window — Drag + Resize + Favorite + Restore Bar
        │   ├── GroupWorkspace.vue     # Workspace — App Grid + Search + Pinned Pages
        │   ├── DynamicTable.vue       # CRUD Table — Pagination + Export + Print + Aggregates
        │   ├── DynamicForm.vue        # Dynamic Form Component
        │   ├── FilterToolbar.vue      # Filter Toolbar
        │   ├── PaginationBar.vue      # Pagination Bar
        │   ├── EmptyState.vue         # Empty State
        │   ├── AddRowButton.vue       # Add Row Button
        │   ├── LcHeaderActions.vue    # Header Actions — Theme Toggle + Clock + Hijri
        │   ├── LcSplashScreen.vue     # Splash Screen Component
        │   ├── LcAboutScreen.vue      # About Screen — System Info
        │   ├── LcSettingsScreen.vue   # Settings — Theme + Language + Presets + Colors
        │   ├── LcThemeScreen.vue      # Theme Screen
        │   ├── LcShortcutsScreen.vue  # Keyboard Shortcuts — Edit + Search
        │   ├── LcErrorLogScreen.vue   # Error Log Viewer — Filter + Export + Clear
        │   ├── LcConnectionScreen.vue # Connection Screen
        │   ├── LcTranslationEditorScreen.vue # Translation Editor
        │   ├── LcPwaUpdateScreen.vue  # PWA Update Screen
        │   ├── LcPageHeader.vue       # Page Header
        │   ├── LcSmartFilter.vue      # Smart Filter Component
        │   ├── LcSmartPagination.vue  # Smart Pagination Component
        │   ├── LcStructureInspector.vue # Structure Inspector
        │   ├── WindowSwitcherBar.vue  # Window Switcher Bar
        │   ├── PiniaPersistenceInfo.vue # Pinia Persistence Info
        │   ├── PiniaStateDebugger.vue # Pinia State Debugger
        │   └── PiniaStateTreeView.vue # Pinia State Tree View
        │
        ├── composables/
        │   ├── index.ts               # تصدير كل Composables
        │   ├── useDesktopStore.ts     # Pinia Store — Window Management (CRUD + Z-order + Session)
        │   ├── useGroupsStore.ts      # Pinia Store — Groups + Pages + Favorites + Pin
        │   ├── screen-registry.ts     # Screen Registry — Dynamic Component Registration
        │   ├── useThemeStore.ts       # Pinia Store — Theme (10 Presets + Custom + System)
        │   ├── useThemeToggle.ts      # Theme Toggle — Dark/Light Switch
        │   ├── useThemeManager.ts     # Theme Manager — Wrapper for useThemeStore
        │   ├── useThemeStorage.ts     # Theme Storage — Dexie IndexedDB
        │   ├── useLcI18nStore.ts      # Pinia Store — i18n (Locale + Overrides + Registration)
        │   ├── useKeyboardShortcuts.ts # Keyboard Shortcuts — Configurable + Persistent
        │   ├── useSplashCoordinator.ts # Splash Coordinator — Loading/Transition/Ready Phases
        │   ├── useColumnSettings.ts   # Column Settings — Order + Visibility + Widths (LocalStorage)
        │   ├── useCrudStore.ts        # CRUD Store — Generic Factory + Optimistic Updates
        │   ├── useInlineEdit.ts       # Inline Edit — Auto-save + Validation + Keyboard
        │   ├── useContainerWidth.ts   # Container Width — ResizeObserver + Breakpoints
        │   ├── useNotify.ts           # Notifications — saved/error/warning/info/create
        │   ├── useConfirmDialog.ts    # Confirm Dialog — confirmDelete + confirmAction
        │   ├── usePrint.ts            # Print — HTML Table Generation + Branding
        │   ├── useExcelExport.ts      # Excel Export — ExcelJS Integration + Styling
        │   ├── useDateTime.ts         # DateTime — Gregorian + Hijri (umalqura)
        │   ├── useScreenAccess.ts     # Screen Access — RBAC + Filtering
        │   ├── usePiniaDebug.ts       # Pinia Debug Plugin — Action Tracing
        │   ├── useErrorLogStore.ts    # Error Log Store — Entries + Stats + Export
        │   ├── useFormatNumber.ts     # Number Formatting — Locale-aware (Number/Currency/Percent)
        │   └── useStatusHelpers.ts    # Status Helpers — translateStatus + statusColor + statusOptions
        │
        ├── utils/
        │   ├── index.ts               # تصدير Validators + Formatters
        │   ├── formatters.ts          # Formatters — number/currency/date/dateTime/percent/fileSize
        │   └── validators.ts          # Validators — required/email/phone/numeric/pattern/url
        │
        ├── validators/
        │   └── saudi-validators.ts    # Saudi Validators — IBAN/NationalId/CR/VAT/ArabicText
        │
        └── styles/
            ├── variables.scss         # Design Tokens — CSS Custom Properties
            ├── lowcode.scss           # Global Styles — Table + Scrollbar + RTL + Print
            └── shared-tables.scss     # Shared Table Styles — Variants + Print + RTL
```

## المكونات (Components)

| المكون | الملف | الوصف |
|--------|-------|-------|
| DesktopShell | `components/DesktopShell.vue:1` | Layout الرئيسي — يدير النوافذ والمكونات المتعددة |
| DesktopHeader | `components/DesktopHeader.vue:1` | Header مع خلفية Gradient قابلة للتخصيص |
| DesktopDock | `components/DesktopDock.vue:1` | Dock سفلي — Touch-friendly + RTL + Context Menu + Scroll |
| WindowPanel | `components/WindowPanel.vue:1` | نافذة — Drag + Resize + Favorite + Minimize/Maximize |
| GroupWorkspace | `components/GroupWorkspace.vue:1` | Workspace — App Grid + Search + Pinned Pages + Keyboard Nav |
| DynamicTable | `components/DynamicTable.vue:1` | CRUD Table — Pagination + Export + Print + Aggregates + Selection |
| DynamicForm | `components/DynamicForm.vue:1` | Dynamic Form Component |
| FilterToolbar | `components/FilterToolbar.vue:1` | Filter Toolbar |
| PaginationBar | `components/PaginationBar.vue:1` | Pagination Bar |
| EmptyState | `components/EmptyState.vue:1` | Empty State |
| AddRowButton | `components/AddRowButton.vue:1` | Add Row Button |
| LcHeaderActions | `components/LcHeaderActions.vue:1` | Header Actions — Theme Toggle + Clock + Hijri Date |
| LcSplashScreen | `components/LcSplashScreen.vue:1` | Splash Screen — Gradient + Progress + Animation |
| LcAboutScreen | `components/LcAboutScreen.vue:1` | About — System Info (Browser/OS/Screen/Date) |
| LcSettingsScreen | `components/LcSettingsScreen.vue:1` | Settings — Theme Mode + Language + Presets + Colors + Export/Import |
| LcThemeScreen | `components/LcThemeScreen.vue:1` | Theme Screen |
| LcShortcutsScreen | `components/LcShortcutsScreen.vue:1` | Keyboard Shortcuts — Edit + Search + Categories |
| LcErrorLogScreen | `components/LcErrorLogScreen.vue:1` | Error Log — Filter by Level + Expandable Rows + Export |
| LcConnectionScreen | `components/LcConnectionScreen.vue:1` | Connection Screen |
| LcTranslationEditorScreen | `components/LcTranslationEditorScreen.vue:1` | Translation Editor |
| LcPwaUpdateScreen | `components/LcPwaUpdateScreen.vue:1` | PWA Update Screen |
| LcPageHeader | `components/LcPageHeader.vue:1` | Page Header |
| LcSmartFilter | `components/LcSmartFilter.vue:1` | Smart Filter Component |
| LcSmartPagination | `components/LcSmartPagination.vue:1` | Smart Pagination Component |
| LcStructureInspector | `components/LcStructureInspector.vue:1` | Structure Inspector |
| WindowSwitcherBar | `components/WindowSwitcherBar.vue:1` | Window Switcher Bar |
| PiniaPersistenceInfo | `components/PiniaPersistenceInfo.vue:1` | Pinia Persistence Info |
| PiniaStateDebugger | `components/PiniaStateDebugger.vue:1` | Pinia State Debugger |
| PiniaStateTreeView | `components/PiniaStateTreeView.vue:1` | Pinia State Tree View |

## Composables

| Composable | الملف | الوصف |
|------------|-------|-------|
| createDesktopStore / useDesktopStore | `composables/useDesktopStore.ts:1` | Pinia Store — Window CRUD + Z-order + Session Persistence + Bounds Cache |
| useGroupsStore | `composables/useGroupsStore.ts:1` | Pinia Store — Groups CRUD + Pages + Favorites + Pin + Migration |
| registerScreen / registerScreens / getScreenComponent | `composables/screen-registry.ts:1` | Screen Registry — Dynamic Component Registration + Lazy Loading |
| useThemeStore | `composables/useThemeStore.ts:1` | Pinia Store — 10 Theme Presets + Custom Colors + System Detection + CSS Vars |
| useThemeToggle | `composables/useThemeToggle.ts:1` | Theme Toggle — Dark/Light Switch |
| useThemeManager | `composables/useThemeManager.ts:1` | Theme Manager — Wrapper for useThemeStore |
| useThemeStorage | `composables/useThemeStorage.ts:1` | Theme Storage — Dexie IndexedDB |
| useLcI18nStore | `composables/useLcI18nStore.ts:1` | Pinia Store — i18n Locale + Overrides + Namespace Registration |
| useKeyboardShortcuts | `composables/useKeyboardShortcuts.ts:1` | Keyboard Shortcuts — Configurable + Persistent + Conflict Detection |
| useSplashCoordinator | `composables/useSplashCoordinator.ts:1` | Splash Coordinator — Loading/Transition/Ready + Capacitor Native |
| useColumnSettings | `composables/useColumnSettings.ts:1` | Column Settings — Order + Visibility + Widths + Responsive Adapt |
| useCrudStore | `composables/useCrudStore.ts:1` | CRUD Store — Generic Factory + Optimistic Updates + Undo |
| useInlineEdit | `composables/useInlineEdit.ts:1` | Inline Edit — Auto-save + Validation + Keyboard Nav |
| useContainerWidth | `composables/useContainerWidth.ts:1` | Container Width — ResizeObserver + Breakpoints (Mobile/Tablet/Desktop) |
| useNotify | `composables/useNotify.ts:1` | Notifications — saved/error/warning/info/create |
| useConfirmDialog | `composables/useConfirmDialog.ts:1` | Confirm Dialog — confirmDelete + confirmAction |
| usePrint | `composables/usePrint.ts:1` | Print — HTML Table + Branding + Locale-aware |
| useExcelExport | `composables/useExcelExport.ts:1` | Excel Export — ExcelJS Integration + Styled Headers |
| useDateTime | `composables/useDateTime.ts:1` | DateTime — Gregorian + Hijri (umalqura) + Live Clock |
| useScreenAccess | `composables/useScreenAccess.ts:1` | Screen Access — RBAC + Static/Reactive/Custom Filtering |
| piniaDebugPlugin | `composables/usePiniaDebug.ts:1` | Pinia Debug Plugin — Action Tracing + Error Reporting |
| useErrorLogStore | `composables/useErrorLogStore.ts:1` | Error Log Store — Entries + Stats + Export + Max 500 |
| useFormatNumber | `composables/useFormatNumber.ts:1` | Number Formatting — Locale-aware (Number/Currency/Percent) |
| useStatusHelpers | `composables/useStatusHelpers.ts:1` | Status Helpers — translateStatus + statusColor + statusOptions |

## الأدوات (Utils)

| الأداة | الملف | الوصف |
|--------|-------|-------|
| VALIDATORS | `utils/validators.ts:1` | Validators — required/email/phone/numeric/min/max/pattern/url |
| formatters | `utils/formatters.ts:1` | Formatters — number/currency/date/dateTime/percent/fileSize |

## المُ validات (Validators)

| Validator | الملف | الوصف |
|-----------|-------|-------|
| useSaudiValidators | `validators/saudi-validators.ts:1` | Saudi Validators — required/phone/nationalId/commercialRegistration/vatNumber/email/maxLength/minLength/numeric/integer/arabicText/iban |

## Boot Modules

| Module | الملف | الوصف |
|--------|-------|-------|
| createApiClient | `boot/axios.ts:1` | API Client — GET/POST/PUT/PATCH/DELETE + Error Handling + Timeout + Network Status |
| errorHandler | `boot/error-handler.ts:1` | Error Handler — Vue Errors + Promise Rejection + Browser Errors + Network + Performance (LCP/CLS/Long Tasks) + Memory |
| hideNativeSplash | `boot/capacitor.ts:1` | Capacitor — Native Splash + StatusBar + App State |
| fontsource | `boot/fontsource.ts:1` | Cairo Variable Font Loader |
| pwa-update | `boot/pwa-update.ts:1` | PWA — Dynamic Manifest + Icon Generation from Logo |

## الترجمات

- **393 مفتاح** في LcMessages interface
- **EN** كاملة — `messages-en.ts` (407 سطر)
- **AR** كاملة — `messages-ar.ts` (403 سطر)
- مفاتيح مشتقة: `common.*`, `validation.*`, `error.*`, `system.*`, `errorLog.*`, `about.*`, `settings.*`, `shortcuts.*`, `groups.*`, `screens.*`, `inspector.*`, `translationEditor.*`, `pwa.*`, `debugger.*`, `export.*`, `print.*`
- نظام التدويل: `useLcI18nStore` مع دعم التخزين المحلي + Override لكل لغة + تسجيل مساحات اسم ديناميكية

## الأنواع (Types)

| النوع | الملف | الوصف |
|-------|-------|-------|
| LcMessages | `types.ts:1` | واجهة كل مفاتيح الترجمة (393 مفتاح) |
| LcConfig | `types.ts:473` | الإعدادات الجزئية |
| LcFullConfig | `types.ts:486` | الإعدادات الكاملة |
| LcDesktopConfig | `types.ts:404` | إعدادات سطح المكتب |
| LcApiConfig | `types.ts:418` | إعدادات API |
| LcErrorConfig | `types.ts:423` | إعدادات معالجة الأخطاء |
| LcSplashConfig | `types.ts:444` | إعدادات شاشة التحميل |
| LcCapacitorConfig | `types.ts:452` | إعدادات Capacitor |
| LcPwaConfig | `types.ts:458` | إعدادات PWA |
| LcFontConfig | `types.ts:463` | إعدادات الخطوط |
| ScreenConfig | `types.ts:395` | إعدادات الشاشة (maxInstances/defaultWidth/etc) |
| DockItem | `types.ts:467` | عنصر Dock |
| WindowInfo | `useDesktopStore.ts:5` | معلومات النافذة |
| DesktopStoreOptions | `useDesktopStore.ts:20` | خيارات Desktop Store |
| GroupPage / Group | `useGroupsStore.ts:6-19` | صفحة / مجموعة |
| ScreenRegistration | `screen-registry.ts:7` | تسجيل شاشة |
| BrandColors / ThemePreset / ThemeConfig | `useThemeStore.ts:12-34` | ألوان / قالب / إعدادات المظهر |
| DateTimeInfo | `useDateTime.ts:4` | معلومات التاريخ والوقت |
| ColumnDef / ColumnDefaults / ColumnSettingsOptions | `useColumnSettings.ts:4-24` | إعدادات الأعمدة |
| CrudStoreOptions | `useCrudStore.ts:5` | خيارات CRUD Store |
| EditableRow / InlineEditOptions | `useInlineEdit.ts:5-23` | صف قابل للتعديل |
| PrintCompany / PrintColumn / PrintTableOptions | `usePrint.ts:5-29` | خيارات الطباعة |
| ExcelCompany / ExcelColumn / ExcelExportOptions | `useExcelExport.ts:6-29` | خيارات التصدير |
| ScreenAccessOptions / ScreenAccessReturn | `useScreenAccess.ts:12-41` | التحكم في الوصول |
| PiniaDebugOptions | `usePiniaDebug.ts:26` | خيارات Pinia Debug |
| LogEntry / ErrorStats | `useErrorLogStore.ts:3-19` | سجل الخطأ + الإحصائيات |
| SplashCoordinator | `useSplashCoordinator.ts:5` | منسق شاشة التحميل |
| FormatterOptions | `formatters.ts:1` | خيارات التنسيق |

## التبعيات

### Dependencies
| الحزمة | الإصدار | الوصف |
|--------|---------|-------|
| @clack/prompts | ^1.4.0 | CLI Prompts |
| @umalqura/core | ^0.0.7 | التقويم الهجري |
| dexie | ^4.4.4 | IndexedDB Wrapper (Theme Storage) |

### devDependencies
| الحزمة | الإصدار | الوصف |
|--------|---------|-------|
| @quasar/app-vite | ^3.2.0 | Quasar App Vite |
| quasar | ^2.22.0 | Quasar Framework |
| vue | ^3.5.22 | Vue 3 |

### peerDependencies
| الحزمة | الإصدار | مطلوب |
|--------|---------|-------|
| @quasar/app-vite | ^3.2.0 | نعم |
| pinia | ^2.0.0 | اختياري |
| quasar | ^2.0.0 | نعم |
| vue | ^3.4.0 | نعم |
| vue-router | ^4.0.0 | اختياري |

## Pinia Stores

| Store ID | Factory | الملف | Persistence |
|----------|---------|-------|-------------|
| `desktop` | createDesktopStore | useDesktopStore.ts | localStorage (اختياري — lc-open-windows) |
| `lc-groups` | useGroupsStore | useGroupsStore.ts | localStorage (lc-groups) |
| `lc-i18n` | useLcI18nStore | useLcI18nStore.ts | localStorage (lc-locale + lc-translation-overrides-{locale}) |
| `lc-theme` | useThemeStore | useThemeStore.ts | localStorage (lc-theme-manager) |

## التحسينات المُطبقة

- RTL: `padding-inline-start` / `inset-inline-end` في كل المكونات
- Locale ديناميكي في useExcelExport + usePrint
- ARIA labels على كل الأزرار التفاعلية
- TypeScript: صفر `any` types
- console.log: اتمسحت كل أكواد الـ debug
- SSR Guards: `isServer` check في useThemeStore + GroupWorkspace
- Performance: batch CSS updates في useThemeStore
- Prefers-reduced-motion: يحترم إعدادات المستخدم
- Safe Area Insets: يدعم الأجهزة ذات الشق (iPhone)

## سجل التغييرات

### 2026-08-07 — جلسة بناء الحزمة الأساسية
- إنشاء 15 مكوناً + 27 composable + 3 utils + 6 boot modules
- إنشاء 393 مفتاح ترجمة EN + AR
- File Splitting: config.ts 1450→60 سطر (96%↓)
- SSR Guards في useThemeStore + GroupWorkspace
- Performance: batch CSS updates + watch(filteredTree)
- RTL: padding-inline-start / inset-inline-end
- ARIA labels على كل الأزرار

### 2026-08-08 — جلسة التحسين الشاملة
- useFormatNumber.ts — تنسيق أرقام/locale-aware
- useStatusHelpers.ts — translateStatus + statusColor مشتركة
- تصحيح import paths في useFormatNumber + useStatusHelpers
- فحص result.success في كل save functions
- إضافة try/catch في error-handler
- تحسين error handling في كل components
