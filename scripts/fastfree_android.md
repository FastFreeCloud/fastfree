# FastFree Android — الدليل الشامل

> دليل كامل لإعداد وبناء ونشر تطبيقات FastFree على Google Play Store.

---

## جدول المحتويات

- [1. نظرة عامة](#1-نظرة-عامة)
- [2. التطبيقات الأربعة](#2-التطبيقات-الأربعة)
- [3. الأدوات المطلوبة](#3-الأدوات-المطلوبة)
- [4. بناء وتشغيل محلي](#4-بناء-وتشغيل-محلي)
- [5. Google Cloud Setup (WIF)](#5-google-cloud-setup-wif)
- [6. Google Play Console Setup](#6-google-play-console-setup)
- [7. GitHub Secrets](#7-github-secrets)
- [8. دورة حياة النشر](#8-دورة-حياة-النشر)
- [9. بناء Tag ورفع على GitHub](#9-بناء-tag-ورفع-على-github)
- [10. Troubleshooting](#10-troubleshooting)
- [11. أوامر مساعدة](#11-أوامر-مساعدة)

---

## 1. نظرة عامة

### البنية

```
FastFree Monorepo
├── apps/
│   ├── fastfree_pos/        ← POS (نقطة بيع)
│   ├── fastfree_erp/        ← ERP (تخطيط الموارد)
│   ├── fastfree_hr/         ← HR (الموارد البشرية)
│   └── fastfree_ledger/     ← Ledger (الدفتر)
├── scripts/
│   ├── fastfree-android/        ← مشروع Python (uv): النشر والأتمتة
│   │   ├── fastfree_store_metadata.py   ← نصوص المتجر
│   │   ├── fastfree_store_graphics.py   ← البنرات
│   │   ├── fastfree_store_publish.py    ← الرفع على Play (API)
│   │   ├── fastfree_store_screenshots.py← قص الصور
│   │   ├── fastfree_console_pos/erp/hr/ledger_setup.py ← تمهيد الكونسول
│   │   └── fastfree_android_keystore.py ← المفتاح الثابت + ربط Gradle
│   └── fastfree_android.md      ← هذا الدليل
└── .github/workflows/
    ├── 09-build-pos-android.yaml
    ├── 10-build-erp-android.yaml
    ├── 11-build-hr-android.yaml
    ├── 12-build-ledger-android.yaml
    └── 18-capture-screenshots.yaml
```

### التقنيات

| المكون | الإصدار |
|--------|---------|
| Quasar | Vite + Vue 3 |
| Capacitor | 7.x |
| Node.js | 22 |
| Java | 21 (Temurin) |
| pnpm | 11.11.0 |
| Gradle | عبر `gradle/actions/setup-gradle@v6` |
| Google Auth | `google-github-actions/auth@v3` (WIF) |
| Python | 3.11 عبر `uv` (يثبت نفسه بنفسه) |
| Play libs | `playwright`, `pillow`, `google-api-python-client` (في `uv.lock`) |

### معلومات المشروع

| الخاصية | القيمة |
|---------|--------|
| GCP Project ID | `fastfree-508417` |
| GCP Project Number | `639480735306` |
| Service Account | `fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com` |
| WIF Pool | `github-actions-pool` |
| WIF Provider | `github-provider` |

---

## 2. التطبيقات الأربعة

### جدول التطبيقات

| التطبيق | المجلد | Package Name | Tag |
|---------|--------|--------------|-----|
| FastFree POS | `apps/fastfree_pos` | `com.fastfree.pos` | `pos-v*` |
| FastFree ERP | `apps/fastfree_erp` | `com.fastfree.erp` | `erp-v*` |
| FastFree HR | `apps/fastfree_hr` | `com.fastfree.hr` | `hr-v*` |
| FastFree Ledger | `apps/fastfree_ledger` | `com.fastfree.ledger` | `ledger-v*` |

### Capacitor Plugins (identical في كل التطبيق)

| Plugin | الإصدار |
|--------|---------|
| `@capacitor/android` | ^7.0.0 |
| `@capacitor/core` | ^7.0.0 |
| `@capacitor/cli` | ^7.0.0 |
| `@capacitor/splash-screen` | ^7.0.0 |
| `@capacitor/status-bar` | ^7.0.0 |
| `@capacitor/app` | ^7.0.0 |
| `@capacitor/browser` | ^7.0.0 |
| `@capacitor/haptics` | ^7.0.0 |
| `@capacitor/keyboard` | ^7.0.0 |

### Signing

| الخاصية | القيمة |
|---------|--------|
| Keystore | `release.jks` |
| Alias | `fastfree` |
| Store Password | `FastFree@2026` |
| Key Password | `FastFree@2026` |
| Algorithm | RSA 2048-bit |
| DN | `CN=FastFree, OU=IT, O=FastFree, L=Riyadh, ST=Riyadh, C=SA` |

> **ملاحظة:** Keystore واحد ثابت لا يُرفع على Git. يُولَّد مرة واحدة بـ
> `fastfree_android_keystore.py --gen` (يُحفظ في `.auth/signing/` المتجاهَل)،
> وخطوة `--wire` تربطه بـ Gradle حتى يوقَّع الـ AAB بنفس مفتاح الـ APK.

---

## 3. الأدوات المطلوبة

### مثبت عندك ✅

| الأداة | الإصدار | الحالة |
|--------|---------|--------|
| Git | 2.55.0 | ✅ مثبت |
| Node.js | 26.7.0 | ✅ مثبت |
| pnpm | 11.11.0 | ✅ مثبت |
| GitHub CLI (`gh`) | 2.97.0 | ✅ مثبت |
| Google Cloud SDK (`gcloud`) | 584.0.0 | ✅ مثبت |

### تثبيت gcloud (إن لم يكن مثبتاً)

```powershell
winget install Google.CloudSDK --accept-package-agreements --accept-source-agreements
```

> **مهم بعد التثبيت:** أغلق PowerShell وأعد فتحه حتى يعمل `gcloud`.

### تسجيل الدخول لـ gcloud

```powershell
# فتح رابط في المتصفح للمصادقة
gcloud auth login

# تعيين المشروع
gcloud config set project fastfree-508417

# تحقق
gcloud config list
```

### أدوات اختيارية للبناء المحلي

| الأداة | الغرض | التثبيت |
|--------|-------|---------|
| Java 21 | Gradle builds + keytool | `winget install EclipseAdoptium.Temurin.21.JDK` |
| Android SDK | build + sign | يتطلب Android Studio |

---

## 4. بناء وتشغيل محلي

### بناء POS محلياً

```powershell
cd apps/fastfree_pos

# تثبيت الDependencies
pnpm install --no-frozen-lockfile --ignore-scripts
cd src-capacitor; npm install; cd ../..

# تجهيز Quasar
mkdir -p .quasar
echo '{"compilerOptions":{}}' > .quasar/tsconfig.json
pnpm exec quasar prepare --silent

# بناء Web Assets
$env:VITE_API_BASE_URL = "https://backend.fastfree.cloud"
pnpm exec quasar build

# إضافة Android Platform
cd src-capacitor
npx cap add android
npx cap sync android

# بناء APK
cd android
gradle assembleRelease

# بناء AAB (للـ Play Store)
gradle bundleRelease
```

### نتائج البناء

```
APK موقعه:
apps/fastfree_pos/src-capacitor/android/app/build/outputs/apk/release/

AAB موقعه:
apps/fastfree_pos/src-capacitor/android/app/build/outputs/bundle/release/
```

---

## 5. Google Cloud Setup (WIF)

### نظرة عامة

```
Workload Identity Federation (WIF) يسمح لـ GitHub Actions
بالتواصل مع Google Cloud بدون أي ملفات مفاتيح (keyless).

بدون WIF:  ملف JSON ثابت (خطر تسريب)
مع WIF:    كلمة سر مؤقتة تُنشأ تلقائياً كل مرة (آمن)
```

### الحالة الحالية

| الخطوة | الحالة |
|--------|--------|
| 1. فعّل 4 APIs | ✅ تم |
| 2. أنشئ Service Account | ✅ `fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com` |
| 3. أنشئ WIF Pool | ✅ `github-actions-pool` |
| 4. أنشئ OIDC Provider | ✅ تم (`github-provider`) |
| 5. IAM Binding | ✅ تم |
| 6. GitHub Secrets | ✅ لا حاجة (القيم hardcoded — معلومات عامة) |

---

### الخطوة 1: فعّل APIs ✅ تم

```
تم تفعيل هذه APIs من Google Cloud Console:
1. androidpublisher.googleapis.com
2. iam.googleapis.com
3. iamcredentials.googleapis.com
4. sts.googleapis.com
```

### الخطوة 2: Service Account ✅ تم

```
البريد: fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com
بدون مفتاح (keyless)
```

### الخطوة 3: WIF Pool ✅ تم

```
Pool ID: github-actions-pool
```

### الخطوة 4: OIDC Provider — أكمل من المتصفح

```
1. افتح: https://console.cloud.google.com/iam-admin/workload-identity-pools?project=fastfree-508417
2. افتح Pool: github-actions-pool
3. اضغط: Add Provider
4. اختر: OpenID Connect (OIDC)
5. املأ:

   Provider name:    github-provider
   Issuer URL:       https://token.actions.githubusercontent.com
   JWK file:         (اتركه فاضي)
   Audiences:        (اتركه فاضي — Default يكفي)

6. Attribute mapping — أضف 4:

   google.subject           = assertion.repository_owner + '/' + assertion.repository
   attribute.actor          = assertion.actor
   attribute.repository     = assertion.repository
   attribute.repository_owner = assertion.repository_owner

7. Attribute condition:

   assertion.repository_owner == 'FastFreeCloud'

8. Save and Continue → Finish
```

### الخطوة 5: IAM Binding — أو عبر gcloud

```powershell
# الطريقة الأولى: من Google Cloud Console
# IAM → Add Principal → اكتب البريد → اختر Workload Identity User

# الطريقة الثانية: عبر gcloud
gcloud iam service-accounts add-iam-policy-binding `
  fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com `
  --role="roles/iam.workloadIdentityUser" `
  --member="principalSet://iam.googleapis.com/projects/639480735306/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/FastFreeCloud/fastfree" `
  --project=fastfree-508417
```

### الخطوة 6: احصل على قيم GitHub Secrets

```powershell
# GOOGLE_WORKLOAD_IDENTITY_PROVIDER:
gcloud iam workload-identity-pools providers describe github-provider `
  --workload-identity-pool=github-actions-pool `
  --location=global `
  --project=fastfree-508417 `
  --format="value(name)"
```

النتيجة:
```
projects/639480735306/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider
```

```powershell
# GOOGLE_SERVICE_ACCOUNT_EMAIL:
echo fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com
```

---

## 6. Google Play Console Setup

### الخطوة 1: إنشاء 4 تطبيقات

```
1. افتح: https://play.google.com/console
2. Create new app × 4:

   ┌──────────────────────────────────────────────────────────┐
   │ التطبيق      │ Package Name       │ اللغة │ السعر      │
   │──────────────│────────────────────│───────│───────────│
   │ FastFree POS │ com.fastfree.pos   │ AR    │ مجاني     │
   │ FastFree ERP │ com.fastfree.erp   │ AR    │ مجاني     │
   │ FastFree HR  │ com.fastfree.hr    │ AR    │ مجاني     │
   │ FastFree Led │ com.fastfree.ledger│ AR    │ مجاني     │
   └──────────────────────────────────────────────────────────┘
```

### الخطوة 2: دعوة Service Account

```
في كل تطبيق:
1. Users and Access → Permissions
2. Invite new user
3. البريد: fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com
4. الصلاحية: Release manager
5. كرر لكل التطبيقات الأربعة
```

### الخطوة 3: Privacy Policy URL

```
في كل تطبيق: Main store listing → Privacy Policy URL:
https://fastfree.cloud/privacy-policy.html
```

### الخطوة 4: رفع أول AAB

```
في كل تطبيق: Test and release → Testing → Internal testing
→ Create new release → ارفع ملف AAB → Start rollout to Internal

⚠️ أول تطبيق + أول رفع يدوياً (أو بسكربتات التمهيد أدناه).
بعدها كل شيء تلقائي عبر API.
```

### الخطوة 5: التمهيد الآلي (بديل اليدوي)

```
# مرة واحدة: ثبّت الاعتماديات (uv يثبت بايثون بنفسه)
cd scripts/fastfree-android
uv sync --locked

# ولّد مفتاح التوقيع الثابت (يثبت JDK تلقائياً إن غاب)
uv run fastfree_android_keystore.py --gen

# سجّل الدخول بيدك مرة واحدة ثم تُنشأ التطبيقات الأربعة تلقائياً
uv run fastfree_console_pos_setup.py
uv run fastfree_console_erp_setup.py
uv run fastfree_console_hr_setup.py
uv run fastfree_console_ledger_setup.py
# كل ملف: إنشاء التطبيق → دعوة SA → رفع أول AAB → تقرير
```

### الصيغ المقبولة على Play Store

```
┌────────────────────────────────────────────────────────┐
│ الصيغة    │ الحجم الأقصى │ الحالة                     │
│───────────│──────────────│───────────────────────────│
│ .aab      │ 4 GB         │ ✅ مطلوب (جديد)           │
│ .apk      │ 100 MB       │ ⚠️ قديم فقط              │
└────────────────────────────────────────────────────────┘
```

---

## 7. GitHub Secrets

### المطلوب لـ WIF

**لا حاجة لأي secrets!** القيم مكتوبة مباشرة في workflows لأنها معلومات عامة (ليست أسرار):

```
GOOGLE_WORKLOAD_IDENTITY_PROVIDER = projects/639480735306/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider
GOOGLE_SERVICE_ACCOUNT_EMAIL = fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com
```

> **الأمان الحقيقي:** WIF يتحقق إن الطلب جاي من ريبو `FastFreeCloud/fastfree` فقط عبر OIDC token.
> حتى لو يعرف أحد هالقيم، ما يقدر يستخدمها بدون الوصول لحساب GitHub.

### ملاحظات

- لا تُخزّن أي كلمة سر ثابتة في الكود
- WIF يأخذ كلمة سر مؤقتة تلقائياً كل مرة
- لا حاجة لأي GitHub Secrets للنشر

---

## 8. دورة حياة النشر

### التدفق الكامل

```
┌──────────────┐
│  git push    │
│  tag pos-v*  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  GitHub Actions (ubuntu-latest)                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  1. Checkout + Setup (Node, Java, Android SDK, pnpm, uv)  │
│                    ↓                                      │
│  2. pnpm install + npm install (Capacitor)               │
│                    ↓                                      │
│  3. quasar prepare + quasar build (web assets)           │
│                    ↓                                      │
│  4. cap add android + cap sync android                   │
│                    ↓                                      │
│  5. Generate Keystore (secret → ملف → مؤقت) + ربطه بـ Gradle (wire) │
│                    ↓                                      │
│  6. gradle assembleRelease → unsigned APK                │
│                    ↓                                      │
│  7. apksigner → signed APK                               │
│                    ↓                                      │
│  8. gradle bundleRelease → AAB (موقَّع بنفس المفتاح)      │
│                    ↓                                      │
│  9. Upload APK + AAB as artifacts                        │
│                    ↓                                      │
│  10. Authenticate (WIF → GoogleAuth/adc)                 │
│                    ↓                                      │
│  11. fastfree_store_publish.py → Play Store (internal)   │
│      (قبله: metadata + graphics بنفس المشروع)            │
│                    ↓                                      │
│  12. Create GitHub Release (APK)                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│  Google Play │
│  (internal)  │
└──────────────┘
```

### الإصدار التلقائي

```
versionCode = YYYYMMDD × 100 + github.run_number
versionName = YYYY.MM.DD

مثال:
  date = 2026-09-13 → 20260913
  run_number = 42
  versionCode = 2026091342
  versionName = "2026.09.13"
```

---

## 9. بناء Tag ورفع على GitHub

### بناء POS

```powershell
git tag pos-v1.0.0
git push origin pos-v1.0.0
```

### بناء كل التطبيقات

```powershell
# POS
git tag pos-v1.0.0; git push origin pos-v1.0.0

# ERP
git tag erp-v1.0.0; git push origin erp-v1.0.0

# HR
git tag hr-v1.0.0; git push origin hr-v1.0.0

# Ledger
git tag ledger-v1.0.0; git push origin ledger-v1.0.0
```

### مراقبة البناء

```powershell
# عرض آخر الـ runs
gh run list --repo FastFreeCloud/fastfree --limit 5

# عرض تفاصيل run محدد
gh run view RUN_ID --repo FastFreeCloud/fastfree

# مراقبة live
gh run watch RUN_ID --repo FastFreeCloud/fastfree
```

### تشغيل يدوي (بدون tag)

```powershell
gh workflow run 09-build-pos-android.yaml --repo FastFreeCloud/fastfree
gh workflow run 10-build-erp-android.yaml --repo FastFreeCloud/fastfree
gh workflow run 11-build-hr-android.yaml --repo FastFreeCloud/fastfree
gh workflow run 12-build-ledger-android.yaml --repo FastFreeCloud/fastfree
```

---

## 10. Troubleshooting

### أخطاء شائعة

| الخطأ | السبب | الحل |
|-------|-------|------|
| `403 Permission denied` | SA غير مدعو في Play Console | ادعوة من Users and Access |
| `Unable to acquire impersonated credentials` | IAM Binding خاطئ | تحقق من PROJECT_NUMBER |
| `No AAB found` | البناء فشل قبل النشر | تحقق من logs البناء |
| `Could not load default credentials / GOOGLE_APPLICATION_CREDENTIALS not set` | خطوة WIF لم تنجح قبل النشر | تحقق من `Authenticate to Google Cloud (WIF)` — لا secrets مطلوبة |
| `gcloud: command not found` | gcloud مش في الـ PATH | أعد فتح PowerShell بعد التثبيت |
| `Workload Identity Pool not found` | Pool غير موجود | تحقق من اسم الـ pool |
| `Token expired` | Access token منتهي الصلاحية | WIF يُنشئ token جديد تلقائياً |

### اختبار WIF محلياً

```powershell
# تحقق من gcloud
gcloud --version

# تحقق من المشروع
gcloud config list

# تحقق من Service Accounts
gcloud iam service-accounts list --project=fastfree-508417

# تحقق من Pool
gcloud iam workload-identity-pools list --project=fastfree-508417 --location=global

# تحقق من Provider
gcloud iam workload-identity-pools providers list `
  --workload-identity-pool=github-actions-pool `
  --project=fastfree-508417 `
  --location=global
```

---

## 11. أوامر مساعدة

### بناء سريع

```powershell
cd apps/fastfree_pos
pnpm exec quasar build
cd src-capacitor
npx cap sync android
cd android
gradle assembleRelease
```

### رفع على GitHub

```powershell
.\scripts\fastfree_push.ps1 -Force
```

### رفع + نشر

```powershell
.\scripts\fastfree_deploy.ps1
```

### عرض حالة الـ workflows

```powershell
gh run list --repo FastFreeCloud/fastfree --limit 10
```

### تنظيف Runs الفاشلة

```powershell
.\scripts\fastfree_cleanup.ps1 -All
```

### إعادة بناء الصور

```powershell
.\scripts\fastfree_rebuild.ps1
```

---

## ملاحظات أمنية

> **لا تُخزّن أي كلمات سر في الكود المصدري.**

- `FastFree@2026` موجود في `nix/clients/*.nix` (يجب تدويره)
- WIF لا يحتاج أي ملفات مفاتيح
- Keystore ثابت واحد في `.auth/signing/` (متجاهَل من Git) — يُولَّد بـ `fastfree_android_keystore.py --gen`
- `ANDROID_KEYSTORE_BASE64` = base64-encoded keystore (اختياري، لتثبيت المفتاح في CI)

---

> آخر تحديث: 2026-09-13
