# FastFree — وثيقة معمارية Quasar App Extensions

| | |
|---|---|
| **المشروع** | FastFree — منصة ERP تجارية (Frappe/ERPNext + Quasar) |
| **الإصدار** | 1.0 |
| **الحالة** | مسودة للمراجعة (Draft for Review) |
| **النطاق** | معمارية مشاركة الكود بين تطبيقات FastFree المتعددة (مطعم، صيدلية، HIS، CRM، ERP عام) |

---

## جدول المحتويات

1. [نظرة عامة وأهداف](#1-نظرة-عامة-وأهداف)
2. [المشكلة المعمارية](#2-المشكلة-المعمارية)
3. [القرار المعماري](#3-القرار-المعماري)
4. [بنية Monorepo](#4-بنية-monorepo)
5. [الطبقة الأساسية: fastfree-auth](#5-الطبقة-الأساسية-fastfree-auth)
6. [طبقة إضافات الأعمال](#6-طبقة-إضافات-الأعمال)
7. [آلية التهيئة والترتيب](#7-آلية-التهيئة-والترتيب)
8. [Realtime كـ Singleton](#8-realtime-كـ-singleton)
9. [إدارة الحالة](#9-إدارة-الحالة)
10. [نظام الإصدارات](#10-نظام-الإصدارات)
11. [الاختبار](#11-الاختبار)
12. [CI/CD](#12-cicd)
13. [Dependency Graph الكامل](#13-dependency-graph-الكامل)
14. [قواعد المعمارية الملزمة](#14-قواعد-المعمارية-الملزمة)
15. [المخاطر والتحديات](#15-المخاطر-والتحديات)
16. [خطة التنفيذ المرحلية](#16-خطة-التنفيذ-المرحلية)
17. [ملحق: مقارنة مع المخطط الأصلي](#17-ملحق-مقارنة-مع-المخطط-الأصلي)

---

## 1. نظرة عامة وأهداف

FastFree عبارة عن خمسة مشاريع عملاء منفصلة (مطعم، صيدلية، مستشفى HIS، CRM، ERP عام) تشترك جميعها في:

- نفس الـ backend: **Frappe** (عبر `frappe-js-sdk`).
- نفس متطلبات الـ Authentication, Permissions, License, Files, Realtime.
- إطار أمامي واحد: **Quasar (Vue 3)**.

### الأهداف

| الهدف | القياس |
|---|---|
| عدم تكرار كود auth/permissions/license عبر 5 مشاريع | كود واحد، نسخة واحدة (`semver`) |
| سهولة إضافة مشروع عميل جديد | تثبيت package + اختيار Business Extensions المطلوبة فقط |
| فصل واضح بين "منصّة" و"مجال أعمال" | `fastfree-auth` (منصّة) مقابل `fastfree-sales/hr/crm/...` (مجالات) |
| اتصال Realtime واحد لكل تطبيق | Singleton pattern |
| قابلية الاختبار المعزول | كل package له unit tests مستقلة |

---

## 2. المشكلة المعمارية

المخطط الأصلي يفترض أن كل الأجزاء (auth + business modules) هي **Quasar App Extensions (AE)** تعتمد على بعضها. من الناحية العملية هذا الافتراض فيه ثغرات تقنية حقيقية:

| المشكلة | الأثر |
|---|---|
| **Quasar AE مفيهاش dependency resolution** | الـ CLI (`quasar ext add`) لا يتحقق أن `fastfree-auth` مثبّتة قبل تثبيت `fastfree-sales` — التثبيت قد ينجح بدون الأساس المطلوب |
| **مفيش آلية import تلقائية بين إضافتين** | كل AE تُثبّت وتضيف `boot` files بشكل منعزل؛ لا توجد طريقة قياسية تستورد بها إضافة services من إضافة أخرى |
| **ترتيب boot files غير مضمون** | لو `api.service` يتهيأ في boot بتاع auth، وباقي الإضافات محتاجاه فوراً عند التحميل، فالترتيب الخاطئ يسبب race conditions |
| **WebSocket متعدد** | لو كل إضافة فتحت اتصال Realtime خاص بها → اتصالات مكررة، استهلاك موارد، تعارض في الأحداث |
| **صعوبة الاختبار** | اختبار AE يتطلب تطبيق Quasar مضيف كامل، بعكس npm package عادي يُختبر بمعزل (`vitest`) |

**الخلاصة:** التقسيم حسب المجال في المستند الأصلي صحيح منطقياً، لكنه غير كافٍ تقنياً بدون تحديد أي جزء AE وأي جزء npm package عادي.

---

## 3. القرار المعماري

> **`fastfree-auth` تُبنى كـ npm package عادي (ليست Quasar Extension). باقي الإضافات (accounting, sales, purchase, inventory, hr, crm) تبقى Quasar App Extensions، وتعتمد على `fastfree-auth` كـ npm dependency عادية.**

### لماذا هذا التقسيم بالتحديد؟

| المعيار | fastfree-auth | Business Extensions |
|---|---|---|
| طبيعة المحتوى | منطق/خدمات خالصة (لا UI مرتبط بمجال) | Routes + Pages + Components خاصة بمجال عمل |
| هل يُستخدم داخل Quasar فقط؟ | لا — يمكن استخدامه في أي سياق JS | نعم — مرتبط بالكامل بتطبيق Quasar |
| هل يحتاج حقن UI في تطبيق مضيف؟ | لا (فقط plugin/boot بسيط) | نعم (صفحات، مكونات، قوائم) |
| الأنسب | **npm package** | **Quasar AE** |

هذا يحل المشاكل الأربعة أعلاه دفعة واحدة: الاعتمادية تصبح `package.json` عادي يفهمه npm/pnpm تلقائياً، الاستيراد يصبح `import` قياسي، والاختبار يصبح مباشر.

---

## 4. بنية Monorepo

```text
fastfree-platform/                     ← pnpm workspace root
├── packages/
│   ├── fastfree-auth/                 ← npm package (الأساس)
│   │   ├── src/
│   │   │   ├── services/
│   │   │   ├── stores/                ← Pinia stores
│   │   │   ├── plugins/               ← Vue plugin للتهيئة
│   │   │   └── types/                 ← TypeScript types مشتركة
│   │   ├── tests/
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── fastfree-lowcode/              ← محرك UI منخفض الكود (مشروع منفصل قائم)
│
├── extensions/
│   ├── quasar-app-extension-fastfree-accounting/
│   ├── quasar-app-extension-fastfree-sales/
│   ├── quasar-app-extension-fastfree-purchase/
│   ├── quasar-app-extension-fastfree-inventory/
│   ├── quasar-app-extension-fastfree-hr/
│   └── quasar-app-extension-fastfree-crm/
│       ├── src/
│       │   ├── boot/
│       │   ├── pages/
│       │   ├── components/
│       │   └── services/              ← خدمات خاصة بالمجال فقط
│       ├── install.js                 ← يتحقق من وجود fastfree-auth
│       ├── prompts.js
│       └── package.json               ← "fastfree-auth": "workspace:^"
│
├── apps/                              ← مشاريع العملاء (استهلاك فعلي)
│   ├── fastfree-restaurant/
│   ├── fastfree-pharmacy/
│   ├── fastfree-his/
│   ├── fastfree-crm-standalone/
│   └── fastfree-erp/
│
├── pnpm-workspace.yaml
└── package.json
```

كل مشروع عميل داخل `apps/` يختار فقط الإضافات التي يحتاجها (مثلاً: الصيدلية تحتاج `inventory + accounting + sales` بدون `hr`).

---

## 5. الطبقة الأساسية: fastfree-auth

### 5.1 Authentication
| الوظيفة | الوصف |
|---|---|
| Login | تسجيل دخول عبر Frappe session/token |
| Logout | إنهاء الجلسة وتنظيف الـ cache/store |
| Session Management | تجديد الجلسة، كشف انتهائها، auto-refresh |
| Forgot Password | إرسال رابط/كود استعادة عبر Frappe |
| Change Password | تغيير كلمة المرور مع إعادة التحقق |

### 5.2 Users
- Current User — بيانات المستخدم الحالي (cached)
- User Profile — عرض/تعديل الملف الشخصي
- User Settings — تفضيلات المستخدم (لغة، ثيم، إشعارات)

### 5.3 Roles & Permissions
- Roles — قراءة أدوار المستخدم من Frappe
- User Permissions — قيود على مستوى الـ Document (Frappe User Permissions)
- Permission Checker — دالة موحدة `can(action, doctype)` تُستخدم في كل الإضافات

### 5.4 License
- License Verification — تحقق دوري من صلاحية الترخيص
- License Device — ربط الترخيص بجهاز/instance محدد
- Subscription — حالة الاشتراك (نشط/منتهي/تجريبي)
- Activation — تفعيل أونلاين/أوفلاين
- Expiration — تنبيهات قبل الانتهاء + قفل تدريجي للميزات

### 5.5 Files
- Upload / Download / Preview
- Attachments — ربط الملفات بـ Documents في Frappe
- File Manager — واجهة تصفح موحدة تُستخدم من كل الإضافات

### 5.6 Realtime
- WebSocket — اتصال Frappe socket.io (singleton، انظر [القسم 8](#8-realtime-كـ-singleton))
- Notifications — إشعارات لحظية
- Live Updates — تحديث الـ lists/documents تلقائياً
- Presence — من متصل الآن (مفيد لـ HIS والـ CRM)

### 5.7 الخدمات المشتركة

**طبقة API:**
```
frappe-js-sdk    ← instance واحد يُهيأ مرة واحدة فقط
api.service      ← wrapper حول frappe-js-sdk (retry, error normalization)
request wrapper  ← إضافة headers، معالجة timeout
response wrapper ← تطبيع الأخطاء لصيغة موحدة { success, data, error }
```

**Common Services (الواجهة العامة لكل package):**

| Service | المسؤولية |
|---|---|
| `auth.service` | login/logout/session |
| `api.service` | كل نداءات `/api/resource` و `/api/method` |
| `user.service` | بيانات المستخدم والملف الشخصي |
| `permission.service` | فحص الصلاحيات (`can()`) |
| `license.service` | التحقق من الترخيص |
| `file.service` | رفع/تنزيل/معاينة الملفات |
| `realtime.service` | singleton للـ WebSocket |
| `settings.service` | إعدادات عامة للتطبيق |
| `cache.service` | تخزين مؤقت (metadata, doctype schemas) |
| `storage.service` | تخزين محلي (IndexedDB عبر Dexie.js — مناسب لسيناريوهات POS) |

> **قاعدة صارمة:** أي business extension تحتاج أي من هذه الوظائف **تستوردها من `fastfree-auth`** ولا تُعيد تنفيذها.

---

## 6. طبقة إضافات الأعمال

كل إضافة تتبع نفس البنية القياسية:

```
quasar-app-extension-fastfree-{domain}/
├── install.js       ← يفحص وجود fastfree-auth، يضيف الـ dependency تلقائياً
├── prompts.js        ← أسئلة إعداد اختيارية (اختيار الوحدات الفرعية مثلاً)
├── src/
│   ├── boot/{domain}-boot.js
│   ├── pages/
│   ├── components/
│   ├── router/       ← routes خاصة بالمجال، تُدمج مع router الرئيسي
│   └── services/      ← خدمات خاصة بالمجال فقط (لا تتقاطع مع fastfree-auth)
└── package.json      ← "peerDependencies": { "fastfree-auth": "^1.0.0" }
```

### 6.1 fastfree-accounting
| Modules | Services |
|---|---|
| Chart of Accounts, Journal Entry, Payment Entry, General Ledger, Cost Center, Fiscal Year, Financial Reports | `account`, `journal`, `payment`, `ledger`, `tax`, `fiscal-year`, `report` |

### 6.2 fastfree-sales
| Modules | Services |
|---|---|
| Customer, Contact, Address, Quotation, Sales Order, Delivery Note, Sales Invoice, Sales Reports | `customer`, `quotation`, `sales-order`, `delivery`, `invoice`, `pricing`, `report` |

### 6.3 fastfree-purchase
| Modules | Services |
|---|---|
| Supplier, Purchase Order, Purchase Receipt, Purchase Invoice, Supplier Quotation, Purchase Reports | `supplier`, `purchase-order`, `receipt`, `invoice`, `pricing`, `report` |

### 6.4 fastfree-inventory
| Modules | Services |
|---|---|
| Item, Item Group, Warehouse, Stock Entry, Stock Ledger, Serial Number, Batch, Inventory Reports | `item`, `warehouse`, `stock-entry`, `stock-ledger`, `serial`, `batch`, `report` |

### 6.5 fastfree-hr
| Modules | Services |
|---|---|
| Employee, Department, Designation, Attendance, Leave, Shift, Payroll, HR Reports | `employee`, `department`, `attendance`, `leave`, `payroll`, `shift`, `report` |

### 6.6 fastfree-crm
| Modules | Services |
|---|---|
| Lead, Opportunity, Customer Follow-up, Activity, Meeting, Call Log, CRM Reports | `lead`, `opportunity`, `activity`, `followup`, `meeting`, `report` |

> **ملاحظة:** `pricing.service` مذكورة في كل من sales وpurchase — يجب أن تكون واجهة موحدة (interface واحد) حتى لو التنفيذ مختلف قليلاً، لتفادي ازدواجية منطق التسعير. يُنصح بنقلها لاحقاً إلى package مشترك ثالث (`fastfree-pricing`) عند أول تكرار فعلي مؤكد.

---

## 7. آلية التهيئة والترتيب

### المشكلة
Quasar لا يضمن ترتيب تحميل الـ boot files القادمة من إضافات مختلفة تلقائياً.

### الحل

**أ. فحص الاعتمادية عند التثبيت** (`install.js` لكل business extension):

```js
// extensions/quasar-app-extension-fastfree-sales/install.js
module.exports = function (api) {
  if (!api.hasExtension('fastfree-auth-boot')) {
    console.error('❌ يجب تثبيت fastfree-auth أولاً:')
    console.error('   pnpm add fastfree-auth')
    console.error('   quasar ext add fastfree-auth-boot')
    process.exit(1)
  }
  api.extendPackageJson({
    dependencies: { 'fastfree-auth': 'workspace:^1.0.0' }
  })
}
```

**ب. ترتيب صريح في `quasar.config.js` للتطبيق النهائي:**

```js
boot: [
  'fastfree-auth-init',     // ← دائماً أول عنصر — يهيئ api.service + realtime
  'fastfree-sales-boot',
  'fastfree-inventory-boot',
  'fastfree-accounting-boot'
]
```

**ج. تهيئة مركزية واحدة:**

```js
// boot/fastfree-auth-init.js
import { initFastFreeAuth } from 'fastfree-auth'

export default async ({ app }) => {
  await initFastFreeAuth({
    baseUrl: process.env.FRAPPE_URL,
    app
  })
  // بعد هذه النقطة: auth.service, api.service, realtime.service جاهزة للاستخدام
}
```

كل business boot لاحق يفترض أن `fastfree-auth` جاهزة، ولا يعيد تهيئتها.

---

## 8. Realtime كـ Singleton

```js
// fastfree-auth/src/services/realtime.service.js
let socketInstance = null

export function getRealtimeConnection(config) {
  if (!socketInstance) {
    socketInstance = createFrappeSocket(config)
  }
  return socketInstance
}

export function disconnectRealtime() {
  socketInstance?.disconnect()
  socketInstance = null
}
```

**الحقن في التطبيق:**

```js
// داخل initFastFreeAuth()
const realtime = getRealtimeConnection(config)
app.provide('realtime', realtime)
app.config.globalProperties.$realtime = realtime
```

**الاستخدام من أي business extension:**

```js
import { inject } from 'vue'
const realtime = inject('realtime')
realtime.on('doc_update', handler)
```

> **قاعدة:** ممنوع نهائياً استدعاء `socket.io-client` أو أي مكتبة WebSocket مباشرة من داخل أي business extension.

---

## 9. إدارة الحالة

- **Pinia** كمكتبة state موحدة (متوافقة مع Vue 3 / Quasar).
- `fastfree-auth` توفّر stores أساسية: `useAuthStore`, `usePermissionStore`, `useLicenseStore`, `useSettingsStore`.
- كل business extension تعرّف stores خاصة بمجالها فقط (مثلاً `useSalesCartStore`) ولا تُعيد تعريف auth/permission stores.
- التخزين المحلي (offline/POS) عبر `storage.service` المبني على **Dexie.js** — واجهة موحدة، والتنفيذ الفعلي (IndexedDB) مخفي عن باقي الإضافات.

---

## 10. نظام الإصدارات

| Package | استراتيجية |
|---|---|
| `fastfree-auth` | Semantic Versioning صارم؛ أي breaking change في service API → major version |
| Business Extensions | تحدد `peerDependency` بمدى متوافق (`^1.0.0`) وليس نسخة مثبتة |
| النشر | GitHub Packages (متسق مع بنية Forgejo/GHCR الحالية) عبر Forgejo Actions |

يُنصح باستخدام `changesets` لإدارة الإصدارات داخل الـ pnpm monorepo لتفادي عدم تطابق النسخ بين packages/extensions.

---

## 11. الاختبار

| المستوى | الأداة | النطاق |
|---|---|---|
| Unit — `fastfree-auth` services | Vitest | كل service بمعزل (mock لـ `frappe-js-sdk`) |
| Unit — business services | Vitest | منطق خاص بالمجال (حسابات تسعير، إلخ) |
| Integration | Vitest + mock Frappe server | تدفق auth → api call → response |
| E2E | Playwright | سيناريو كامل داخل تطبيق عميل حقيقي (تسجيل دخول → فتح فاتورة مبيعات) |

**قاعدة:** لا تُدمج أي إضافة أعمال في `main` بدون tests تغطي التكامل مع `fastfree-auth` (mock كافٍ، لا حاجة لتطبيق Quasar كامل).

---

## 12. CI/CD

يتماشى مع البنية التحتية الحالية (Forgejo Actions + GHCR):

1. **عند push لأي package/extension:** تشغيل lint + unit tests فقط لهذا الجزء (باستخدام `pnpm --filter`).
2. **عند تعديل `fastfree-auth`:** تشغيل اختبارات التكامل لكل الإضافات التي تعتمد عليها (regression check).
3. **عند release:** بناء ونشر الـ package/extension المتأثر فقط على GitHub Packages، مع تاج `semver`.
4. **نشر تطبيقات العملاء (`apps/*`):** صورة Docker منفصلة لكل عميل، تُبنى بعد تحديث الاعتماديات، وتُنشر عبر Dokploy كالمعتاد.

---

## 13. Dependency Graph الكامل

```text
                    ┌─────────────────────┐
                    │   fastfree-auth      │   ← npm package (ليست AE)
                    │ (auth/perm/license/  │
                    │  files/realtime)     │
                    └──────────┬───────────┘
                               │ npm dependency (peerDependency)
        ┌──────────┬───────────┼───────────┬──────────┬──────────┐
        ▼          ▼           ▼           ▼          ▼          ▼
  accounting     sales      purchase    inventory     hr        crm
   (AE)          (AE)        (AE)        (AE)        (AE)       (AE)

        كل الإضافات أعلاه مستقلة عن بعضها البعض —
        الاعتماد الوحيد المشترك هو fastfree-auth
```

> **تصحيح مهم عن المخطط الأصلي:** المخطط الأصلي رسم سلسلة خطية (accounting → sales → purchase → inventory → hr → crm) وكأن كل إضافة تعتمد على التي قبلها. هذا غير دقيق منطقياً — لا يوجد سبب تقني يجعل `fastfree-hr` تعتمد على `fastfree-purchase` مثلاً. العلاقة الصحيحة **نجمية**: كل الإضافات تعتمد فقط على `fastfree-auth` مباشرة، وهي مستقلة تماماً عن بعضها. هذا يسمح لمشروع الصيدلية مثلاً باستخدام `inventory + sales + accounting` فقط دون الحاجة لتثبيت `hr` أو `crm`.

---

## 14. قواعد المعمارية الملزمة

1. `fastfree-auth` هي npm package مستقل، وليست Quasar App Extension.
2. جميع Business Extensions تعتمد على `fastfree-auth` كـ `peerDependency`، والاعتماد بينها وبين بعضها البعض **ممنوع**.
3. `frappe-js-sdk` يُهيأ مرة واحدة فقط داخل `api.service`، ولا يُستورد مباشرة في أي مكان آخر.
4. أي نداء لـ Frappe (سواء `/api/resource` أو `/api/method`) يمر حصراً عبر `api.service`.
5. أي عملية مستخدم (تسجيل دخول، جلسة، ملف شخصي) تمر حصراً عبر `auth.service`.
6. أي تحقق من صلاحية يمر حصراً عبر `permission.service.can()`.
7. أي تحقق من ترخيص يمر حصراً عبر `license.service`.
8. أي رفع/تنزيل ملف يمر حصراً عبر `file.service`.
9. اتصال Realtime واحد فقط لكل تطبيق، عبر `realtime.service` (singleton) — ممنوع إنشاء اتصال WebSocket مباشر من أي extension.
10. `boot` الخاص بـ `fastfree-auth` يجب أن يكون دائماً أول عنصر في مصفوفة `boot` بملف `quasar.config.js`.
11. كل business extension تحتوي فقط على الخدمات/الصفحات/المكونات الخاصة بمجالها، ولا تعيد تنفيذ أي service موجود في `fastfree-auth`.
12. أي منطق مشترك بين إضافتين (مثل `pricing.service`) يُستخرج لاحقاً كـ package ثالث مشترك بدل تكراره.
13. لا يُدمج أي كود جديد بدون unit tests تغطي التكامل مع `fastfree-auth`.

---

## 15. المخاطر والتحديات

| الخطر | الاحتمالية | التأثير | التخفيف |
|---|---|---|---|
| تغيير breaking في `fastfree-auth` يكسر كل الإضافات دفعة واحدة | متوسطة | عالي | Semantic Versioning صارم + اختبارات تكامل في CI قبل أي release |
| نسيان فحص `install.js` عند إضافة business extension جديدة | متوسطة | متوسط | فحص برمجي إلزامي + توثيق واضح في README |
| تكرار منطق التسعير بين sales/purchase يتباعد بمرور الوقت | متوسطة | متوسط | مراجعة دورية + استخراج `fastfree-pricing` عند أول تكرار فعلي مؤكد |
| تعقيد إضافي في البداية (تعلم بنية monorepo + peerDependencies) | عالية | منخفض | توثيق onboarding واضح لأي مطور جديد ينضم للمشروع |
| مشروع HIS يحتاج موديلات لا تتوافق تماماً مع نمط ERP العام (PICU/بنك دم) | متوسطة | متوسط | هذه الموديلات تبقى خارج `fastfree-auth` تماماً، كـ extension مستقل (`fastfree-his`) يستهلك نفس القاعدة |

---

## 16. خطة التنفيذ المرحلية

### المرحلة 1 — الاستخراج
- استخراج `fastfree-auth` من الكود الحالي كـ npm package مستقل داخل الـ pnpm monorepo.
- كتابة unit tests أساسية لكل service قبل النشر الأول.
- نشر أول نسخة (`v0.1.0`) على GitHub Packages.

### المرحلة 2 — إثبات المفهوم
- تحويل إضافة موجودة حالياً (الأنسب: `fastfree-sales` لأنها الأكثر نضجاً) لتستهلك `fastfree-auth` كـ `peerDependency` بدل الكود المدمج.
- التأكد من عمل `boot` sequence بشكل صحيح في تطبيق تجريبي واحد.

### المرحلة 3 — التعميم
- تطبيق نفس النمط على `inventory` ثم `accounting` ثم `purchase`.
- كتابة `install.js` الموحد وتوثيقه كـ template يُستخدم لأي إضافة جديدة.

### المرحلة 4 — الاختبار متعدد الإضافات
- تجربة سيناريو تثبيت حقيقي: تطبيق صيدلية (`inventory + sales + accounting`) وتطبيق مطعم (`sales + inventory` فقط) في نفس الوقت من نفس الـ packages، للتأكد من عدم وجود تعارض في boot order أو realtime singleton.

### المرحلة 5 — HR وCRM ومشروع HIS
- إضافة `hr` و`crm` بنفس النمط.
- تقييم `Holool-HIS` كـ extension مستقل يستهلك `fastfree-auth` مباشرة (وليس عبر سلسلة اعتماديات كما في المخطط الأصلي)، نظراً لطبيعته الخاصة.

---

## 17. ملحق: مقارنة مع المخطط الأصلي

| البند | المخطط الأصلي | النسخة المعدّلة |
|---|---|---|
| نوع `fastfree-auth` | Quasar App Extension | npm package عادي |
| علاقة الإضافات ببعضها | سلسلة خطية (accounting→sales→purchase→...) | نجمية — كلها تعتمد فقط على auth مباشرة |
| آلية مشاركة الخدمات | ضمنية (غير محددة تقنياً) | `import` صريح عبر npm dependency |
| ترتيب التحميل | غير مضمون | صريح عبر `boot` array + فحص install.js |
| Realtime | غير محدد إن كان singleton | singleton مُلزم عبر `provide/inject` |
| الاختبار | غير مذكور | استراتيجية كاملة (unit/integration/E2E) |
| الإصدارات | غير مذكور | Semantic Versioning + changesets |
