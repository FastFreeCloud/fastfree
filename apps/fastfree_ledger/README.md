# fastfree_ledger

تطبيق محاسبة مبني على Quasar + Vue 3، مدمج مع إضافة **FastFree LowCode** اللي توفر بيئة Desktop جاهزة (Header + Dock + Windows + Tables + Forms).

---

## جدول المحتويات

- [الإضافة بتعمل إيه تلقائياً](#الإضافة-بتعمل-إيه-تلقائياً)
- [الدمج خطوة بخطوة](#الدمج-خطوة-بخطوة)
- [الاستخدام الصح](#الاستخدام-الصح)
- [الاستخدام الغلط](#الاستخدام-الغلط)
- [مرجع سريع](#مرجع-سريع)

---

## الإضافة بتعمل إيه تلقائياً

لما بتضيف `quasar-app-extension-fastfree-lowcode` لمشروعك، الإضافة بتعدّل **`quasar.config`** تلقائياً من غير ما تلمس أي ملفات في مشروعك:

### التعديلات التلقائية على `quasar.config`

| القسم               | التعديل                              | التفاصيل                                        |
| ------------------- | ------------------------------------ | ----------------------------------------------- |
| `boot`              | تضيف `boot.register.ts`              | بيشغّل تسجيل 12 Component + ثيم + error handler |
| `css`               | تضيف `lowcode.scss`                  | أنماط CSS للجداول + النماذج + RTL + Dark Mode   |
| `extras`            | تضيف `material-icons` + `mdi-v7`     | أيقونات Material Design Icons (لو مش موجودة)    |
| `framework.plugins` | تضيف `Notify` + `Dialog` + `Loading` | plugins必需ة (لو مش موجودة)                     |

### التعديلات/Runtime عند تشغيل التطبيق

| الميزة                 | التفاصيل                                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **12 Component عالمي** | `DesktopShell`, `WindowPanel`, `DesktopDock`, `DynamicTable`, `DynamicForm`, `FilterToolbar`, `PaginationBar`, `EmptyState`, `AddRowButton`, `LcConnectionScreen`, `LcErrorLogScreen`, `LcAboutScreen`, `LcSplashScreen` — كلها متاحة في أي صفحة بدون import |
| **ثيم Deep Ocean**     | CSS variables افتراضية (`--lc-primary: #0D47A1`, `--lc-surface: #ffffff`، إلخ) بتتطبّق على `<html>`                                                                                                                                                          |
| **Error Handler**      | بيتابع أخطاء Vue + أخطاء JS + أخطاء الشبكة + أداء الأداء                                                                                                                                                                                                     |
| **Config System**      | `LC_CONFIG_KEY` + `$lcConfig` متاحة في أي مكان عبر inject                                                                                                                                                                                                    |
| **Desktop Store**      | `createDesktopStore` متاح عبر inject لإدارة النوافذ                                                                                                                                                                                                          |

### اختياري (لو فعّلته في config)

| الميزة        | Config                    | التفاصيل                          |
| ------------- | ------------------------- | --------------------------------- |
| **خط Cairo**  | `font.cairo: true`        | بيحمل Cairo Variable Font         |
| **Capacitor** | `capacitor.enabled: true` | بيهيّئ Capacitor للتطبيقات native |
| **PWA**       | `pwa.enabled: true`       | بيعمل update للـ PWA manifest     |

---

## الدمج خطوة بخطوة

### الخطوة 1: إضافة الـ dependency

أضف السطر ده في `package.json` تحت `devDependencies`:

```json
{
  "devDependencies": {
    "quasar-app-extension-fastfree-lowcode": "workspace:*"
  }
}
```

> **ملاحظة:** `workspace:*` للتطوير المحلي داخل الـ monorepo. للنشر استخدم:
>
> ```json
> "quasar-app-extension-fastfree-lowcode": "^0.1.0"
> ```

بعدين شغّل:

```bash
pnpm install
```

### الخطوة 2: تسجيل الإضافة

أنشئ ملف `quasar.extensions.json` في جذر مشروعك:

```json
{
  "fastfree-lowcode": {}
}
```

> **مهم جداً:** بدون الملف ده، Quasar CLI مش هيشتغل الإضافة حتى لو موجودة في `node_modules`. الملف ده هو اللي بيقول لـ Quasar أنه في extension مسجلة. عادةً بيتعمل تلقائياً بـ `quasar ext add`، بس في الـ workspace dependency لازم تعمله يدوياً.

### الخطوة 3: تعديل `quasar.config.ts`

```ts
import { defineConfig } from '#q-app';
import path from 'path';

export default defineConfig((ctx) => {
  return {
    boot: ['i18n'], // boot files بتاعتك (الإضافة بتضيف boot تلقائياً)
    css: ['app.scss'], // CSS بتاعك (الإضافة بتضيف lowcode.scss تلقائياً)

    extras: [
      'roboto-font',
      'material-icons', // الإضافة بتضيفها تلقائياً لو مش موجودة
      // 'mdi-v7',            // الإضافة بتضيفها تلقائياً لو مش موجودة
    ],

    build: {
      typescript: {
        strict: true,
        vueShim: true,

        // === مطلوب في الـ monorepo فقط ===
        extendTsConfig(tsConfig) {
          tsConfig.compilerOptions = tsConfig.compilerOptions || {};
          tsConfig.compilerOptions.paths = tsConfig.compilerOptions.paths || {};
          tsConfig.compilerOptions.paths['quasar-app-extension-fastfree-lowcode/src/runtime'] = [
            '../../../packages/fastfree_lowcode/src/runtime/index.ts',
          ];
          tsConfig.compilerOptions.paths['quasar-app-extension-fastfree-lowcode/src/runtime/*'] = [
            '../../../packages/fastfree_lowcode/src/runtime/*',
          ];
        },
      },

      filenameBasedRouting: true,
      vueRouterMode: 'hash',

      // === مطلوب في الـ monorepo فقط ===
      extendViteConf(viteConf) {
        const appRoot = __dirname;
        const monorepoRoot = path.resolve(appRoot, '..', '..');
        viteConf.server = viteConf.server || {};
        viteConf.server.fs = viteConf.server.fs || {};
        viteConf.server.fs.allow = [
          appRoot,
          path.join(monorepoRoot, 'node_modules'),
          path.join(monorepoRoot, 'packages', 'fastfree_lowcode'),
        ];
      },
    },

    framework: {
      config: {},
      plugins: ['Loading'], // الإضافة بتضيف Notify + Dialog + Loading تلقائياً
    },
  };
});
```

> **ملاحظة مهمة:** أجزاء `extendTsConfig` و `extendViteConf` مطلوبة **فقط** في الـ monorepo. في المشروع النهائي (production) احذفهم.

### الخطوة 4: تعديل `src/pages/index.vue`

```vue
<template>
  <DesktopShell
    title="FastFree Ledger"
    icon="mdi-calculator-variant"
    :dock-items="dockItems"
    :show-print="true"
    :show-refresh="true"
    :auto-open-first="true"
  >
    <!-- شاشة الفواتير -->
    <template #window-invoices>
      <div class="q-pa-md">
        <div class="text-h6 q-mb-md">الفواتير</div>
        <!-- هنا تحط DynamicTable أو محتوى الفواتير -->
      </div>
    </template>

    <!-- شاشة العملاء -->
    <template #window-customers>
      <div class="q-pa-md">
        <div class="text-h6 q-mb-md">العملاء</div>
      </div>
    </template>

    <!-- شاشة التقارير -->
    <template #window-reports>
      <div class="q-pa-md">
        <div class="text-h6 q-mb-md">التقارير</div>
      </div>
    </template>
  </DesktopShell>
</template>

<script setup lang="ts">
import { DesktopShell } from 'quasar-app-extension-fastfree-lowcode';

const dockItems = [
  { id: 'invoices', icon: 'mdi-receipt-text', label: 'الفواتير' },
  { id: 'customers', icon: 'mdi-account-group', label: 'العملاء' },
  { id: 'reports', icon: 'mdi-chart-bar', label: 'التقارير' },
  { id: 'errors', icon: 'mdi-bug', label: 'سجل الأخطاء' },
  { id: 'about', icon: 'mdi-information-outline', label: 'حول التطبيق' },
];
</script>
```

### الخطوة 5: تشغيل التطبيق

```bash
pnpm dev
# أو
npx quasar dev
```

> **ملاحظة:** شغّل الأمر ده من الجذر (مجلد الـ monorepo) مش من مجلد التطبيق مباشرة:
>
> ```bash
> pnpm --filter fastfree_ledger dev
> ```

---

## الاستخدام الصح

### مثال 1: DesktopShell مع DynamicTable

```vue
<template>
  <DesktopShell
    title="نظام الفواتير"
    icon="mdi-receipt-text"
    :dock-items="dockItems"
    :show-print="true"
  >
    <template #window-invoices>
      <DynamicTable
        title="جدول الفواتير"
        icon="mdi-table"
        storageKey="invoices-table"
        :columns="columns"
        :fetch-items="fetchInvoices"
      />
    </template>
  </DesktopShell>
</template>

<script setup lang="ts">
import { DesktopShell, DynamicTable } from 'quasar-app-extension-fastfree-lowcode';

const dockItems = [{ id: 'invoices', icon: 'mdi-receipt-text', label: 'الفواتير' }];

const columns = [
  { name: 'id', label: 'رقم', field: 'id', sortable: true, align: 'left' as const },
  { name: 'customer', label: 'العميل', field: 'customer', sortable: true, align: 'left' as const },
  { name: 'amount', label: 'المبلغ', field: 'amount', sortable: true, align: 'left' as const },
];

function fetchInvoices() {
  return fetch('/api/invoices')
    .then((r) => r.json())
    .then((data) => ({ data: data.items, total: data.total }));
}
</script>
```

### مثال 2: إضافة زر logout في الهيدر

لو عايز تضيف زر logout بعد أزرار الهيدر، استخدم slot `#header-right`:

```vue
<DesktopShell title="FastFree Ledger" icon="mdi-calculator-variant" :dock-items="dockItems">
  <!-- هيدر يمين بعد أزرار الساعة والثيم -->
  <template #header-right>
    <q-separator vertical color="white" />
    <q-btn flat round dense icon="mdi-logout" color="white" @click="logout">
      <q-tooltip>تسجيل الخروج</q-tooltip>
    </q-btn>
  </template>

  <!-- نوافذ... -->
</DesktopShell>
```

### مثال 3: استخدام `#right` slot لاستبدال كامل للهيدر

لو عايز تتحكم في الهيدر بالكامل (استبدال LcHeaderActions):

```vue
<DesktopShell title="My App" icon="home" :dock-items="dockItems">
  <!-- استبدال كامل للجزء الأيمن في الهيدر -->
  <template #right>
    <div class="row items-center q-gutter-sm">
      <span class="text-white">أهلاً محمد</span>
      <q-btn flat round dense icon="mdi-logout" color="white" />
    </div>
  </template>
</DesktopShell>
```

### مثال 4: Splash Screen

```vue
<template>
  <LcSplashScreen
    :visible="showSplash"
    title="FastFree Ledger"
    message="جاري تحميل النظام..."
    icon="mdi-calculator-variant"
    :loading="true"
  />
  <DesktopShell v-show="!showSplash" ... />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { DesktopShell, LcSplashScreen } from 'quasar-app-extension-fastfree-lowcode';

const showSplash = ref(true);
onMounted(() => {
  setTimeout(() => {
    showSplash.value = false;
  }, 1500);
});
</script>
```

### مثال 5: DynamicForm في نافذة

```vue
<template #window-settings>
  <DynamicForm :fields="settingsFields" v-model="settingsData" @submit="saveSettings" />
</template>

<script setup lang="ts">
import { DynamicForm } from 'quasar-app-extension-fastfree-lowcode';

const settingsFields = [
  { name: 'companyName', label: 'اسم الشركة', type: 'text' as const, required: true },
  { name: 'vatNumber', label: 'الرقم الضريبي', type: 'text' as const, required: true },
  { name: 'phone', label: 'الهاتف', type: 'phone' as const },
];

const settingsData = ref({ companyName: '', vatNumber: '', phone: '' });

function saveSettings(data: Record<string, unknown>) {
  console.log('Settings saved:', data);
}
</script>
```

---

## الاستخدام الغلط

### ❌ غلط 1: استخدام `q-layout` بدال `DesktopShell`

```vue
<!-- ❌ غلط -->
<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>FastFree Ledger</q-toolbar-title>
      </q-toolbar>
    </q-header>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<!-- ✅ صح -->
<template>
  <DesktopShell title="FastFree Ledger" icon="mdi-calculator-variant" :dock-items="dockItems">
    <!-- المحتوى -->
  </DesktopShell>
</template>
```

**ليه غلط؟** `DesktopShell` بيوفر Header + Dock + Window Management + Theme + Error Handler. لو استخدمت `q-layout` هتفقد كل المميزات دي.

---

### ❌ غلط 2: نسيان الـ dependency في `package.json`

```json
// ❌ غلط — نسيت تضيف الإضافة
{
  "devDependencies": {
    "quasar": "^2.22.0"
  }
}

// ✅ صح
{
  "devDependencies": {
    "quasar": "^2.22.0",
    "quasar-app-extension-fastfree-lowcode": "workspace:*"
  }
}
```

**ليه غلط؟** بدون الـ dependency، `import { DesktopShell } from 'quasar-app-extension-fastfree-lowcode'` هيديك error.

---

### ❌ غلط 3: استخدام Material Icon names في `dockItems` بدال MDI names

```ts
// ❌ غلط — أسماء Material Icons (مش هتشتغل مع mdi-v7)
const dockItems = [
  { id: 'home', icon: 'receipt', label: 'الفواتير' }, // ❌
  { id: 'home', icon: 'account_circle', label: 'العملاء' }, // ❌
];

// ✅ صح — أسماء MDI (Material Design Icons)
const dockItems = [
  { id: 'home', icon: 'mdi-receipt-text', label: 'الفواتير' }, // ✅
  { id: 'home', icon: 'mdi-account-group', label: 'العملاء' }, // ✅
];
```

**ليه غلط؟** الإضافة بتستخدم `mdi-v7` كأيقونات افتراضية. Material Icon names زي `receipt` مش هتشتغل في الـ Dock.

---

### ❌ غلط 4: محاولة تهيئة الـ theme يدوياً

```ts
// ❌ غلط — الإضافة بتعملها تلقائياً
import { setCssVar } from 'quasar';
setCssVar('primary', '#0D47A1');

// ✅ صح — خلي الإضافة تتعامل مع الثيم
// الإضافة بتطبق Deep Ocean theme تلقائياً
// لو عايز ثيم مختلف، عدّل config:
// provide(LC_CONFIG_KEY, { theme: { '--lc-primary': '#YOUR_COLOR' } })
```

**ليه غلط؟** `boot.register.ts` بيطبق الثيم تلقائياً. لو عملت setCssVar يدوياً ممكن يتكتب فوق الثيم بتاع الإضافة أو يحصل conflict.

---

### ❌ غلط 5: استخدام `process.env` بدال `import.meta.env`

```ts
// ❌ غلط — Quasar v3 + Vite بيعملوا import.meta.env
if (process.env.DEV) { ... }
if (process.env.SERVER) { ... }

// ✅ صح
if (import.meta.env.DEV) { ... }
if (import.meta.env.SSR) { ... }
```

**ليه غلط؟** `@quasar/app-vite` v3 بيستخدم Vite environment variables. `process.env` مش متاح في Browser context.

---

### ❌ غلط 6: نسيان `server.fs.allow` في الـ monorepo

```ts
// ❌ غلط — Vite هيرفض يقرأ ملفات من packages/
extendViteConf(viteConf) {
  // مفيش server.fs.allow
}

// ✅ صح
extendViteConf(viteConf) {
  const appRoot = __dirname
  const monorepoRoot = path.resolve(appRoot, '..', '..')
  viteConf.server = viteConf.server || {}
  viteConf.server.fs = viteConf.server.fs || {}
  viteConf.server.fs.allow = [
    appRoot,
    path.join(monorepoRoot, 'node_modules'),
    path.join(monorepoRoot, 'packages', 'fastfree_lowcode'),
  ]
}
```

**ليه غلط؟** Vite عنده حماية للملفات. في الـ monorepo، الـ extension files موجودة في مجلد تاني. من غير `fs.allow` هتلاقي `ERR_FS_FILE_OUTSIDE_ROOT`.

---

### ❌ غلط 7: استخدام `#right` slot و `#header-right` slot مع بعض

```vue
<!-- ❌ غلط — الاتنين مع بعض -->
<DesktopShell>
  <template #right>
    <span>test</span>
  </template>
  <template #header-right>
    <q-btn icon="mdi-logout" />
  </template>
</DesktopShell>

<!-- ✅ صح — اختار واحد -->
<!-- الخيار 1: استبدال كامل -->
<DesktopShell>
  <template #right>
    <span>المحتوى بتاعي بالكامل</span>
  </template>
</DesktopShell>

<!-- الخيار 2: إضافة بعد LcHeaderActions -->
<DesktopShell>
  <template #header-right>
    <q-btn icon="mdi-logout" />
  </template>
</DesktopShell>
```

**ليه غلط؟** `#right` بيستبدل LcHeaderActions بالكامل. لو استخدمته، `#header-right` مش هيتشغل لأن LcHeaderActions مش هيبان أصلاً.

---

### ❌ غلط 8: استيراد Component مش موجود في الـ barrel exports

```vue
<!-- ❌ غلط — LcDataTable مش موجود -->
<script setup>
import { LcDataTable } from 'quasar-app-extension-fastfree-lowcode';
</script>

<!-- ✅ صح — DynamicTable هو الاسم الصح -->
<script setup>
import { DynamicTable } from 'quasar-app-extension-fastfree-lowcode';
</script>
```

---

### ❌ غلط 9: استخدام `field: undefined` في ColumnDef

```ts
// ❌ غلط — field مطلوب في DynamicTable
const columns = [{ name: 'name', label: 'الاسم', field: undefined }];

// ✅ صح
const columns = [{ name: 'name', label: 'الاسم', field: 'name' }];
```

**ليه غلط؟** `DynamicTable` بيستخدم `field` لقراءة البيانات من كل صف. من غيره، الخلايا هتفضل فاضية.

---

## مرجع سريع

### مقارنة بين التطبيقات الثلاثة

| الميزة                | test-lowcode     | fastfree_excel           | fastfree_ledger (المطلوب) |
| --------------------- | ---------------- | ------------------------ | ------------------------- |
| **الlayout**          | `index.vue` بسيط | `MainLayout.vue` + async | `index.vue` بسيط          |
| **عدد النوافذ**       | 6                | 8                        | حسب احتياج                |
| **Dimensiones مخصصة** | لا (افتراضي)     | نعم (700-1100px)         | حسب احتياج                |
| **DynamicTable/Form** | نعم              | لا (محتوى مخصص)          | نعم                       |
| **Splash Screen**     | نعم              | لا                       | اختياري                   |
| **Auth/Permissions**  | لا               | نعم                      | اختياري                   |
| **#header-right**     | لا               | نعم (logout)             | اختياري                   |
| **Custom Store**      | لا               | نعم (desktop.ts)         | اختياري                   |
| **Boot files**        | 1 (i18n)         | 6                        | حسب احتياج                |

### المكونات المتاحة في الإضافة

| المكون               | الاستخدام                                |
| -------------------- | ---------------------------------------- |
| `DesktopShell`       | الهيكل الأساسي (Header + Dock + Windows) |
| `DynamicTable`       | جدول CRUD مع بحث وفرز وتصدير             |
| `DynamicForm`        | نموذج ديناميكي من field definitions      |
| `LcSplashScreen`     | شاشة تحميل متحركة                        |
| `WindowPanel`        | نافذة قابلة للسحب والتقسيم               |
| `DesktopDock`        | شريط تطبيقات زجاجي                       |
| `LcErrorLogScreen`   | عرض سجل الأخطاء                          |
| `LcAboutScreen`      | شاشة حول التطبيق                         |
| `LcConnectionScreen` | شاشة فحص الاتصال                         |
| `FilterToolbar`      | شريط بحث وفلترة                          |
| `PaginationBar`      | أزرار التنقل بين الصفحات                 |
| `EmptyState`         | رسالة عند عدم وجود بيانات                |

### الـ Composables المتاحة

| Composable         | الاستخدام                         |
| ------------------ | --------------------------------- |
| `useDesktopStore`  | إدارة النوافذ المفتوحة والنشطة    |
| `useThemeToggle`   | التبديل بين الوضع الداكن والفاتح  |
| `useDateTime`      | الساعة + التاريخ الميلادي والهجري |
| `useCrudStore`     | عمليات CRUD على البيانات          |
| `useNotify`        | إشعارات موحدة                     |
| `useConfirmDialog` | dialog تأكيد                      |
| `usePrint`         | طباعة جداول                       |
| `useExcelExport`   | تصدير إلى Excel (يحتاج `exceljs`) |
| `useScreenAccess`  | التحقق من صلاحيات الشاشات         |
| `useErrorLogStore` | إدارة سجل الأخطاء                 |

---

## تشغيل التطبيق

```bash
# من مجلد الـ monorepo الجذر
pnpm --filter fastfree_ledger dev

# أو من مجلد التطبيق مباشرة
npx quasar dev
```

التطبيق هيكون على `http://localhost:9000/` (أو 9001/9002 لو تطبيقات تانية شغالة).

---

## الترخيص

MIT
