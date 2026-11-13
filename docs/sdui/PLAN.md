# خطة بناء منصة FastFree SDUI — نظير stac.dev لـFastFree

> الحالة: مسودة خطة كاملة (2026-11-13)
> الهدف: منصة Server-Driven UI مفتوحة ذاتيًا الاستضافة، للتطبيقات المبنية بـVue 3 + Quasar + Tauri، تُحدّث واجهاتها فورًا من خادم دون إعادة بناء أو متاجر تطبيقات.

---

## 1. الرؤية

بناء منصة شبيهة بـ[stac.dev](https://stac.dev) لكن لـFastFree:

- التطبيق (Quasar/Tauri) **لا يحمل الواجهات** — يستقبل JSON من الخادم ويرسمه.
- تحديث الواجهة فورًا يصل 100% من المستخدمين خلال ثوانٍ.
- استضافة ذاتية كاملة، MIT، بلا اعتماد على سحابة خارجية.
- متوافقة مع نموذج **Quasar App Extension** و**Tauri** القائمين في المشروع.
- Execute عبر **Opencode fastfree_board** (دورة الحياة الأوتوماتيكية: backlog → ready → progress → review → done).

## 2. النطاق

**ضمن النطاق:**
- خادم توصيل شاشات (إصدارات + قنوات + استهداف + ETag/versionHash).
- عميل `ScreenLoader` داخل `fastfree_lowcode` (جلب + كشف SWR + أوفلاين + رجوع للمدمج).
- Console ويب لإدارة الشاشات ونشرها.
- CLI (`fastfree-sdui`) للتحقق والمعاينة والنشر.
- كتالوج ويدجتات + آلية إضافات.
- ثيم ديناميكي من الخادم + تنقل ديناميكي.
- دفع فوري (WebSocket/SSE).

**خارج النطاق (Stage 1):**
- Flutter (المنصة لـVue/Quasar).
- سحابة مدارة تجارية (الاستضافة الذاتية فقط).
- محرر بصري كامل (المدرّب الحالي `SduiPlayground` يُسرّب لاحقًا).

## 3. الوضع الحالي — الأصول الموجودة

| الأصل | المسار | الحالة |
|---|---|---|
| محرك الرسم | `packages/fastfree_lowcode/src/runtime/sdui/SduiNode.vue` + `SduiRegistry.ts` | يعمل |
| حلّاق القيم | `sdui/resolve.ts` (تراكم `{ar,en}` + `{{ }}` + `var(--token)`) | يعمل |
| منفّذ الأحداث | `sdui/SduiActionDispatcher.ts` (`tauri:invoke`, `state:set`, `notify`, `navigate`) | يعمل |
| الكشف | `sdui/SduiCacheManager.ts` (L1 ذاكرة + L2 Dexie، SWR) | يعمل |
| مصمم/معاينة | `sdui/SduiPlayground.vue` (v1.0) | يعمل |
| سجل الشاشات | `apps/fastfree_installer/src/schemas/screens.ts` + JSON schemas | يعمل |
| أداة التحقق | `apps/fastfree_installer/scripts/verify-sdui-screens.cjs` | يعمل |
| **العقد المشترك (SDUI-01)** | `packages/fastfree_sdui/contract` (types + Zod + كتالوج ويدجتات) | **يعمل — lowcode يعيد تصديره type-only، و16 شاشة موجودة تمر جميعها** |
| مخططات الوحدات | `packages/fastfree_panel/src/schemas/*.json` + `fastfree_sales` + `fastfree_accounting` | يعمل |
| خلفية لوحة القيادة | `packages/fastfree_panel/backend` (Hono + Zod + MCP SDK) | نمط قابل للتكرار |

**الفجوة:** لا يوجد خادم توصيل، ولا Console، ولا CLI، ولا دفع فوري، ولا استهداف/إصدارات بمعنى المنصة.

## 4. المعمارية

```
┌─────────────────────────────────────────────────────────────┐
│  Console (Quasar/Next)         CLI (Bun)                     │
│  إدارة الشاشات / نشر            validate | preview | deploy  │
└───────────────┬───────────────────────────┬─────────────────┘
                │                           │
                ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│  خادم FastFree SDUI  (Hono + Zod + SQLite/libsql)           │
│  ─ الشاشات والإصدارات والقنوات والاستهداف ومفاتيح API       │
│  ─ GET /v1/screens/:id  (ETag + versionHash)                │
│  ─ WebSocket /v1/push  (إبطال الكشف)                        │
└───────────────┬─────────────────────────────────────────────┘
                │ HTTP (SWR) + WS
                ▼
┌─────────────────────────────────────────────────────────────┐
│  عميل lowcode SDUI                                           │
│  ScreenLoader → SduiCacheManager (L1+L2) → SduiNode         │
│  رجوع للشاشات المدمجة عند غياب الشبكة                         │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 الحزم الجديدة

| الحزمة | المسار | الدور |
|---|---|---|
| `fastfree_sdui` | `packages/fastfree_sdui` | العقد المشترك (types + Zod schemas) + الخادم + Console |
| `fastfree_sdui/cli` | `packages/fastfree_sdui/cli` | واجهة سطر الأوامر |
| `fastfree_lowcode` (مُعدّل) | `packages/fastfree_lowcode` | `ScreenLoader` + ربط الشبكة بالمحرك الحالي |

## 5. عقد البيانات (Screen Contract)

يستمد من العقد الحالي `SduiScreen` في `sdui/types.ts:55` ويوسّعه:

```ts
interface SduiScreen {
  id: string
  versionHash: string            // إلزامي في الخادم (hash للمحتوى)
  title?: string | { ar?: string; en?: string }
  root: SduiNode                 // العقدة الجذر (type/props/children/events/model)
  state?: Record<string, any>    // الحالة الابتدائية
  meta?: SduiScreenMeta          // بيانات وصفية للمنصة
}

interface SduiScreenMeta {
  app: string                    // التطبيق المستهدف (installer/panel/erp/...)
  module?: string                // الوحدة (sales/accounting/...)
  minAppVersion?: string         // حد أدنى لإصدار التطبيق
  locales?: string[]             // لغات مدعومة (افتراضي ar,en)
  tags?: string[]
  updatedAt: number
}
```

**العقدة `SduiNode` تبقى كما هي** (`type`, `id`, `text`, `props`, `class`, `style`, `children`, `events`, `model`) — لا كسر للتوافق مع المحرك الحالي.

**نسخة الخادم الموسّعة (لسانات النشر):**

```ts
interface StoredScreen {
  id: string
  channel: 'draft' | 'stable' | 'beta'
  version: number
  versionHash: string
  screen: SduiScreen
  targeting?: TargetRule[]       // قواعد استهداف (version/locale/app/نسبة)
  publishedAt?: number
}
```

## 6. واجهة الخادم (API)

| Method | Path | الوصف |
|---|---|---|
| GET | `/health` | فحص الحياة |
| GET | `/v1/screens/:id?channel=&app=&locale=&version=` | جلب شاشة + `ETag` + `versionHash` |
| GET | `/v1/screens/:id/versions` | سجل الإصدارات |
| POST | `/v1/screens` | إنشاء/تحديث مسودة |
| POST | `/v1/screens/:id/publish` | نشر (draft → channel) |
| POST | `/v1/screens/:id/rollback` | رجوع لإصدار سابق |
| GET | `/v1/push` (WS) | دفع فوري لإبطال الكشف |
| GET | `/v1/console/*` | واجهات Console |

**الرجوع عند فشل الشبكة:** يستخدم العميل آخر شاشة ناجحة من الكشف (SWR) ثم الشاشات المدمجة.

## 7. عميل Tauri/Quasar

- `ScreenLoader` (داخل lowcode): `load(id, opts)` → يجلب، يكتب في `SduiCacheManager`، يعيد `SduiScreen`؛ عند الفشل يرجع الكشف ثم المدمج.
- ربط عبر **Quasar App Extension** قائمة الجاهز: `boot/sdui.ts` يسجّل `ScreenLoader` كـsingleton ويحقنه في `SduiPlayground`/`SduiNode`.
- في **Tauri**: أمر Rust `sdui_load` اختياري لتسريع القراءة من القرص المحلي؛ الشبكة تبقى عبر `fetch` في الـwebview مع إعداد CORS للخادم الذاتي.
- **الثيم الديناميكي**: الخادم يرسل `tokens` (CSS vars) ترد على `:root` عبر مسار `sdui/resolve.ts` الموجود.
- **التنقل الديناميكي**: تسجيل مسارات من `screen.meta.routes` وإجراء `navigate` القائم.

## 8. الأمان (حاسم)

- **قائمة سماح للأفعال**: الخادم يوقّع الشاشات؛ العميل يرفض أي `action.type` ليس في قائمة بيضاء (`state:set`, `notify`, `navigate`, و`tauri:invoke` بتوأمر مسموحة فقط).
- **توقيع الشاشات**: `versionHash` + توقيع HMAC بمفتاح الخادم؛ العميل يتحقق قبل الرسم.
- **CORS صارم**: الخادم لا يفتح إلا لنطاقات FastFree.
- **لا تنفيذ عشوائي**: الـJSON يُرسم بمكونات مسجلة فقط (SduiRegistry)، لا `v-html` ولا `eval` للمواد القادمة من الخادم (تعبيرات `{{ }}` للقراءة فقط).

## 9. المراحل

### P0 — العقد والمعاهد (الأسبوع 1)

> **الحالة (2026-11-13):** ✅ SDUI-01 منتهي عبر البورد — `packages/fastfree_sdui/contract/` (types + Zod + widget catalog) و`tests/contract.test.ts` — **91/91 اختبار ناجح** عبر `npx vitest run --project fastfree-sdui`. البطاقة في عمود `review` على البورد.

- تثبيت `SduiScreen`/`SduiNode` في حزمة عقد مشتركة `fastfree_sdui/contract`.
- محقق Zod للشاشات + كتالوج الويدجتات.
- مخرجات: `packages/fastfree_sdui/contract/*`, اختبارات, دليل العقد.
- قبول: كل الشاشات الموجودة (installer + panel) تمر من المحقق.

> **الحالة (2026-11-13، SDUI-01):** منجز. العقد القانوني في `packages/fastfree_sdui/contract`
> (types + screen.schema + كتالوج الويدجتات المطابق لـSduiRegistry)، و`fastfree_lowcode/src/runtime/sdui/types.ts`
> أصبح جسر إعادة تصدير type-only (لا تكرار ولا كسر). كل الشاشات الـ16 الموجودة
> (12 installer + 2 panel + 1 sales + 1 accounting) تمر من المخطط غير تدميريًا
> (91 اختبارًا في `packages/fastfree_sdui/tests/contract.test.ts`)، و`vue-tsc` للمثبّت نظيف.

### P1 — التوصيل المحلي (الأسبوع 1-2)
- خادم Hono + SQLite: تخزين/استرجاع/ETag.
- `ScreenLoader` في lowcode + كشف SWR + رجوع للمدمج.
- شاشة تجريبية تُخدَم من الخادم وتُرسم في التطبيق.
- مخرجات: خادم يعمل، عميل يجلب، عرض فعلي.
- قبول: تشغيل الخادم محليًا + التطبيق يرسم شاشة من الخادم دون إعادة بناء.

> **الحالة (SDUI-05):** منجز. خادم `packages/fastfree_sdui/server` (seeded `home` + `sdui-demo`)،
> عميل `packages/fastfree_sdui/client/ScreenLoader.ts` (SWR + fallback + forceRefresh) مع إعادة تصدير في lowcode،
> مكوّن `SduiRemoteScreen.vue` للرسم، واختبارات `screen-loader.test.ts` (99/99 ناجح).

### P2 — النشر وConsole وCLI (الأسبوع 2-3)
- Console ويب (إدارة/معاينة/نشر).
- CLI (`validate`, `preview`, `deploy`).
- إصدارات + قنوات + رجوع.
- قبول: نشر شاشة من Console/CLI ثم تظهر في التطبيق.

### P3 — الفوري والاستهداف (الأسبوع 3-4)
- WebSocket/SSE push + إبطال كشف.
- استهداف (تطبيق/إصدار/لغة/نسبة) + ثيم حي.
- قبول: تحديث يصل للمستخدم خلال ثوانٍ دون إعادة تشغيل.

### P4 — البيئة (الأسبوع 4+)
- مولّد مخططات (Vue → SDUI JSON)، ويدجتات خارجية، توثيق، أمثلة.
- قبول: مطور خارجي يضيف ويدجت وينشرها دون تعديل النواة.

## 10. التنفيذ عبر Opencode fastfree_board

دورة حياة كل مرحلة تسير على البورد:

```
backlog (إنشاء المهمة) → ready (autoPromote) → progress (autoStart يفتح جلسة)
→ review (auto-move بعد نجاح الجلسات) → done (autoReview)
```

مهام البورد المُقترحة (تُنشأ عند توفر الوكلاء):

| المهمة | المرحلة | الوصف |
|---|---|---|
| SDUI-01 عقد الشاشة | P0 | تثبيت العقد + Zod + كتالوج |
| SDUI-02 المحقق | P0 | توسيع verify tool + اختبارات |
| SDUI-03 خادم التوصيل | P1 | Hono + SQLite + ETag |
| SDUI-04 ScreenLoader | P1 | عميل + كشف + رجوع |
| SDUI-05 شاشة تجريبية | P1 | عرض فعلي من الخادم |
| SDUI-06 Console | P2 | لوحة إدارة ونشر |
| SDUI-07 CLI | P2 | validate/preview/deploy |
| SDUI-08 الإصدارات والقنوات | P2 | نشر + رجوع |
| SDUI-09 الدفع الفوري | P3 | WS + إبطال |
| SDUI-10 الاستهداف والثيم | P3 | قواعد + ثيم حي |
| SDUI-11 المولّد | P4 | Vue → JSON |
| SDUI-12 الويدجتات الخارجية | P4 | آلية إضافات |

**عائق التنفيذ:** OpenCode حاليًا عند حد الاستخدام المجاني (`429 provider.free-limit`). يُنشأ المهام فور توفر الوكلاء أو ربط مزود.

## 11. المخاطر

| الخطر | التخفيف |
|---|---|
| تنفيذ أوامر عن بُعد عبر JSON | قائمة سماح + توقيع + سجل مكونات مغلق |
| انحراف العقد بين الخادم والعميل | حزمة عقد مشتركة + إصدارات دلالية + محقق |
| عدم اتساق الكشف | SWR + versionHash + رجوع للمدمج |
| تجمّد الواجهة في أول تشغيل | شاشات مدمجة افتراضية + تحديث تدريجي |
| كلفة بناء المولّد الكامل | تأجيله لـP4 والتركيز على P1 |
| حد استخدام OpenCode المجاني | ربط مزود أو جدولة التنفيذ بعد إعادة الضبط |

## 12. القرارات المعمارية

1. **العقد مشترك** بين الخادم والعميل (حزمة `fastfree_sdui/contract`) — لا تكرار.
2. **الخادم Hono + SQLite** — مطابق لنمط Panel القائم، حر ومحلي.
3. **العميل داخل lowcode** — يعيد استخدام SduiNode/resolve/cache/dispatcher القائمة.
4. **لا كسر للتوافق** — `SduiNode` كما هو، والإضافات في `meta` والطبقات الجديدة.
5. **الأمان أولًا** — قائمة السماح والتوقيع قبل أي نشر.
6. **التنفيذ عبر البورد** — كل مهمة على البورد، والتقدم يُرى في دورة الحياة الأوتوماتيكية.
