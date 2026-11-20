---
tags: [obsidian, rest-api, plugin, mcp, knowledge]
date: 2026-11-20
status: verified-manifest
verified_by: "obsidian_check_status في هذه الجلسة (manifest + certificate + state)"
---

# Obsidian Local REST API

> [!info] حالة التحقق
> **متحقق آليًا في هذه الجلسة:** الـ manifest الكامل، الإصدارات، المصادقة، المنافذ،
> وحالة `metadataCache`. أما **مسارات وترويسات HTTP التفصيلية** فهي من توثيق الـ plugin
> ولم تُختبر آليًا هنا (لا shell/curl ولا وصول ويب) — موسومة أدناه.

## ما هو

إضافة Obsidian تعمل على **سطح المكتب فقط** وتُشغّل خادمًا محليًا آمنًا يعطي برامج أخرى
(OmniRoute، سكربتات، وكلاء) وصولًا للـ vault عبر HTTP، **بالإضافة إلى خادم MCP**.
هي الطبقة التي يستخدمها OmniRoute كـ *Obsidian Context Source*.

### بيانات مُتحقَّقة (من `obsidian_check_status`)

| الحقل | القيمة |
|---|---|
| `manifest.id` | `obsidian-local-rest-api` |
| `manifest.name` | **Local REST API with MCP** |
| `version` | `5.5.2` |
| `author` | Adam Coddington (`https://adamcoddington.net/`) |
| `minAppVersion` | `1.13.1` |
| `isDesktopOnly` | `true` |
| إصدار Obsidian الفعلي | `1.15.1` |
| `service` | Obsidian Local REST API |
| `authenticated` | `true` |
| شهادة HTTPS | صالحة ~364 يومًا · `regenerateRecommended: false` |
| `state.metadataCache` | `listeningSince: 2026-11-20T16:59:52Z` · `lastResolvedAt` / `lastActivityAt` محدّثان |

## المنافذ والمصادقة

| المنفذ | البروتوكول | الاستخدام |
|---|---|---|
| `27123` | HTTP | **المسار الموصى به** للتكامل المحلي (OmniRoute) |
| `27124` | HTTPS (شهادة موقّعة ذاتيًا) | للعملاء الذين يرفضون HTTP فقط — يتطلب تجاهل تحقق الشهادة |

- **المصادقة:** `Authorization: Bearer <API_KEY>` على كل طلب. المفتاح من:
  Obsidian → Settings → Local REST API → API Key.
- **من داخل Docker:** استخدم `http://host.docker.internal:27123` بدل `127.0.0.1`.
- **HTTPS + شهادة ذاتية:** لا تُلغِ التحقق في Docker على العموم؛ استخدم HTTP داخليًا.

## واجهة HTTP (من توثيق الـ plugin — *غير متحقق آليًا هنا*)

| العملية | المسار | ملاحظات |
|---|---|---|
| حالة الخادم | `GET /` | يعيد الـ manifest + `authenticated` (وهو ما تستخدمه `obsidian_check_status`) |
| قراءة ملاحظة | `GET /vault/{path}` | ترويسة `Accept: application/vnd.olrapi.note+json` تُرجع metadata |
| إنشاء/استبدال | `PUT /vault/{path}` | **استبدال كامل** |
| إضافة | `POST /vault/{path}` | إضافة لنهاية الملف |
| تعديل جراحي | `PATCH /vault/{path}` | ترويسات `Operation`, `Target-Type`(heading/block/frontmatter), `Target`, `Create-Target-If-Missing` |
| حذف | `DELETE /vault/{path}` | |
| سرد مجلد | `GET /vault/{dir}/` | |
| بحث بسيط | `POST /search/simple/?query=...&contextLength=...` | |
| بحث JsonLogic | `POST /search/` | نفس محرّك `obsidian_search_structured` |
| الأوامر | `GET /commands/` · `POST /commands/{id}/` | |
| الملف النشط | `GET /active/` | |
| ملاحظة دورية | `GET /periodic/{daily\|weekly\|monthly\|...}/` | |
| فتح ملف | `POST /open/{path}` | |

> ترويسات المحتوى: `Content-Type: text/markdown` للكتابة، و
> `Content-Type: application/vnd.olrapi.note+json` لقراءة JSON.

## التكامل مع OmniRoute

1. Obsidian → Settings → Local REST API → تمكين **HTTP server** على `27123` (لا HTTPS).
2. انسخ الـ API Key.
3. OmniRoute → Context Sources → Obsidian:
   - Base URL: `http://host.docker.internal:27123`
   - Token: `<API_KEY>`
4. أو عبر الـ API: `POST /api/settings/obsidian`.
5. التحقق: `obsidian_check_status` → `status: OK`, `authenticated: true`.
6. للـ plugins الذكية داخل Obsidian: Base URL `http://127.0.0.1:20128/v1` + مفتاح OmniRoute + نموذج `omniroute/auto`.

## أخطاء شائعة (Pitfalls)

| # | الخطأ | الأثر | الصواب |
|---|---|---|---|
| 1 | استخدام `27124` (HTTPS) للربط من Docker | فشل TLS (شهادة ذاتية) | استخدم `27123` (HTTP) داخليًا |
| 2 | `127.0.0.1` من داخل حاوية | يشير للحاوية نفسها لا للمضيف | `host.docker.internal` |
| 3 | اعتبار `PUT` دمجًا | مسح المحتوى الموجود | `POST` للإضافة أو `PATCH` للتعديل |
| 4 | مسار مطلق أو `%2F` في البداية | 404 | مسار نسبي مُرمَّز (URL-encoded) |
| 5 | نسيان `Bearer` أو المفتاح | 401 | الترويسة كاملة: `Authorization: Bearer <key>` |
| 6 | العمل على الهاتف/مزامنة | الإضافة **desktop-only** | لا خادم REST على الموبايل (استخدم SelfSync/WebDAV) |
| 7 | نسخ المفتاح إلى ملاحظة داخل الـ vault | الـ vault يُرفع إلى GitHub | احفظه خارج الـ vault أو في متغير بيئة |
| 8 | تعديل ملفات الـ vault من الخارج ثم قراءتها فورًا | `metadataCache` قد لا يكون حدّث الفهرس | راجع `lastResolvedAt`/`lastActivityAt` أو أعد القراءة |
| 9 | تعطيل الإضافة أثناء عمل الوكلاء | كل أدوات `obsidian_*` تفشل | الإضافة يجب أن تبقى مفعّلة وObsidian مفتوحًا |

## مثال قصير

تحقق من الحالة:

```bash
curl -sk -H "Authorization: Bearer $OBSIDIAN_KEY" http://127.0.0.1:27123/
```

قراءة ملاحظة مع metadata:

```bash
curl -s -H "Authorization: Bearer $OBSIDIAN_KEY" \
     -H "Accept: application/vnd.olrapi.note+json" \
     "http://127.0.0.1:27123/vault/OmniRoute/Overview.md"
```

إضافة سطر:

```bash
curl -s -X POST -H "Authorization: Bearer $OBSIDIAN_KEY" \
     -H "Content-Type: text/markdown" \
     --data "- نقطة جديدة" \
     "http://127.0.0.1:27123/vault/Knowledge/OmniRoute%20MCP.md"
```

تعديل جراحي تحت عنوان:

```bash
curl -s -X PATCH -H "Authorization: Bearer $OBSIDIAN_KEY" \
     -H "Operation: append" \
     -H "Target-Type: heading" \
     -H "Target: Pitfalls" \
     -H "Create-Target-If-Missing: true" \
     -H "Content-Type: text/markdown" \
     --data "| 10 | ... |" \
     "http://127.0.0.1:27123/vault/Knowledge/OmniRoute%20MCP.md"
```

## روابط رسمية

- توثيق الإضافة: `https://coddingtonbear.github.io/obsidian-local-rest-api/`
- المستودع: `https://github.com/coddingtonbear/obsidian-local-rest-api`
- صفحة الإضافة: `https://obsidian.md/plugins?id=obsidian-local-rest-api`
- صفحة المؤلف: `https://adamcoddington.net/`

> ⚠️ الروابط أعلاه **لم تُفتح آليًا في هذه الجلسة** (لا shell ولا وصول ويب). المسارات
> والترويسات موسومة كـ "من التوثيق"؛ الـ manifest والإصدارات والمصادقة **متحققة فعليًا**.
> عند توفر `execute:search`، أضف مقتطفات مؤكدة هنا.

## مراجع داخل الـ vault

- [[OmniRoute/Obsidian Integration]] — إعداد Context Source خطوة بخطوة.
- [[Knowledge/OmniRoute MCP]] — طبقة الأدوات التي تستهلك هذا الخادم.
- [[Obsidian Git Setup and Usage]] — مزامنة الـ vault.

## إضافات لاحقة

- (تُضاف هنا نتائج التحقق من التوثيق العام + تغيّرات إصدار الـ plugin.)
