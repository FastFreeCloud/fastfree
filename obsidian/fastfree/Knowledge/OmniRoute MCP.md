---
tags: [omniroute, mcp, obsidian, knowledge, gateway]
date: 2026-11-20
status: verified-live
verified_by: "جلسة Knowledge Researcher — استدعاءات حقيقية على خادم OmniRoute MCP"
---

# OmniRoute MCP

> [!info] حالة التحقق
> كل ما تحت "سطح الأدوات" و"الصلاحيات" و"أخطاء شائعة" تم التحقق منه **فعليًا في هذه الجلسة**
> (استدعاءات ناجحة + أخطاء حقيقية من الخادم). روابط التوثيق العام لم يُتحقق منها آليًا
> لأن أدوات الويب محجوبة بـ scopes (انظر القسم أدناه).

## ما هو

- **OmniRoute** = بوابة AI ذاتية الاستضافة (Self-hosted AI Gateway) على المنفذ `20128`،
  تُوحّد كل مزوّدي النماذج (OpenAI، Anthropic، Gemini، opencode-go، opencode-zen،
  antigravity، مزوّدون مجانيون…) خلف سطح واحد متوافق مع OpenAI: `/v1`.
- **OmniRoute MCP** = خادم Model Context Protocol مدمج في البوابة، يُعرّض للوكلاء
  (Omnigent / OpenCode / أي عميل MCP) أدوات جاهزة بدل الوصول المباشر للملفات:
  أدوات Obsidian + كتالوج النماذج + بحث/جلب ويب.
- النقل: `streamable-http` على المنفذ `9920`.
- القيمة العملية: الوكيل لا يملك shell ولا filesystem — **أدوات `obsidian_*` هي الطريق الوحيد
  للـ vault**، وهذا هو سبب وجود هذه البوابة أصلًا.

### خريطة المنافذ

| المنفذ | الخدمة |
|---|---|
| `20128` | OmniRoute Dashboard + OpenAI-compatible `/v1` |
| `20129` | واجهة API منفصلة |
| `20132` | Live WebSocket |
| `9920` | OmniRoute HTTP MCP (streamable-http) |
| `27123` | Obsidian Local REST API (HTTP) — يستهلكه OmniRoute كـ Context Source |
| `27124` | Obsidian Local REST API (HTTPS) — **لا تستخدمه** في التكامل |

## سطح الأدوات — كما هو مسجّل فعليًا

> [!warning] العدد يتغيّر حسب الـ scope
> ملاحظة `OmniRoute/Obsidian Integration.md` تذكر **22 أداة**. في هذه الجلسة ظهرت **9 أدوات
> Obsidian فقط** + أداتا ويب + كتالوج النماذج. السبب: تصفية حسب صلاحيات المفتاح، لا نقص في الخادم.

### قراءة (Read)

| الأداة | المدخلات المهمة | ملاحظات |
|---|---|---|
| `obsidian_check_status` | — | يعيد حالة الاتصال + **manifest الـ plugin** (id/version/author/…) + `authenticated` |
| `obsidian_list_vault` | `path` ('' = الجذر) | يعيد `{files: [...]}` — أسماء بمستوى واحد فقط |
| `obsidian_read_note` | `path`, `targetType`, `target` | `targetType` = `heading` \| `block` \| `frontmatter` |
| `obsidian_get_document_map` | `path` | خريطة العناوين + أرقام الأسطر (رخيص، استخدمه قبل read لملف كبير) |
| `obsidian_get_note_metadata` | `path` | frontmatter + tags + links + عدد الكلمات بدون قراءة المتن |
| `obsidian_get_tags` | — | كل الـ tags مع التكرار (يعيد `{tags:[{name,count}]}`) |
| `obsidian_search_simple` | `query`, `contextLength` (20–500) | يعيد `{filename, score, matches:[{match, context}]}` |
| `obsidian_search_structured` | `jsonLogic` | JSON Logic: `and/or/regex/glob` + فلاتر مسارات |

### كتابة (Write)

| الأداة | المدخلات | تحذير |
|---|---|---|
| `obsidian_write_note` | `path`, `content` | **يستبدل الملف بالكامل** — يمسح ما كان موجودًا |
| `obsidian_append_note` | `path`, `content`, `targetType`, `target` | الإضافة الافتراضية في نهاية الملف |
| `obsidian_patch_note` | `path`, `operation`(append/prepend/replace), `targetType`(heading/block/frontmatter), `target`, `createTargetIfMissing` | الأدق للتعديل الجراحي |

> الأدوات `delete_note` / `move_note` / `execute_command` / `open_file` / `sync_trigger` /
> `sync_resolve_conflict` موجودة في الخادم لكنها **غير متاحة** بهذا المفتاح (خارج الـ scopes).
> لا تفترض توفرها.

### أدوات أخرى

- `omniroute_list_models_catalog` — `provider`, `capability`, `query`, `mode`(`models`\|`summary`)، `limit` (≤100)، `cursor`.
- `omniroute_web_search` — `query`, `max_results` (≤20), `search_type`(`web`\|`news`), `provider`.
- `omniroute_web_fetch` — `url`, `format`(`markdown`\|`html`\|`links`\|`screenshot`), `provider`, `depth`, `wait_for_selector`.

## الصلاحيات (Scopes) — أهم نقطة تشغيلية

المفتاح الحالي يحمل: `read:obsidian`, `write:obsidian`, `mcp:connect`, `self:usage`.

عمليًا:

- ✅ كل أدوات Obsidian للقراءة والكتابة تعمل.
- ❌ `omniroute_web_search` و `omniroute_web_fetch` تفشلان بـ:
  `Insufficient MCP scopes for ... Missing: execute:search`
- الحل: Scope إضافي `execute:search` على المفتاح من لوحة التحكم → ثم إعادة تحميل جلسة الوكيل
  (الأدوات تُسجَّل عند بدء الجلسة، لا تُحدَّث حيًّا).

## الاستخدام الصحيح — نمط عمل موصى به

1. `obsidian_check_status` مرة واحدة في بداية الجلسة (يتحقق من الاتصال + إصدار الـ plugin).
2. `obsidian_list_vault` للتنقّل، ثم `obsidian_get_document_map`/`get_note_metadata` قبل القراءة الكاملة.
3. قبل أي كتابة: `obsidian_read_note` — لأن `write_note` يستبدل، لا يدمج.
4. للإضافة على ملاحظة موجودة: `obsidian_append_note` أو `obsidian_patch_note` (لا `write_note`).
5. المسارات دائمًا **vault-relative** بدون `/` بادئة (`Knowledge/X.md` لا `/Knowledge/X.md`).
6. بعد الكتابة: تحقّق بـ `obsidian_read_note` أو `get_note_metadata` (لا يوجد ACK بالمحتوى).

## أخطاء شائعة (Pitfalls)

| # | الخطأ | الأثر | الصواب |
|---|---|---|---|
| 1 | `obsidian_list_vault` على مجلد غير موجود | يعيد `Error: Error: Not Found` وليس قائمة فارغة | أنشئ المجلد بأول `write_note` أو تحقق من الاسم |
| 2 | استخدام `write_note` للتحديث | مسح المحتوى السابق بالكامل | `append_note` / `patch_note` |
| 3 | مسار مطلق أو مع backslashes | فشل الكتابة/القراءة | مسار نسبي بـ `/` |
| 4 | افتراض توفر أدوات الحذف/النقل | فشل غير مفهوم | تحقق من قائمة الأدوات المتاحة فعلًا في الجلسة |
| 5 | الاعتماد على البحث/الجلب الويب | `Insufficient MCP scopes` | اطلب `execute:search` أو استخدم مصدرًا محليًا |
| 6 | تفسير `score` في `search_simple` كترتيب | الترتيب غير بديهي وقيمه سالبة | رتّب يدويًا بحسب `filename` والسياق |
| 7 | كتابة أسرار (مفاتيح، كلمات مرور) داخل الملاحظات | الـ vault يُرفع إلى GitHub عبر Git plugin | استخدم أسماء متغيرات بيئة بدلًا من القيم |
| 8 | توقّع تحديث تلقائي للملاحظات من الخارج | الـ metadataCache يتحدث عند الحفظ فقط (`lastResolvedAt`) | أعد القراءة بعد الكتابة |

## مثال قصير (من هذه الجلسة)

```text
obsidian_check_status()
→ status: OK · plugin: obsidian-local-rest-api v5.5.2 · authenticated: true

obsidian_list_vault(path="")
→ files: ['Dev/', 'OmniRoute/', 'FastFree Clan/', 'Welcome to FastFree AI.md', ...]

obsidian_read_note(path="OmniRoute/Obsidian Integration.md")
→ # OmniRoute — Obsidian Integration ...

obsidian_write_note(
  path="Knowledge/OmniRoute MCP.md",
  content="# OmniRoute MCP\n\n## ما هو\n..."
)

obsidian_append_note(
  path="Knowledge/OmniRoute MCP.md",
  content="\n## إضافة لاحقة\n- نقطة جديدة\n"
)

obsidian_patch_note(
  path="Knowledge/OmniRoute MCP.md",
  operation="replace", targetType="heading",
  target="حالة التحقق", content="...", createTargetIfMissing=true
)

obsidian_search_simple(query="Obsidian REST", contextLength=300)
→ [{filename: 'OmniRoute/Obsidian Integration.md', matches: [...]}]

omniroute_list_models_catalog(query="deepseek", mode="summary")
```

## روابط رسمية / مراجع

- OmniRoute Gateway (Dashboard + `/v1`): `http://127.0.0.1:20128`
- OmniRoute HTTP MCP: `http://127.0.0.1:9920`
- [[OmniRoute/Overview]] · [[OmniRoute/Obsidian Integration]] · [[OmniRoute/Providers & Models]] · [[OmniRoute/OpenCode Integration]]
- توثيق OmniRoute العام (GitHub/Docs): يُستخرج من Dashboard → Settings → API/MCP.
  **لم يُتحقق منه آليًا** — يحتاج scope `execute:search`.
- مواصفة MCP: `https://modelcontextprotocol.io` (مرجع عام، غير متحقق آليًا هنا).

## إضافات لاحقة

- (مساحة للإضافات القادمة عند التحقق من التوثيق العام أو من أدوات الـ write الكاملة.)
