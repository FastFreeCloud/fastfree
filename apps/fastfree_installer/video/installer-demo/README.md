# مثبّت FastFree — فيديو العرض (HyperFrames)

فيديو تعريفي حقيقي (22 ثانية، 1920×1080) لمسار المثبّت: الست خطوات بأسمائها الفعلية، بألوان هوية FastFree وشعارها الرسمي.

- التركيب: [`index.html`](index.html)
- الفيديو المصيَّر: `renders/installer-demo_*.mp4` (H.264، 30fps، 660 إطارًا)
- لقطة مراجعة: `renders/preview-contact-sheet.jpg`

## مصادر الحقيقة (لا تُكتب من الذاكرة)

| العنصر | المصدر |
|---|---|
| أسماء الخطوات الست | `src/composables/useI18n.ts` → `steps.step1..step6` |
| ترتيب الخطوات وربطها بالشاشات | `src/components/StepProgress.vue`، `src/App.vue` |
| ألوان الهوية | hex الفعلي في `src/assets/styles/*.css` |
| الشعار | `public/logo.svg` (منسوخ إلى `assets/logo.svg`) |

عند تغيير خطوة في المعالج، عدّل السطر المقابل في `index.html` ثم أعد `npm run check`.

## الألوان المستخدمة

`#09090B` خلفية · `#18181B`/`#27272A` أسطح · `#3F3F46` حدود · `#F8FAFC` نص · `#94A3B8` نص ثانوي · `#38BDF8` أساسي · `#10B981` نجاح.

## التشغيل

```bash
npm run check                     # lint + runtime + layout + motion + contrast
npx hyperframes snapshot --at 1,6,11,15,20
npm run render                    # MP4 في renders/
```

## التصيير يحتاج FFmpeg

`render` يفشل بـ `FFmpeg not found` إن لم يكن على `PATH`. بدل تثبيته على النظام، المشروع يحمل نسخة محلية في `devDependencies`:

```bash
export PATH="$PWD/node_modules/ffmpeg-static:$PWD/node_modules/ffprobe-static/bin/win32/x64:$PATH"
npm run render
```

## ملاحظات الفحص المقبولة

`npm run check` يمرّ بصفر أخطاء مع تحذيرات مقصودة:

- **بنية متداخلة**: المشاهد أقسام داخل التركيب الجذري لا sub-compositions — مقبول لفِلم قصير، وبوابة الأخطاء لا تتأثر.
- **أحجام نص صغيرة**: تسميات شريط الخطوات 19px (تحت حد 28px) — الفيلم لسطح مكتب لا لهاتف.
- **بلا صوت**: لم يُضَف تعليق صوتي بعد؛ أضِفه عبر `/media-use` ثم `data-fade-in/out`.

## تحذير أمني

لا تُصوّر شاشات حقيقية تحمل مفتاح ترخيص أو Clan Vars. بصمة العتاد في المشهد 3 معروضة مقنّعة (`••••-••••-••••`) عن قصد.
