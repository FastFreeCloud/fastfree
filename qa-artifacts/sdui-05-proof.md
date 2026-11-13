# SDUI-05 — شاشة تجريبية من الخادم (P1) — إثبات

## 1. الخادم (Hono + SQLite)

- تشغيل: `SDUI_DB_PATH=./sdui.db node packages/fastfree_sdui/server/src/server.ts`
- فحص Leben: `GET /health` → `{ "data": { "status": "ok" } }`
- الشاشة التجريبية: `GET /v1/screens/sdui-demo` (seeded on first run) → 200 + `ETag`.

## 2. العميل (ScreenLoader)

- `packages/fastfree_sdui/client/ScreenLoader.ts` (إعادة تصدير في lowcode: `quasar-app-extension-fastfree-lowcode/sdui/ScreenLoader`).
- `SduiRemoteScreen.vue` يرسم الشاشة من الخادم عبر `SduiNode`.
- SWR: إرجاع الكشف فورًا + إعادة تحقق في الخلفية؛ `forceRefresh` لجلب فوري.

## 3. تحقق التحديث

1. `POST /v1/screens` (screen.id = sdui-demo) → 201 (version جديد).
2. `POST /v1/screens/sdui-demo/publish` → 200.
3. `GET /v1/screens/sdui-demo` (أو `ScreenLoader.load('sdui-demo', { forceRefresh: true })`) → يعرض المحتوى المحدّث (versionHash جديد).

لقطة قبل: `qa-artifacts/sdui-05-screen.json` (version 1, seeded).
لقطة بعد: `qa-artifacts/sdui-05-screen-updated.json` (version 2, "تم التحديث" / "محتوى جديد").

## 4. الاختبارات

- `packages/fastfree_sdui/server`: `node --test tests/*.test.ts` → 8/8 ناجح.
- `packages/fastfree_sdui`: `npx vitest run --project fastfree-sdui` → 113/113 ناجح (95 عقد + 18 ScreenLoader).
- `packages/fastfree_lowcode`: `npx vitest run` → ScreenLoader re-export ناجح.
- typecheck server: `tsc` ناجح. typecheck SDUI-related (root tsc) ناجح (لا أخطاء في ScreenLoader/SduiRemoteScreen).

## 5. الملفات

- `qa-artifacts/sdui-05-screen.json` — لقطة الشاشة (JSON) من الخادم (قبل التحديث).
- `qa-artifacts/sdui-05-screen-updated.json` — بعد التحديث.