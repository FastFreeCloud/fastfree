# FastFree Android Play Store Release Guide & Keystore Manifest
## مواصفات توقيع ونشر تطبيقات أندرويد على Google Play Store

> **تحذير حاسم وقاعدة غير قابلة للتغيير (IMMUTABLE PLAY CONSOLE POLICY):**
> 
> المستخدم أكد صراحة:
> **"وبالنسبه للاندرويد خلي بالك اني رافع التطبيقات بالفعل علي google play نفس key لازم"**
> 
> *Google Play pins the app signing certificate upon the very first release.*
> **ممنوع منعاً باتاً** توليد مفتاح جديد أو استخدام أي مفتاح بخلاف المفتاح المعتمد والموثق هنا. أي محاولة لرفع AAB أو APK موقَّع بمفتاح مختلف ستؤدي فوراً إلى رفض التحديث من Google Play برسالة خطأ صريحة:
> `Your Android App Bundle is signed with the wrong key.`

---

## 1. بيانات المفتاح المعتمد (Canonical Keystore Manifest)

المفتاح المعتمد الوحيد لجميع تطبيقات FastFree هو:

| الخاصية | القيمة المعتمدة | ملاحظات التدقيق |
| :--- | :--- | :--- |
| **Keystore File** | `release.jks` | متطابق بنسبة 100% في المواقع الثلاثة |
| **Primary Location** | `.auth/signing/release.jks` | المسار الأساسي (Git-ignored) |
| **Secondary Replica** | `scripts/fastfree-android/keystore/release.jks` | نسخة احتياطية آمنة داخل المستودع |
| **ERP Live Replica** | `apps/fastfree_erp/src-capacitor/android/release.jks` | نسخة العمل النشطة لتطبيق ERP |
| **File Size** | **2,732 Bytes** | حجم الملف الثابت |
| **File SHA-256** | `7C462200AA611C7C9BC3DC5857075F570036A3A20EC56AB72F2DF32B384FAF76` | البصمة الثنائية للملف |
| **Keystore Type** | `PKCS12` | متوافق مع JDK 17+ و JDK 21 |
| **Key Alias** | `fastfree` | اسم المستعار المعتمد |
| **Store Password** | `<see GitHub Actions secret ANDROID_KEYSTORE_PASSWORD>` | كلمة مرور المخزن |
| **Key Password** | `<see GitHub Actions secret ANDROID_KEYSTORE_PASSWORD>` | كلمة مرور المفتاح الخاص |
| **Key Algorithm** | `RSA 2048-bit` | خوارزمية التشفير |
| **Signature Algorithm** | `SHA384withRSA` | خوارزمية التوقيع الرقمي |
| **Distinguished Name (DN)** | `CN=FastFree, OU=IT, O=FastFree, L=Riyadh, ST=Riyadh, C=SA` | بيانات المنظمة والمطور |
| **Serial Number** | `eaebdd31ccbbfd0e` | الرقم التسلسلي للشهادة |
| **Validity Period** | `2026-09-13` حتى `2081-06-16` | **20,000 يوم (~55 سنة)** |

### بصمات الشهادة الرقمية (Certificate Fingerprints)
* **Play Store Pinned SHA-256 Fingerprint**:
  ```text
  F5:0C:11:D1:C3:44:3E:B3:72:EF:5E:62:E0:16:B5:E5:E2:89:ED:42:48:F6:D3:FB:C8:08:28:A5:0B:97:AD:79
  ```
* **SHA-1 Fingerprint**:
  ```text
  40:CF:9B:F6:4B:F1:9E:62:06:02:40:9B:25:0F:70:0D:22:59:8D:1E
  ```

---

## 2. جدول التطبيقات الأربعة على Google Play Console

جميع التطبيقات تتبع نفس حساب المطور الرسمي ونفس هوية الحزم المعتمدة:
* **Developer Account ID**: `7269125617638997236`
* **GCP Project ID**: `fastfree-508417`
* **Service Account**: `fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com`

| التطبيق | مسار المجلد | Package Name (`applicationId`) | Google Play App ID | الحالة الحالية |
| :--- | :--- | :--- | :--- | :--- |
| **FastFree ERP** | `apps/fastfree_erp` | `com.fastfree.erp` | `4972280926407480271` | ✅ مجلد `android/` مهيأ ومربوط وموقَّع |
| **FastFree POS** | `apps/fastfree_pos` | `com.fastfree.pos` | `4972676838636058435` | ✅ تم إعداد القالب والقفل (انظر خطوة الإضافة أدناه) |
| **FastFree Ledger** | `apps/fastfree_ledger` | `com.fastfree.ledger` | `4974312878333959648` | ✅ تم إعداد القالب والقفل (انظر خطوة الإضافة أدناه) |
| **FastFree HR** | `apps/fastfree_hr` | `com.fastfree.hr` | `4975808492151675669` | ✅ تم إعداد القالب والقفل (انظر خطوة الإضافة أدناه) |

> [!IMPORTANT]
> **قاعدة عدم إنشاء مجلدات أندرويد معطوبة:**
> مجلدات `apps/fastfree_pos/src-capacitor/android`, `apps/fastfree_ledger/src-capacitor/android`, `apps/fastfree_hr/src-capacitor/android` لم تكن مضافة في بيئة العمل الحالية.
> **لا تقم بإنشاء مجلدات يدوية ناقصة.** يتم إنشاء المجلد حصرياً عبر أمر Capacitor الرسمي:
> `npx cap add android`
> يليه مباشرة تشغيل سكريبت الربط التلقائي:
> `python scripts/fastfree-android/fastfree_android_keystore.py --wire --app-dir fastfree_<app>`

---

## 3. متطلبات نظام التشغيل ومستويات الـ SDK لـ Google Play

متطلبات Google Play الإلزامية لإصدارات عام 2026:

| المتغير | القيمة | الملف المسؤول | الملاحظة |
| :--- | :--- | :--- | :--- |
| **targetSdkVersion** | **36** | `variables.gradle` | **إلزامي لـ Google Play لعام 2026** (Android 16 API 36) |
| **compileSdkVersion** | **36** | `variables.gradle` | متوافق ومستقر مع Capacitor 7 و Android 16 API 36 |
| **minSdkVersion** | **24** | `variables.gradle` | **إلزامي لحماية Google Play التلقائية Play Automatic Protection** (Android 7.0+) |
| **versionCode** | مثل `2026101801` | `build.gradle` | رقم إصدار تصاعدي بصيغة تاريخ (YYYYMMDDNN) |

---

## 4. إعداد ملف `keystore.properties` وقوالب التكوين

الملف المسؤول عن قراءة المفتاح بواسطة Gradle هو `keystore.properties` داخل مجلد `android/` لكل تطبيق:

```properties
# FastFree Android Release Signing Configuration
# Root project relative path to release.jks
storeFile=release.jks
storePassword=`<see GitHub Actions secret ANDROID_KEYSTORE_PASSWORD>`
keyAlias=fastfree
keyPassword=`<see GitHub Actions secret ANDROID_KEYSTORE_PASSWORD>`
```

تم توفير قوالب دائمة غير متجاهلة في Git داخل:
* `apps/fastfree_erp/src-capacitor/keystore.properties.template`
* `apps/fastfree_pos/src-capacitor/keystore.properties.template`
* `apps/fastfree_ledger/src-capacitor/keystore.properties.template`
* `apps/fastfree_hr/src-capacitor/keystore.properties.template`
* `scripts/fastfree-android/keystore.properties.template`

---

## 5. خطوات البناء والتوقيع الرسمية (Official Build & Sign Workflow)

### أ) لبناء تطبيق ERP الحالي (المجهز مسبقاً بمجلد `android/`):

```powershell
# 1. الدخول لمجلد التطبيق وبناء أصول الويب
cd c:\Users\FastFree\Desktop\fastfree\apps\fastfree_erp
pnpm exec quasar build

# 2. مزامنة Capacitor مع أندرويد
cd src-capacitor
npx cap sync android

# 3. التأكد من ربط التوقيع ومستوى SDK 36
python ..\..\scripts\fastfree-android\fastfree_android_keystore.py --wire --app-dir fastfree_erp

# 4. بناء الـ AAB الموقع للنشر على Play Store
cd android
.\gradlew.bat bundleRelease
```

مكان الحزمة الناتجة الموقعة بالمفتاح الرسمي:
`apps/fastfree_erp/src-capacitor/android/app/build/outputs/bundle/release/app-release.aab`

---

### ب) لإعداد وبناء أي من التطبيقات الأخرى (`pos`, `ledger`, `hr`):

عند الرغبة في تجهيز أندرويد لتطبيق `fastfree_pos` (أو `fastfree_ledger` أو `fastfree_hr`):

```powershell
# 1. الدخول لمجلد التطبيق وبناء أصول الويب
cd c:\Users\FastFree\Desktop\fastfree\apps\fastfree_pos
pnpm exec quasar build

# 2. إضافة منصة أندرويد النظيفة رسمياً عبر Capacitor
cd src-capacitor
npx cap add android

# 3. تشغيل أداة الربط الذكية (تنسخ المفتاح المعتمد + تنشئ keystore.properties + تضبط SDK 36)
python ..\..\scripts\fastfree-android\fastfree_android_keystore.py --wire --app-dir fastfree_pos

# 4. التحقق التام من سلامة التكوين
python ..\..\scripts\fastfree-android\fastfree_android_keystore.py --verify

# 5. بناء حزمة AAB الموقعة
cd android
.\gradlew.bat bundleRelease
```

---

## 6. التحقق الآلي والتأكد من عدم رفض Google Play

تم تضمين نظام فحص وتدقيق صارم داخل الأداة:

```powershell
python scripts/fastfree-android/fastfree_android_keystore.py --verify
```

مخرجات الفحص الناجح:
```text
==============================================================================
 FASTFREE ANDROID KEYSTORE & GOOGLE PLAY APPS INTEGRITY AUDIT
==============================================================================

[1] CANONICAL KEYSTORE AUDIT
  [OK] Primary Keystore: .auth\signing\release.jks
       File SHA-256: 7C462200AA611C7C9BC3DC5857075F570036A3A20EC56AB72F2DF32B384FAF76
  [OK] Replicated Keystore: scripts\fastfree-android\keystore\release.jks
  [OK] Certified Play Fingerprint: F5:0C:11:D1:C3:44:3E:B3:72:EF:5E:62:E0:16:B5:E5:E2:89:ED:42:48:F6:D3:FB:C8:08:28:A5:0B:97:AD:79

[2] APPS CONFIGURATION & PLAY CONSOLE COMPLIANCE
  App Name         | Target Package ID      | Capacitor ID           | Android | Signing | SDK 36
  ----------------------------------------------------------------------------------------
  FastFree ERP     | com.fastfree.erp       | com.fastfree.erp       | YES     | WIRED   | 36
  FastFree POS     | com.fastfree.pos       | com.fastfree.pos       | NO      | N/A     | N/A
  FastFree Ledger  | com.fastfree.ledger    | com.fastfree.ledger    | NO      | N/A     | N/A
  FastFree HR      | com.fastfree.hr        | com.fastfree.hr        | NO      | N/A     | N/A
------------------------------------------------------------------------------
  RESULT: [PASSED] ALL APPS STRICTLY CONFIGURED FOR GOOGLE PLAY.
==============================================================================
```

كما يمكن فحص شهادة المفتاح مباشرة عبر JDK `keytool`:
```powershell
python scripts/fastfree-android/fastfree_android_keystore.py --info
```

---

## 7. النسخ الاحتياطي واستعادة المفتاح (Backup & Disaster Recovery)

لحماية هذا المفتاح الحرج من الضياع أو الحذف بالخطأ:

### أ) استخراج كود Base64 الآمن
قم بتشغيل الأمر:
```powershell
python scripts/fastfree-android/fastfree_android_keystore.py --backup
```
أو عبر PowerShell مباشرة:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".auth/signing/release.jks")) | Out-File -Encoding ascii keystore_backup_base64.txt
```

### ب) التخزين الآمن للسلسلة المشفرة
يجب تخزين محتوى السلسلة في:
1. **GitHub Repository Secret**: باسم `FASTFREE_ANDROID_KEYSTORE_BASE64`
2. **Google Cloud Secret Manager**: باسم `android-release-keystore`
3. خزنة كلمات المرور المشفرة (Bitwarden / 1Password / Keepass)

### ج) استعادة المفتاح في أي جهاز جديد (Restore Command)
في حال استنساخ المستودع لأول مرة أو على سيرفر CI/CD:
```powershell
# تأكد من إنشاء المجلد
New-Item -ItemType Directory -Force -Path ".auth\signing"

# استعادة الملف من السلسلة النصية المشفرة
$b64 = "MIIKqAIBAzCCClIGCSqGSIb3DQEHAaCCCkMEggo/MIIKOzCCBbIGCSqGSIb3DQEHAaCCBaMEggWf..."
[IO.File]::WriteAllBytes(".auth/signing/release.jks", [Convert]::FromBase64String($b64))

# التحقق من صحة الملف المسترجع
python scripts/fastfree-android/fastfree_android_keystore.py --verify
```

---

## 8. ملخص القوانين الصارمة للمطورين والوكلاء (Agent & Developer Directives)

1. **لا تنشئ مفاتيح جديدة أبداً:** لا تستخدم خيار `--gen --force` تحت أي ظرف ما لم يطلب المستخدم عمداً إعادة التعيين مع علمه بأن التطبيقات الحالية ستتوقف.
2. **لا تعدل `appId` في `capacitor.config.ts`:** يجب أن تظل:
   - `com.fastfree.erp`
   - `com.fastfree.pos`
   - `com.fastfree.ledger`
   - `com.fastfree.hr`
3. **لا ترفع ملفات `.jks` على Git العام:** ملف `.gitignore` يحميها محلياً، والنسخ الاحتياطية تكون عبر أسرار مشفرة فقط.
4. **دائماً حافظ على `targetSdkVersion = 36`:** لضمان قبول Google Play للإصدارات دون تحذيرات رفض.
