# fastfree_flow_mcp

تشغيل **Google Flow** من خلال وكيل البرمجة (coding agent) — توليد صور وفيديو عن طريق حساب Google بتاعك.

**مفيش API keys. مفيش tokens من طرف ثالث. مفيش برمجة API.**

الأداة بتتكلم مع متصفح Chromium شغّال بالفعل عن طريق بروتوكول `CDP`، فالوكيل بيستخدم نفس جلسة Google المسجّل دخولها عندك.

---

## المحتويات

1. [المتطلبات](#المتطلبات)
2. [التثبيت](#التثبيت)
3. [التشغيل](#التشغيل)
4. [التسجيل داخل MCP](#التسجيل-داخل-mcp)
5. [الأدوات المتاحة](#الأدوات-المتاحة)
6. [طريقة الاستخدام](#طريقة-الاستخدام)
7. [قاعدة كتابة البرومبت](#قاعدة-كتابة-البرومبت)
8. [شكل المخرجات](#شكل-المخرجات)
9. [متغيرات البيئة](#متغيرات-البيئة)
10. [رصيد Flow](#رصيد-flow)
11. [حدود معروفة](#حدود-معروفة)
12. [حل المشاكل](#حل-المشاكل)
13. [بنية المشروع](#بنية-المشروع)

---

## المتطلبات

| المتطلب | التفاصيل |
|---|---|
| **Node.js** | الإصدار `18` أو أحدث — `node -v` للتأكد |
| **متصفح Chromium** | CentBrowser مستخدم بالفعل، أو أي Chromium/Chrome يفتح CDP |
| **حساب Google** | مسجّل دخول داخل المتصفح، ويفتح `flow.google.com` بدون مشاكل |
| **صلاحية تشغيل** | تشغيل `launch.cmd` أو أي أمر يفتح المتصفح |
| **الاعتماديات** | `@modelcontextprotocol/sdk` و`playwright-core` — بتتثبت بـ`npm install` |

> **مهم:** المتصفح لازم يكون **مسجّل دخول بالفعل**. الـMCP بيقفل بجهاز المتصفح اللي أنت مفتوح، مش بيعمل login نيابة عنك.

---

## التثبيت

```powershell
cd C:\Users\FastFree\Desktop\fastfree\fastfree_mcp_tools\fastfree_flow_mcp
npm install
```

### تشغيل المتصفح مرة واحدة

شغّل الملف ده قبل أول استخدام (أو بعد إغلاق المتصفح):

```powershell
scripts\launch.cmd
```

الملف بيعمل الآتي:

- يقفل أي نسخة متصفح شغالة.
- يفتح المتصفح من جديد.
- يضيف `--remote-debugging-port=9222`.
- يحدد `--user-data-dir` و`--profile-directory` عشانUsed جلسة Google المحفوظة.
- بيفتح `https://flow.google.com`.

بعدها سيب المتصفح مفتوح — الـMCP بيرتبط بيه.

---

## التشغيل

### تشغيل الـMCP يدويًا (للتأكد)

```powershell
cd C:\Users\FastFree\Desktop\fastfree\fastfree_mcp_tools\fastfree_flow_mcp
cmd /c "node src/index.js"
```

الأمر ده بيطبع `fastfree_flow_mcp MCP server running on stdio`.
لو طبع كده، يبقى الخادم شغال — اضغط `Ctrl+C` لإيقافه.

> **ليه `cmd /c`؟** لأن PowerShell بيمنع تشغيل `npm.ps1` بسبب Execution Policy. تشغيل `node` مباشرة بيشتغل عادي.

### فحص سريع (`npm run check`)

الأمر ده بيتحقق من الـMCP كله من غير ما يولّد ولا يستهلك أي رصيد:

```powershell
cd C:\Users\FastFree\Desktop\fastfree\fastfree_mcp_tools\fastfree_flow_mcp
npm run check
```

بيطبعلك عدد الأدوات وقائمتها، وبعدين يفحص جلسة المتصفح:

```
tools   : 17
  - flow_brand_read
  ...
probing browser session ...
{ "authenticated": true, "account": "...", "cdpPort": 9222, ... }
result  : OK - session authenticated
```

بيخرج بـ`exit code 0` لو كل حاجة تمام، و`1` لو المتصفح مش متصل — فلو حطّيته في CI هيفشل لوحده لما الجلسة تتعطل.

### التشغيل من داخل عميل MCP

في الاستخدام الحقيقي، **مش بتشغّله يدويًا** — عميل MCP (زي opencode) هو اللي بيشغّله تلقائيًا عند أول استدعاء.

---

## التسجيل داخل MCP

### 1. opencode (الطريقة الفعلية المستخدمة)

الملف: `C:\Users\FastFree\Desktop\fastfree\opencode.json`

ضيف الكود ده داخل كائن `mcp`:

```json
{
  "mcp": {
    "fastfree-flow": {
      "type": "local",
      "command": [
        "node",
        "C:/Users/FastFree/Desktop/fastfree/fastfree_mcp_tools/fastfree_flow_mcp/src/index.js"
      ],
      "enabled": true,
      "timeout": 600000,
      "environment": {
        "FLOW_BROWSER": "C:/Users/FastFree/AppData/Local/CentBrowser/Application/chrome.exe",
        "FLOW_USER_DATA": "C:/Users/FastFree/AppData/Local/CentBrowser/User Data",
        "FLOW_PROFILE": "Default",
        "FLOW_CDP_PORT": "9222",
        "FLOW_ACCOUNT": "mohamed.fastfree@gmail.com",
        "FLOW_PROJECT_ID": "71c44fa6-1b45-4f01-bf5d-8863e519973f"
      }
    }
  }
}
```

> **`FLOW_PROJECT_ID`**: معرفته من الـURL بتاع مشروعك في Flow (`https://flow.google.com/project/71c44fa6-...`). لو مش عايز تقفل على مشروع، امسح السطر ده أو خليه فاضي `""`.

بعد التعديل:

```powershell
# اقفل opencode وافتحه تاني
opencode mcp list
```

لازم تشوف `fastfree-flow` في القائمة.

### 2. Hermes

الملف: `C:\Users\FastFree\AppData\Local\hermes\config.yaml`

```yaml
mcp:
  fastfree-flow:
    command: node
    args:
      - C:/Users/FastFree/Desktop/fastfree/fastfree_mcp_tools/fastfree_flow_mcp/src/index.js
    env:
      FLOW_CDP_PORT: "9222"
      FLOW_ACCOUNT: "mohamed.fastfree@gmail.com"
```

### 3. Claude Desktop

الملف:
`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fastfree-flow": {
      "command": "node",
      "args": ["C:/Users/FastFree/Desktop/fastfree/fastfree_mcp_tools/fastfree_flow_mcp/src/index.js"],
      "env": {
        "FLOW_CDP_PORT": "9222",
        "FLOW_ACCOUNT": "mohamed.fastfree@gmail.com"
      }
    }
  }
}
```

### 4. أي عميل MCP تاني

الأمر الأساسي اللي أي عميل محتاجه:

```
command : node
args    : C:/Users/FastFree/Desktop/fastfree/fastfree_mcp_tools/fastfree_flow_mcp/src/index.js
```

الاتصال بيكون عن طريق `stdio` — يعني الـserver بيقرا من `stdin` ويكتب في `stdout`.

---

## الأدوات المتاحة

الـMCP بيقدّم **17 أداة** موزّعة على 6 مجموعات.

> **الأعمدة المهمة:** كل أداة بترجع `ok: true` أو `ok: false`. لما `false`، يعني الأداة ماعملتش اللي طلبته — اقرأ `note` و`ratioDetail` في النتيجة.

### Brand (هوية الشركة)

| الأداة | الوظيفة |
|---|---|
| `flow_brand_read` | اقرأ Brand Kit كامل: اسم الشركة، الألوان، الخطوط، مجموعة الأيقونات، ملفات اللوجو، نسب السوشيال، imagery، ونبرة الكلام |
| `flow_brand_prompt` | حوّل طلب قصير لـprompt جاهز ومتوافق مع الهوية، **من غير فواصل**، يجاهز للتوليد |
| `flow_brand_tokens` | استخرج design tokens (ألوان، خطوط، أيقونات، imagery، نسب، لوجو، نبرة) لبناء UI أو مستندات |
| `flow_brand_add_logo` | انسخ صورة معتمدة كأصل رسمي في `brand/logos/` (الامتداد بيتقفل على png/jpg) |

### Session (الجلسة)

| الأداة | الوظيفة |
|---|---|
| `flow_launch` | افتح المتصفح مع CDP، أو أعِد تشغيله بـ`restart: true` (بيقفل عن طريق CDP مش taskkill) |
| `flow_status` | حالة تسجيل الدخول، الحساب النشط، الموديلات المتاحة، نسب الأبعاد، منفذ CDP |
| `flow_screenshot` | خُذ سكرين شوت واحفظه في مجلد المخرجات. لو الصفحة مش على Flow بيgoto ليها الأول |
| `flow_discover_ui` | اعرض العناصر التفاعلية في الصفحة — **استخدمها لما أداة تفشل بعد تحديث Flow** |

### Images (صور)

| الأداة | الوظيفة |
|---|---|
| `flow_generate_image` | ولّد صور بـNano Banana Pro / Nano Banana 2 / Imagen 4. بيطبّق `ratio` في الـUI وبيقولك `ratioApplied` |
| `flow_download_latest` | نزّل أحدث صورة من الـview المفتوح — **مفيدة بس لو ولّدت من واجهة Flow بنفسك**، لأن `generate` بيحفظ ملفاته |
| `flow_list_output` | اعرض الـruns السابقة مقسّمة بالأيام مع الحجم |
| `flow_create_scene` | افتح لوحة Scenes (برومبت اختياري للتخطيط فقط — مش بيتبعت) |

### Video (فيديو)

| الأداة | الوظيفة |
|---|---|
| `flow_setup_video` | اكتب برومبت الفيديو في الـcomposer **بدون إرسال** — صفر رصيد. اضغط Generate بنفسك |
| `flow_create_scene` | افتح لوحة Scenes في المشروع الحالي |

### Characters (شخصيات)

| الأداة | الوظيفة |
|---|---|
| `flow_list_characters` | افتح لوحة الشخصيات واعرض أسماءهم |
| `flow_create_character` | افتح نموذج إضافة شخصية جاهز (الاسم والوصف بتفضل في المتصفح) |

### Tools (أدوات Flow)

| الأداة | الوظيفة |
|---|---|
| `flow_open_tools_gallery` | افتح معرض Flow Tools واعرض تبويباته (My Tools / Community / Templates) |
| `flow_use_grid_architect` | افتح Grid Architect لتوليد لقطات batch من ثيم واحد. **كل لقطة بتستهلك رصيد** |

---

## طريقة الاستخدام

### أول حاجة: اتأكد الجلسة شغالة

```
flow_status
```

لازم يرجع:

```json
{
  "authenticated": true,
  "account": "mohamed.fastfree@gmail.com",
  "cdpPort": 9222
}
```

لو `authenticated: false` — سجّل دخول من نافذة المتصفح نفسها.

### مثال 1: توليد صورة بسيطة

```
flow_generate_image
  prompt: "a minimalist desert landscape at golden hour with soft shadows"
  ratio: "16:9"
```

الأداة **بتحفظ الملف بنفسها** وترجعلك المسارات في `files`:

```json
{
  "ok": true,
  "ratioApplied": true,
  "count": 2,
  "files": [".../2026-10-16/013823-a-desert-landscape-1.jpg", "..."],
  "sizes": ["94 KB", "93 KB"]
}
```

**مش محتاج `flow_download_latest`** — دي بس لو ولّدت من واجهة Flow بإيدك.

### مثال 2: صورة بهوية الشركة (الطريقة الصحيحة)

الخطوة 1 — اقرأ الهوية:

```
flow_brand_read
```

الخطوة 2 — ولّد prompt متوافق:

```
flow_brand_prompt
  request: "a facebook post announcing a new inventory module"
  kind: "post"
  ratio: "1:1"
```

بيرجع prompt **من غير فواصل**، جاهز للاستخدام.

الخطوة 3 — ولّد:

```
flow_generate_image
  prompt: <الprompt اللي رجع من الخطوة 2>
  ratio: "1:1"
```

خلاص — خلاص الملف اتحفظ. اقرأ `files` في النتيجة عشان تعرف مساره.

### مثال 3: لوجو رسمي (بدون فواصل)

```
flow_brand_prompt
  request: "a logo for FastFree"
  kind: "logo"
```

```
flow_generate_image
  prompt: <النتيجة من الخطوة السابقة>
  ratio: "1:1"
```

لما المستخدم يعتمد اللوجو، سجّله ك أصل رسمي:

```
flow_brand_add_logo
  sourceFile: "C:/Users/FastFree/Desktop/fastfree/fastfree_mcp_tools/fastfree_flow_mcp/output/<التاريخ>/<الملف>.jpg"
  name: "logo-primary"
```

> الخطوة الأخيرة **لازم** تتعمل بعد ما المستخدم يعتمد اللوجو، وبعدها اذكر اسم الملف في `brand/BRAND.md`.

### مثال 4: استكشاف الواجهة لما حاجة تقف

```
flow_discover_ui
```

بيرجع قائمة الأزرار والـinputs على الصفحة — استخدمها لو أداة فشلت بعد تحديث Flow. في صفحة Flow هتلاقي الزر اللي بيتحكم في النسبة شكله كده:

```
🍌 Nano Banana 2.1 crop_16_9 x2
```

كلمة `crop_16_9` دي هي النسبة الحالية.

### مثال 5: فيديو (من غير صرف رصيد)

```
flow_setup_video
  prompt: "a slow pan across a modern warehouse interior"
  ratio: "16:9"
  duration: "8s"
```

بيكتب البرومبت ويختار النسبة بس **مايبعتوش** — النتيجة بترجع `submitted: false` و`ok: true`. روح المتصفح واضغط Generate بنفسك.

---

## قاعدة كتابة البرومبت

محرر Flow **بيشيل الفواصل (commas)** أوتوماتيك. اكتب البرومبت بمسافات أو `and`:

```
صح  ->  a blue and white minimalist logo for Acme flat design
غلط ->  a logo, blue and white, flat, design
```

`flow_brand_prompt` بيعمل ده تلقائيًا. لو كتبت البرومبت بنفسك، اتبع القاعدة.

---

## نسب الأبعاد (ratio)

Flow **مفيهاش زر منفصل للنسبة**. الموديل والنسبة وعدد الصور كلهم ورا زر واحد:

```
🍌 Nano Banana 2.1 crop_16_9 x2
                    ^^^^^^^^
                    النسبة الحالية، وبـ underscore
```

الأداة بتفتح الزر، تختار النسبة، وبعدين **تقرأ `aria-checked` تاني** عشان تتأكد إن Flow فعلاً غيّر.

### النسب المتاحة في Flow

| إنت بتطلب | Flow بياخده | النتيجة |
|---|---|---|
| `16:9` | `crop_16_9 16:9` | ✅ |
| `4:3` | `crop_landscape 4:3` | ✅ |
| `1:1` | `crop_square 1:1` | ✅ |
| `3:4` | `crop_portrait 3:4` | ✅ |
| `9:16` | `crop_9_16 9:16` | ✅ |
| `1.91:1` | — | ❌ Flow مش بيقدّمها |

`1.91:1` دي نسبة فيسبوك اللي في `brand/BRAND.md`، بس **Flow مش بيقبلها**. لبوست فيسبوك استخدم `4:3` أو `16:9`.

### اقرأ النتيجة كده

```json
{
  "ok": true,
  "ratio": "1:1",
  "ratioApplied": true,
  "ratioDetail": "settings-menu"
}
```

`ratioApplied: true` هو الضمان الوحيد. لو `false`، النسبة **ماتغيرتش** — ومش لازم تثق في `ratio` لوحده، لأن الحقل ده بيرجع `default` في الحالة دي.

---

## شكل المخرجات

```
output/
  2026-10-16/
    013823-a-desert-landscape-1.jpg
    013823-a-desert-landscape-2.jpg
    013823-a-desert-landscape-preview.png
```

- الصور متorganize **حسب اليوم**.
- اسم الملف = الوقت + slug من البرومبت (أول 6 كلمات).
- `-preview.png` = سكرين شوت لصفحة Flow بعد التوليد.
- `-video-setup.png` = سكرين شوت بعد `flow_setup_video`.
- `-1.jpg` و`-2.jpg` = صورة الصورة،`-2` مش variant تاني.

مجلد `output/` مقفول في `.gitignore` — مش بيت committing.

---

## متغيرات البيئة

كل القيم اختيارية — وفيها قيم افتراضية داخل `src/config.js`.

| المتغير | الافتراضي | الوظيفة |
|---|---|---|
| `FLOW_BROWSER` | مسار CentBrowser | مسار المتصفح التنفيذي |
| `FLOW_USER_DATA` | مجلد User Data | مجلد جلسات المتصفح |
| `FLOW_PROFILE` | `Default` | اسم البروفايل جوه الـUser Data |
| `FLOW_CDP_PORT` | `9222` | منفذ الـdebugging |
| `FLOW_ACCOUNT` | `''` | لو محدد، `flow_status` بيحذّرك لو الحساب مختلف |
| `FLOW_AUTO_LAUNCH` | `1` | `0` يمنع الـserver إنه يفتح المتصفح لوحده |
| `FLOW_URL` | `https://flow.google.com` | عنوان Flow |
| `FLOW_OUTPUT_DIR` | `output/` | مكان حفظ المخرجات |
| `FLOW_POLL_MS` | `4000` | الفترة بين محاولات قراءة النتيجة |
| `FLOW_MAX_POLLS` | `45` | أقصى عدد محاولات |
| `FLOW_TOOL_TIMEOUT_MS` | `420000` | الحد الأقصى لنداء أداة واحدة |
| `FLOW_PROJECT_ID` | `''` | **قفل المشروع**: لو محدد، الأدوات هترفض تشتغل لو المشروع المفتوح مش نفس الـID ده |

لتغيير الموديلات وأوقات الانتظار: عدّل `src/config.js`.

النسب المقبولة: `16:9` — `1.91:1` — `4:3` — `1:1` — `3:4` — `9:16`
(منهم 5 بس اللي Flow بيطبّقها فعلياً — شوف [نسب الأبعاد](#نسب-الأبعاد-ratio))

---

## رصيد Flow

- Flow بيدّي رصيد يومي مجاني، لكن **السقف بيحدده Google وبيتغير** — الأداة ماتقراش الرقم من الصفحة عشان متقولش حاجة غلط.
- التكلفة الحقيقية بتختلف حسب الموديل والدقة — **مش مضمون إن كل صورة = 1 رصيد**.
- الفيديو أغلى من الصور.
- `flow_setup_video` **بيكتب الـprompt بس ومايبعتوش** — مفيش صرف رصيد خالص. اضغط Generate في المتصفح بنفسك.

---

## حدود معروفة

- **الاعتماد على شكل الواجهة** — أي تحديث في Flow ممكن يكسر الأدوات. استخدم `flow_discover_ui` وشوف الـselectors.
- **كل الأدوات بتنتظر الدور بتاعها.** الـtools كلها بتشتغل على نفس التبويب، فاتنين بيتسلسلوا واحد ورا التاني عشان ما يبقاش أداة بتقرا ناتج التانية.
- **`restart: true` بيقفل المتصفح عن طريق CDP** مش `taskkill` — عشان مايقتلش Chrome الشخصي بتاعك لو متسميّ `chrome.exe` برضه.
- **التحكم الآلي على المتصفح** ممكن يكون محل تعارض مع شروط خدمة Google. استخدمه لشغلك الخاص، مش على نطاق واسع.
- **إنشاء Flow Tools جديد** محتاج خطة AI مدفوعة — تصفح المعرض مجاني.
- **الأرصدة مش مقروءة.** الأداة ما بتقراش رصيدك من Flow — بتقولك "بيستهلك رصيد" وبس. السقف اليومي بيحدده Google.

## نتيجة كل نداء

كل أداة بترجع `ok: true` أو `ok: false`، والـMCP بيحط `isError` لما تكون `false` — فالعميل بيفرق بنجاح وفشل صح.

```json
FAILED  (17001ms)

{
  "ok": false,
  "note": "Screenshot failed: Page.captureScreenshot timed out after 20000ms"
}
```

فإذا شفت `FAILED` في أول سطر — الأداة ماعملتش اللي طلبته. ماتفترضش النجاح من إن الـcall رجع.

---

## حل المشاكل

### الأداة بترجع `ECONNREFUSED`

المتصفح مش شغال مع CDP.

```powershell
scripts\launch.cmd
```

### `flow_status` بيرجع `authenticated: false`

سجّل دخول داخل نافذة المتصفح، ثم افتح `https://flow.google.com`، وبعدين استدعِ `flow_status` تاني.

### أداة معينة واقفة

1. شغّل `flow_status` للتأكد إن الجلسة intacte.
2. شغّل `flow_screenshot` عشان تشوف الصفحة.
3. شغّل `flow_discover_ui` عشان تشوف الـselectors الحالية.
4. شغّل `flow_launch` بـ`restart: true` لو المتصفح في حالة غريبة.

### الأيقونة (icon) مش ظاهرة

شغّل `scripts\launch.cmd` وانت **مش** متصفح تاني مفتوح — launch.cmd بيقفل أي نسخة قبل ما يفتح.

### الصورة اتولدت بس مش متنزّلة

- اتأكد `flow_download_latest` اتنادى.
- راجع مجلد اليوم في `output/`.
- لو محتاج تحميل عدد أكبر من المعتاد، ارفع `FLOW_MAX_POLLS`.

---

## بنية المشروع

```
fastfree_mcp_tools/fastfree_flow_mcp/
  src/
    index.js           ← تعريف الـ17 أداة + سيرفر MCP
    config.js          ← الإعدادات ومتغيرات البيئة
    browser.js         ← الاتصال بـCDP + التنقل + قراءة المخرجات
    files.js           ← المجلدات + تسمية الملفات + التنزيل
    tools/
      index.js         ← تنفيذ أدوات Flow
      brand.js         ← أدوات Brand
  brand/
    BRAND.md           ← مصدر الهوية الوحيد
    FLOW-GENERATE.md   ← تعليمات التوليد
    brand.js           ← قارئ الـMarkdown
    logos/             ← اللوجوهات المعتمدة
  scripts/
    launch.cmd         ← تشغيل المتصفح مع CDP
  output/              ← المخرجات (حسب اليوم)
```

---

## الترخيص

MIT — استخدمه في شغلك بحرية.