# Paseo CLI Reference — FastFree（بديل Herdr الرسمي）

> Paseo هو منسّق الوكلاء (agent orchestrator) المعتمد الوحيد في FastFree.
> Herdr أُزيل بالكامل من طبقة الأسطول (`apps/fastfree_os`) وموصلات MCP.
> سطر الأوامر على Windows: `C:\Users\FastFree\AppData\Local\Programs\paseo\resources\bin\paseo.cmd`
> (التوزيعات: `npm i -g @getpaseo/cli`). الملف الشخصي للديمون: `~/.paseo`، والمستند أعلاه من نسخة `paseo --help`.

## الفرق عن Herdr

| | Herdr (القديم) | Paseo (الحالي) |
|---|---|---|
| الديمون | `herdr server` + سوكت | `paseo daemon start` — MCP محلي على `127.0.0.1:6767` |
| ترتيب الوكلاء | panes/terminals داخل multiplexer | وكلاء ملحَقون بمساحات عمل (worktrees) |
| MCP | herdr-mcp plugin | حقن تلقائي في الوكلاء المنطلَقين من Paseo (`injectIntoAgents: true`) — الاتصال عبر WebSocket للديمون على `127.0.0.1:6767`؛ تسجيله كخادم HTTP-MCP خارجي معطّل حالياً (`enabled: false`) حتى توثيق نقطة النهاية الرسمية |

## الأوامر الأساسية (من `paseo --help`)

```bash
paseo ls                     # قائمة الوكلاء
paseo run "<prompt>"         # إنشاء وكيل وبدء مهمة
paseo send <id> "<prompt>"   # إرسال تابع/مهمة لوكيل قائم
paseo attach <id>            # متابعة مخرجات وكيل قيد التشغيل
paseo logs <id>              # سجل نشاط الوكيل
paseo inspect <id>           # تفاصيل الوكيل
paseo wait <id>              # الانتظار حتى يصبح الوكيل خاملًا
paseo stop <id> / delete <id> / archive <id>
paseo clone <repo>           # استنساخ مستودع GitHub كمسمارة عمل
paseo import <id>            # استيراد جلسة مزود كوكيل
paseo status                 # حالة الديمون والنقطة المنشورة
paseo --json ls              # مخرجات JSON (الافتراضي table)
```

## الإدارة

```bash
paseo daemon start | run | status | stop | restart | reload | pair
paseo daemon config          # قراءة/تعديل الكونفيج الدائم (config.json)
paseo terminal | script | schedule | heartbeat | permit | provider
paseo hub connect [origin]   # تسجيل الديمون مع Paseo Hub (حكم FastFree: Hub ذاتي الاستضافة على client1 فقط)
paseo hub export | deploy    # تصدير/نشر التريگرات بصيغة YAML
paseo plugin ls | install <source>
```

## MCP داخل المشروع

بديل مدخل `herdr` السابق في `config/mcp-servers.json` و`opencode.json`:

```json
"paseo": { "type": "remote", "url": "http://127.0.0.1:6767/mcp", "enabled": true }
```

الديمون يحقن أدوات MCP تلقائيًا في الوكلاء (`injectIntoAgents`): `list_agents`,
`create_workspace`, `create_agent`, `send_agent_prompt`, `get_agent_status`,
`get_agent_activity`. للأليفة المستمرة انظر مهارات `paseo-conductor`,
`paseo-fanout`, `paseo-review-loop`.

## NixOS

لا توجد حزمة `paseo` في nixpkgs-26.05 ولا flake علوي معروف؛ لذلك `modules/shell.nix`
لا يعلن عنها ويشرح تثبيتها كثنائي علوي أثناء التسجيل (enrollment) — لا تضف اسم
حزمة مختلقًا. لا تُكتب أي أسرار (API keys، tokens) في ملفات `.nix`؛ استخدم
`paseo hub login` / secrets خارجيًا.
