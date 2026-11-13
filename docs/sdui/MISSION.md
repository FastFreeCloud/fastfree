# مهمة SDUI — بناء نظير stac.dev لـFastFree

> هذه الوثيقة هي المرجع لكل وكلاء OpenCode الذين يعملون على مهام `SDUI-*` على fastfree_board.
> اقرأها قبل البدء. الخطة الكاملة: `docs/sdui/PLAN.md`.

## المهمة

بناء منصة **Server-Driven UI** شبيهة بـ[stac.dev](https://stac.dev) لكن لـFastFree:
تطبيقات **Vue 3 + Quasar + Tauri** تستقبل واجهاتها كـJSON من خادم FastFree وتعرضها فورًا،
دون إعادة بناء أو متاجر تطبيقات، مع استضافة ذاتية كاملة وترخيص MIT.

## لماذا

- المشروع يملك بالفعل محرك SDUI كامل في `packages/fastfree_lowcode/src/runtime/sdui/`
  (SduiNode + SduiRegistry + resolve + SduiCacheManager + SduiActionDispatcher + SduiPlayground).
- الناقص هو **الخادم والمنصة**: توصيل، إصدارات، نشر، Console، CLI، دفع فوري.
- الهدف: إغلاق هذه الفجوة على مراحل (P0→P4) مع تنفيذ عبر Opencode fastfree_board.

## القواعد العامة لكل المهام

1. **لا تكسر العقد القائم**: `SduiNode`/`SduiScreen` في `sdui/types.ts` — الإضافات في `meta` والطبقات الجديدة فقط.
2. **الأمان أولًا**: كل إجراء من الخادم يمر بقائمة سماح؛ لا `eval`/`v-html` لمحتوى الخادم؛ توقيع HMAC للشاشات.
3. **عربي أول + RTL**: كل نص جديد `{ar,en}`، وكل تنسيق يستخدم خصائص منطقية.
4. **حر/مفتوح فقط**: Bun/Hono/SQLite/Zod/Vue/Quasar/Dexie — لا خدمات مدفوعة.
5. **لا كسر للتوافق**: الشاشات الموجودة (installer + panel) يجب أن تمر من المحقق الجديد.
6. **اختبر قبل أن تدعي الإنجاز**: شغّل الاختبارات الفعلية وأبلغ النتيجة.

## القيود التقنية

- Node v26.8.1، المشروع `C:\Users\FastFree\Desktop\fastfree`.
- OpenCode: استخدم نموذج `opencode-go/glm-5.3` (النماذج المجانية عند حد الاستخدام).
- لا تشغل `npm publish` لبلجن fastfree_board.
- لا تلمس `node_modules` مباشرة.

## معايير القبول العامة

- كل مهمة تُسلم بمخرج قابل للتحقق (اختبار ناجح، أو خادم يعمل، أو عرض فعلي).
- تحديث `docs/sdui/PLAN.md` عند تغيير معماري.
- التزام واضح بـ"لا كسر" في وصف المهمة.
