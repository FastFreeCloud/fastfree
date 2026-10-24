# FastFree Android & Google Play Automation Guide

يوثق هذا الدليل منظومة بناء وتوقيع ونشر تطبيقات أندرويد الأربعة لمنصة FastFree على متجر Google Play Store باستخدام **Capacitor 7**، وسكربتات **Python (uv)**، والمصادقة المتقدمة دون مفاتيح **Workload Identity Federation (WIF)**.

---

## 1. التطبيقات الأربعة ومعرفات الحزم (The 4 Android Apps)

| التطبيق | مسار المشروع | Package Name | بادئة الـ Tag | مسار سير العمل في GitHub |
|---|---|---|---|---|
| **FastFree POS** | `apps/fastfree_pos` | `com.fastfree.pos` | `pos-v*` | `.github/workflows/1_fastfree_android_pos.yaml` |
| **FastFree ERP** | `apps/fastfree_erp` | `com.fastfree.erp` | `erp-v*` | `.github/workflows/4_fastfree_android_erp.yaml` |
| **FastFree HR** | `apps/fastfree_hr` | `com.fastfree.hr` | `hr-v*` | `.github/workflows/2_fastfree_android_hr.yaml` |
| **FastFree Ledger** | `apps/fastfree_ledger` | `com.fastfree.ledger` | `ledger-v*` | `.github/workflows/3_fastfree_android_ledger.yaml` |

---

## 2. إدارة التوقيع ومفتاح التشفير (Stable Keystore Policy)

> [!CAUTION]
> **قاعدة أمان صارمة**: لا تقم مطلقاً بإنشاء أو استخدام مفاتيح توقيع مؤقتة (Ephemeral Keystores) لمتجر Play، لأن متجر Play يقوم بربط بصمة المفتاح (Certificate Pinning). استخدام مفتاح مؤقت يمنع ترقية التطبيق مستقبلاً.

- مسار المفتاح الثابت المعتمد: `.auth/signing/release.jks`
- الاسم المستعار (Alias): `fastfree`
- يتم فحص وتوليد وربط المفتاح باستخدام سكربت البايثون المعتمد:
  ```bash
  cd scripts/fastfree-android
  uv run fastfree_android_keystore.py --wire --app-dir ../../apps/fastfree_pos
  ```
- يقوم السكربت تلقائياً بضبط `targetSdkVersion = 36` في ملف `variables.gradle` لتلبية متطلبات متجر جوجل بلاي.

---

## 3. المصادقة دون مفاتيح (Keyless WIF Authentication)

تتصل مسارات GitHub Actions بـ Google Cloud و Google Play Console دون الحاجة لتخزين ملفات Service Account JSON الحساسة، بل بالاعتماد على اتحاد الهويات:
- **GCP Project ID**: `fastfree-508417`
- **GCP Project Number**: `639480735306`
- **Service Account**: `fastfree-play-publisher@fastfree-508417.iam.gserviceaccount.com`
- **WIF Pool**: `github-actions-pool`
- **WIF Provider**: `github-provider`

الصلاحيات الأربعة الدقيقة الممنوحة للـ Service Account:
1. Release apps to testing tracks (رفع الـ AABs وإطلاقها للمسار الداخلي).
2. Release to production, exclude devices, and use Play App Signing.
3. Manage store presence (إدارة العناوين والشروحات والرسومات).
4. View app information (صلاحية القراءة الأساسية المطلوبة لإتمام عمليات الـ commit).

---

## 4. أتمتة النشر والتكامل المستمر (CI / Workflows)

تدار جميع عمليات البناء والنشر المباشر عبر مسارات عمل GitHub Actions (`.github/workflows/`):

- **بناء حزم AAB وتوقيعها**: مسار العمل يبني التطبيقات ويوقعها باستخدام مفتاح `release.jks`.
- **نشر Google Play**: يتم النشر التلقائي إلى مسار الاختبار الداخلي عبر مصادقة WIF الرسمية الخالية من الأسرار.

---

## 5. قواعد ترقيم الإصدارات (Versioning Rules)

- `versionName`: بصيغة التاريخ `YYYY.MM.DD` (مثال: `2026.10.09`).
- `versionCode`: محسوب رياضياً لمنع أي تكرار عبر المعادلة:
  $$\text{versionCode} = (\text{YYYYMMDD} \times 100) + \text{github.run\_number}$$
- كل رفع لملف AAB يستهلك رقمه البرمجي نهائياً، حتى وإن تم إلغاء المسودة في الكونسول؛ لذلك عند إعادة المحاولة يجب تشغيل بناء جديد برقم أعلى.
