---
tags: [omnigent, harness, agents, sessions, knowledge]
date: 2026-11-20
status: verified-metadata
verified_by: "بيانات sys_session_get_info / sys_agent_get / sys_scheduled_task_* + وصف الأدوات في هذه الجلسة"
---

# Omnigent Harnesses

> [!info] حالة التحقق
> ما يلي مبني على **بيانات التشغيل الحقيقية** التي يكشفها Omnigent نفسه (حقول `harness`،
> `permission_mode`، `execution_target` في أدوات الجلسات والمهام المجدولة). التوثيق العام
> لـ Omnigent لم يُتحقق منه آليًا (لا وصول ويب في هذه الجلسة).

## ما هو الـ Harness

**Harness = محرّك التنفيذ الفعلي الذي يشتغل داخله الوكيل.** الجلسة (Session) في Omnigent
هي غلاف: `agent` + `harness` + `runner` + `host` + `workspace`. نفس الوكيل (نفس الـ prompt
والأدوات) يمكن تشغيله على harness مختلف، والفرق يظهر في:

- **الصيغة المتاحة لـ `permission_mode`** (كل harness له مفرداته).
- **قدرات الجلسة**: أدوات مدمجة، إدارة السياق، طرق الموافقة على الأدوات.
- **مكان التنفيذ**: `connected_host` أو `managed_sandbox`.

`sys_session_get_info` يعيد صراحة: الـ agent المرتبط، الـ harness المُهيّأ على الـ host
(مع **readiness**)، الـ runner واتصاله، و`reasoning effort` و`model`.

## الـ Harnesses المعروفة ومفردات الصلاحيات

| Harness | أمثلة `permission_mode` | ملاحظات |
|---|---|---|
| **claude-sdk** | — (لا يوجد) | Harness بلا أوضاع أتمتة؛ مناسب للجلسات التفاعلية |
| **Claude Code** | `acceptEdits`, `plan`, `default` | `plan`/`default` يطلبان موافقة → تفشل التشغيلات غير المراقبة |
| **Codex** | `default`, `ask-for-approval`, `approve-for-me`, `read-only` | `read-only` آمن للتحليل، `approve-for-me` للأتمتة |
| **Cursor** | `auto-review` | مراجعة تلقائية بدل الموافقة اليدوية |
| **Antigravity** | `default`, `skip` | |
| **Devin** | `smart` | |

> [!warning] قاعدة ذهبية
> `permission_mode` **مفردات خاصة بكل harness**. تمرير `acceptEdits` إلى Codex أو
> `smart` إلى Claude Code غير صالح. وللـ harnesses التي لا تدعم أوضاعًا (مثل `claude-sdk`)
> يجب إرسال `JSON null` صريحًا — لا السلسلة `"null"`.

## أنواع التنفيذ (Execution Targets)

| النوع | المعنى | الاستخدام |
|---|---|---|
| `connected_host` | جهاز متصل دائم (مثل جهاز المطوّر) مع `workspace` = مسار مطلق | الجلسات التفاعلية، العمل على repo محلي |
| `managed_sandbox` | sandbox تُنشأ من الخادم لكل تشغيل، `workspace` = رابط repo | التشغيلات المجدولة/المعزولة؛ لا يمكن تثبيت `host_id` معه |

قواعد مهمة:
- `connected_host` بدون `host_id` يُنفَّذ على أول host متصل للمالك وقت الإطلاق؛
  إن لم يوجد host متصل → يُسجَّل التشغيل كـ **failed**.
- `managed_sandbox` يتطلب تهيئة sandboxes على الخادم.
- الحد الأدنى للتكرار في الجدولة: **10 دقائق** على `connected_host` (أو `managed_sandbox`
  بوضع `session_mode: continue`)، و**ساعة** للجلسات الجديدة على sandbox.

## أوضاع الجلسة المجدولة

| `session_mode` | السلوك | متى |
|---|---|---|
| `new` (افتراضي) | جلسة جديدة لكل تشغيل | workflows محفوظة، مهام مستقلة |
| `continue` | كل التشغيلات تُرسل إلى جلسة واحدة (مشاركة السياق) | مراقبة مستمرة، تراكم معرفة |

`session_mode: continue` + `session_id` = استكمال جلسة قائمة بعينها (يجب أن يكون نفس `agent_id`).

## الهيكل الهرمي (Sessions / Sub-agents / Runs)

- **Sub-agents**: أبناء مرتبطون باسم (agent, title) داخل المحادثة؛ لهم `conversation_id`
  يُقرأ بـ `sys_session_get_history`. `sys_session_list(view='sub_agents')` يعرضهم كاملين.
- **Workers مستقلة**: جلسات أنشأتها جلستك — تُعرف بـ `created_by_session_id == session ID`
  (`created_by_this_session=true`).
- **قنوات المراسلة**: `sys_session_send` للأبناء فقط، `sys_session_message` للجلسات المستقلة
  التي يملكها المستخدم. **الردود لا تُعاد تلقائيًا** — اقرأها بـ `get_history`.
- **العنوان**: الجلسات الفرعية لا تستطيع تسمية نفسها (`not_top_level`).

## اختيار الـ harness في المهام المجدولة

- `agent_id` يحدد الـ harness فعليًا — كل agent مرتبط بـ harness.
- **تبديل `agent_id` يُبدّل الـ harness**، ولا تنقل معك `model_override` /
  `reasoning_effort` / `permission_mode`. **أرسِلها من جديد بعد التبديل.**
- التشغيلات الماضية تحتفظ بالـ harness الذي شغّلتها.

## أخطاء شائعة (Pitfalls)

| # | الخطأ | الأثر | الصواب |
|---|---|---|---|
| 1 | استخدام `permission_mode` تفاعلي (`default`/`plan`) في مهمة مجدولة | التشغيل غير المراقب يتوقف وينتظر موافقة → يفشل/ينتهي مبتورًا | اختر وضعًا آليًا (`acceptEdits`, `approve-for-me`, `auto-review`, `skip`, `smart`) حسب الـ harness |
| 2 | تمرير `permission_mode` من vocabulary harness آخر | رفض أو سلوك غير متوقع | راجع جدول المفردات أعلاه |
| 3 | إرسال `"null"` كنص للـ harnesses بلا أوضاع | خطأ في الإعداد | `JSON null` |
| 4 | الاعتماد على `host_id` بلا تحقق من الاتصال | تشغيل مسجّل failed بصمت | تحقق من `sys_session_get_info` (runner connectivity / host online) |
| 5 | تبديل `agent_id` في مهمة مجدولة ثم توقّع بقاء النموذج | يعود للافتراضي | أرسِل `model_override` و`reasoning_effort` و`permission_mode` معًا |
| 6 | انتظار وصول رد `sys_session_message` تلقائيًا | لا شيء يصل | `sys_session_get_history` يدويًا؛ `queued` ≠ نُفِّذ |
| 7 | إعادة إرسال رسالة غير مؤكد تسليمها | تنفيذ مزدوج | لا تُعِد الإرسال تلقائيًا عند الشك |
| 8 | إنشاء sandbox متوقعًا `min INTERVAL=10` | رفض الجدولة | جلسات sandbox الجديدة تتطلب ساعة |
| 9 | افتراض أن الـ harness المطلوب مُهيّأ على الـ host | `unavailable_reason` | تحقق من `available_on_host` قبل الإطلاق |
| 10 | تعديل وكيل أثناء تشغيل جلسة | لا تأثير على الجلسة الحالية | التغيير يخص التشغيلات القادمة |

## مثال قصير

مهمة مجدولة يومية (اختَر harness آليًا):

```text
agent_id: "ag_xxx"                      # harness = Claude Code
rrule:    "FREQ=DAILY;BYHOUR=9;BYMINUTE=0"
timezone: "Asia/Riyadh"
prompt:   "راجع ملاحظات Knowledge/ وأضف ما يستجد"
permission_mode: "acceptEdits"          # ليس default/plan
session_mode: "new"
execution_target: "connected_host"
workspace: "C:\\Users\\FastFree\\Desktop\\fastfree"
```

وصف جلسة قائمة:

```text
sys_session_get_info(session_id="conv_abc")
→ status · agent binding · harness + readiness · runner connectivity
  · reasoning_effort · model · parent · workspace · project · pending approvals
```

تبديل harness لمهمة مجدولة (وتذكّر إعادة إرسال الإعدادات):

```text
sys_scheduled_task_update(
  scheduled_task_id="...",
  agent_id="ag_codex",            # harness تحوّل إلى Codex
  prompt="...",                   # يُعاد إرساله دائمًا
  permission_mode="approve-for-me",
  model_override="gpt-5-codex",   # ضروري — لا يُنقل تلقائيًا
  reasoning_effort="high"
)
```

## روابط رسمية / مراجع

- Omnigent App (سطح الجلسات والأتمتة): لوحة Automations + عرض الجلسات.
- مراجع محلية: [[FastFree Clan Kanban]] · [[FastFree Clan Tasks and Phases]] ·
  [[Handoff to Hermes]] (Endpoints: A2A `9900`, HTTP MCP `9920`).
- توثيق Omnigent العام: **لم يُتحقق منه آليًا** في هذه الجلسة (لا وصول ويب).
  تحقّق منه من داخل التطبيق: معلومات الجلسة/الوكيل هي المصدر الحقيقي للـ harness والمفردات.

## إضافات لاحقة

- (تُضاف هنا تفاصيل الـ harnesses الجديدة أو تغيّر مفردات الصلاحيات بعد التحقق من التوثيق العام.)
