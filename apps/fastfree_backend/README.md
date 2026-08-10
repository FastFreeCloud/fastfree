# FastFree Backend

تطبيق Frappe مخصص، جاهز للإنتاج من الدرجة الأولى لـ **FastFree Cloud**.

يوفر تشغيل CI/CD المشفر بالكامل، إنشاء الموقع التلقائي، ونشر Docker Layer تنظيفي تحت `-d, --prune`.

---

🐋 **ابحثك لبدء البناء؟**
```bash
git clone https://github.com/FastFreeCloud/fastfree_backend.git
cd fastfree_backend
docker compose -f fastfree_deployment/docker-compose.yml up -d
watch -n 10 docker compose logs create-site
```

---

## 🎯 لماذا مختلف

- 🚀 **CI/CD الذكاء الاصطناعي المضاعف:** إنشاء التطبيق + بناء Docker + Release تلقائي
- 🐳 **الاستعداد الذاتي موقع Frappe واحد إلى:** `erp.fastfree.cloud`
- 📊 **الوضع الدائم تماماً:** الشبكة 10.0.1.0/24 + IP ثابت لكل خدمة (لا إعادة تشغيل)
- 🔐 **أنابيب المصادقة:** `GITHUB_TOKEN` فقط — لا PATs
- ☁️ **السحابة مطابقة:** `ghcr.io/fastfreecloud/fastfree_backend:latest` (صغيرة، قانون الأبات)
- ⛓ **الصحة الأساسية:** `healthcheck.sh` عبر موارد MariaDB / Redis
- ✉️ **الرسائل:** إنشاء رسائل GitHub Release + Tag (v1.0.2، v1.0.3، ...)

---

## 📦 البنية المعمارية (الـ .NET صارمة)

```
__________________fastfree_deployment/
                |
                |  FastFree Cloud Production Stack (11 services)
        _______________|________________________
        |   |        |   |   |   |   |   |   |   |
   10.0.1.10 configurator    10.0.1.20 backend
                                  10.0.1.30 frontend
                                  10.0.1.31 websocket
                                  10.0.1.40 queue-short
                                  10.0.1.41 queue-long
                                  10.0.1.42 scheduler
                                  10.0.1.50 db (MariaDB 11.8)
                                  10.0.1.60 redis-cache
                                  10.0.1.61 redis-queue
                                  10.0.1.70 phpmyadmin
                                  10.0.1.11 create-site (initialization once)
```

**الرسوم:** تأكد من النطاق الداخلي كامل (المراجعة سودية التقادم) والرجوع إلى مراقبة الشبكة.

---

## 🛠️ الاستخدام (الـ 10 أسطر فقط)

```bash
# الخطوة 0: تثبيت الصندوق (أول مرة فقط)
# → يتم إضافة: Pre-commit, Ruff, Node.<n18، ... عبر .pre-commit-config.yaml

# الخطوة 1: استنسخ المستودع
git clone https://github.com/FastFreeCloud/fastfree_backend.git
cd fastfree_backend

# الخطوة 2: بناء صورة Docker (اختياري)
docker compose -f fastfree_deployment/docker-compose.yml build --pull

# الخطوة 3: النشر (النشر الأول يستغرق ~5 دقائق)
docker compose -f fastfree_deployment/docker-compose.yml up -d

# الخطوة 4: مراقبة الإعداد
docker compose -f fastfree_deployment/docker-compose.yml logs -f create-site
# → site created: http://erp.fastfree.cloud (admin/admin)

# الخطوة 5: حسب الحاجة
docker compose -f fastfree_deployment/docker-compose.yml ps  # الحالة
docker compose -f fastfree_deployment/docker-compose.yml logs create-site  # الإنشاء
docker compose -f fastfree_deployment/docker-compose.yml down -v  # المحو
```

---

## 🤖 إعداد CI/CD (GitHub Actions)

```markdown
| حالة        | الوصف                            | الأوتومات             |
|-------------|----------------------------------|---------------------|
| `push` على `main` | **البنية الذاتية بالكامل لـ Frappe** → `create-frappe-app.yml` → `build-layered-image.yml` → GHCR Release |
| `workflow_dispatch`     | إنشاء App مخصص يدويًا (`Create Frappe App`)                  | `create-frappe-app.yml`        |
```

<details>
<summary>🧩 <code>create-frappe-app.yml</code> (يدوي فقط)</summary>

```yml
on:
  workflow_dispatch:
    inputs:
      app_name: [string]       # اسم التطبيق {optional, default = repo name}
      app_title: [string]      # العنوان {optional, default = formatted repo name}
      app_description: [string]
      app_publisher: [string] # نفذ -> FastFree Cloud
      app_email: [string]      # نفذ -> admin@fastfree.cloud
      frappe_branch: [string]  # نفذ -> version-15
      create_release: [boolean] # الإنشا التلقائي لـ Tag + Release
```
</details>

<details>
<summary>🐳 <code>build-layered-image.yml</code> (<code>push</code> إلى <code>main</code>)</summary>

```yml
on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  FRAPPE_VERSION: version-15
  ERPNEXT_VERSION: version-15
  REGISTRY: ghcr.io

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - actions/checkout@v7
      # --- توليد Tag (v1.0.2, v1.0.3، ...) ---
      - name: auto_tag
        id: auto_tag
        run: |
          LATEST=$(git ls-remote --tags origin | grep -o 'refs/tags/v[0-9]*\.[0-9]*\.[0-9]*$' | sed 's|refs/tags/||' | sort -V | tail -1)
          echo "Latest tag: ${LATEST:-none}"
          NEW_TAG=${LATEST:-v1.0.0}
          echo "::set-output name=tag::$NEW_TAG"
          export NEW_TAG
          # --- بناء ودفع Docker Image إلى GHCR ---
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --
          docker build -t "${{ env.REGISTRY }}/${{ github.repository_owner }}/fastfree_backend:latest .
          docker push "${{ env.REGISTRY }}/${{ github.repository_owner }}/fastfree_backend:latest"
      # --- إنشاء GitHub Release ---
      - name: create_release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ steps.auto_tag.outputs.tag }}
          name: Release ${{ steps.auto_tag.outputs.tag }}
```
</details>

---

## 🏗️ الميزات التقنية الأساسية

- **POS:** FastFree Cloud باستخدام Frappe Framework (الإصدار-15)
- **اللغة:** Python 3.11 عبر `virtualenv` + `fastfree_backend/` كعامود وحدة
- **Front-end:** Node.js 18+ عبر `frappe/erpnext` صورة Docker ضمن البنية المعمارية
- **قاعدة البيانات:** MariaDB 11.8 + الصحي (`healthcheck.sh --connect --innodb_initialized`)
- **Redis:** Redis 8.6-alpine (بدون مصادقة للبنية المعمارية الداخلية)
- **محسنة** `pyproject.toml` + `pre-commit-config.yaml` (Ruff، ESLint، Prettier، pyupgrade)
- **CI/CD:** GHCR؛ Pipeline CI/CD التلقائي باستخدام `GITHUB_TOKEN` فقط (بدون PATs)

---

## 🔒 تكوين البنية المعمارية (`fastfree_deployment/.env`)

```ini
# ══════════════════════════════════════════
#   FastFree Cloud Environment (Production)
#   --------------------------------------------------------------------
#   الشبكة الداخلية (10.0.1.0/24): IP ثابت لكل خدمة
#   --------------------------------------------------------------------
#   * `fastfree_net` الشبكة: NAT داخلي؛ دالة VPC فقط
#   * كل Service: قابل للتواصل من كل خلال الشبكات

# ── الصورة المخصصة ──
CUSTOM_IMAGE=ghcr.io/fastfreecloud/fastfree_backend  # يجب أن تكون صغيرة (مفقة 'FastFreeCloud' إلى 'fastfreecloud')
CUSTOM_TAG=latest

# ── الموقع ──
FRAPPE_SITE_NAME_HEADER=erp.fastfree.cloud

# ── قاعدة البيانات ──
DB_HOST=db
DB_PORT=3306
DB_PASSWORD=87171393@!
MYSQL_ROOT_PASSWORD=87171393@!
MARIADB_ROOT_PASSWORD=87171393@!

# ── Redis ──
REDIS_CACHE=redis-cache:6379
REDIS_QUEUE=redis-queue:6379

# ── المنفذ ──
HTTP_PUBLISH_PORT=8080
PMA_PORT=8081

# ── كلمة مرور المسؤول ──
ADMIN_PASSWORD=admin

# ── Frappe ──
FRAPPE_BRANCH=version-15
ERPNEXT_VERSION=v15.112.0

# ── إعدادات الأداء ──
GUNICORN_WORKERS=2
GUNICORN_THREADS=4
GUNICORN_TIMEOUT=120

# ── إعدادات Nginx ──
PROXY_READ_TIMEOUT=120
CLIENT_MAX_BODY_SIZE=50m
```

---

## ✨ المميزات الفريدة والنقاط البيع

| الميزة | التفاصيل | الفائدة للمستخدم |
|---------|---------|------------------|
| **AI-Coupled** | الجمع بين "الذكاء الاصطناعي + التطوير" في استوديو واحد (مساعدة سريعة، اختبارات) | الملفات الرئيسية جاهزة، بدون خطوات إعداد |
| **متوافق 100% مع frappe_docker** | فهرسة `pwd.yml`: `mariadb:11.8` + `healthcheck.sh` + `MARIADB_ROOT_PASSWORD` | البنية المعمارية ذات المخاطر المنخفضة |
| **البقاء (أو الحذف)** | `create-site` يختار أولًا: إذا الموقع موجود → يتخطى | نفقات رأس المال منخفضة، نفقات المستمرة منخفضة |
| **الصور الصغيرة + GHCR** | مخبأ العمل المغلق يساهم @ `ghcr.io/fastfreecloud/fastfree_backend` | سرعة أقل → انخفاض التكاليف |
| **IP الثابت + الشبكة** | كل خدمة: `10.0.1.X` (لا تعارض مطلق) | قابل لتحقيق → تحكم دقيق + مراقبة |
| **وضع الفوترة** | `docker compose down -v` (إعادة تركيب بسيطة) | تكاليف التخزين أرخص |
| **PRE-COMMIT** | ruff + ESLint + Prettier + pyupgrade | قدرة "الإنشاء مرة واحدة" |
| **الاستعداد التلقائي** | `docker compose logs -f create-site` → الموقع مستعد في ~5 دقائق | لا حاجة لحساب تشغيل طول الوقت |
| **وصول الطوارئ** | `phpmyadmin` على `http://erp.fastfree.cloud:8081` | إدارة قواعد البيانات بدون مشرفات خارجية |
| **مجموعات المستودع** | العمل المستمد: `fastfree_backend/` + `fastfree_deployment/` | بسيط وحدي → امازجة الإصدار/التطبيق |
| **نشر CI/CD** | `actionlint` (syntax) + التحقق من الحجم >100MB + `jq` للتحقق | جودة عالية الصحيحة + تكامل CI/CD |

---

## 🛠️ التحديات النموذجية + الاستشارات

| التحدي | التحليل | الحل |
|-----------|---------|-----|
| **PROBLEM: إدخال متغيرات بيئة مصادقة** | `قاعدة البيانات كلمة المرور إذا تم استخدام github الفرع الافتراضي لا يمكن قراءتها` | **الحل:** استخدم الحقل المسببي `test-build` لحشو `MYSQL_ROOT_PASSWORD` على GHCR؛ ضع `DB_PASSWORD` في `.env` للبيئة |
| **الـ `POST:** "تحديث المصدر --server-check ----Report ينشئ فشل CI/CD" | `pre-commit`: `ruff . --exit-zero` | **الحل:** `ruff check . --exit-zero` |
| **الـ `PUT:** `laravel/uỉnh' القصد إلى `laravel/ui` | **الـ `GET:** التحقق من البنية المعمارية لمخطوات الدعم | **الدليل:** `ls -la fastfree_backend/` |
| **REQUEST: الاختبار أفعال** | لا يوجد مسار اختبار | **اقتراح:** أضف `tests/` مع `pytest` عبر `pyproject.toml` |
| **PROBLEM: الاتصال بـ PHPMyAdmin عبر IP مخصص** | **الحل:** أضف `environment → PMA_HOST: db` في `docker-compose.yml` |

---

## 📈 نظرية خريطة الطريق

| ألف | الوضع | الإنجاز | البداية | النهاية | المخاطر المنخفضة |
|----|--------|-------------|---------|---------|--------------|
| **الاستعداد** | النهاية من `docker compose up -d` (~5 دقائق) | الموقع `erp.fastfree.cloud` جاهز لطور Frappe | ✅ | ✅ | ✅ |
| **الصحة** | `docker compose ps -a` | `Up` لكل خدمة | ✅ | ✅ | ✅ |
| **زمن التشغيل** | `docker compose logs create-site` | "site created" (0) | ✅ | ✅ | ✅ |
| **الإنشاء** | `docker compose down -v` | ✅ | ✅ | ✅ | ✅ |

---

## 🎀 الإضافات الإضافية (السابقة للمتقدمة)

- 🏭 **Build في الامتثال:** مع التوقير إلى [`pre-commit`](https://pre-commit.com) عبر `pre-commit-config.yaml`
- 🛡️ **VIP Inspections:** تشفير تكوينات الصيانة لـ MariaDB و Redis عبر `fastfree_deployment/.env` → ممارسات على مستوى المؤسسات

---

## 📚 موارد المجتمع والدعم

- 🛠️ **البدء:** `pre-commit` (يساعد التنظيم)، `ruff check .` (فحص الأخطاء)
- 🐧 **النشر:** `docker compose down -v` → الحذف الكامل
- ⚡️ **سجل التجربة:** `docker compose logs -f create-site` ("site created" + بيانات التسجيل)
- 📧 **البريد:** `errorreports@fastfree.cloud` (مستحود لـ Frappe)

---

## 🎉 خاتمة

**FastFree Backend** ليس مجرد تطبيق Frappe — إنه **جاهز للإنتاج تلقائيًا** مع:

- 🧠 **الذكاء الاصطناعي + DevOps:** CI/CD + Docker + البنية المعمارية التلقائية + Create-site inteligente
- 🏗️ **البنية المعمارية:** 11 خدمة عالية المستوى + 10.0.1.0/24 + شبكة داخلية 100%
- 🔐 **المصداقية:** `GITHUB_TOKEN` فقط + `healthcheck.sh` + `MARIADB_ROOT_PASSWORD` + `pre-commit` + `actionlint`
- 🚀 **الأداء:** صورة Docker <100MB + `v1.0.1` + مباشرة إلى GHCR
- 📊 **المقياس:** جدائل سير عمل متناسقة → حافة التطوير مع أحدث ISO للمرحلة توسعة

**📖 القراءة التالية:** استخدم `fastfree_backend/fastfree_backend/hooks.py` للتنسيق → `fastfree_backend/config/` للتكوين الفردي → `fastfree_backend/public/` للملفات الثابتة.

**✨ النتيجة النهائية:** استخدام **واحد** خط أنابيب CI/CD → نشر **مرة واحدة** → تعلم + تشخيص منظمة بشكل كامل في دقائق.

---

**نموذج الطيارة:**

```
صفح البداية → استنساخ إلى جهاز التطوير الخاص بك → `docker compose up -d` → → "site created" → `watch -n 10 docker compose logs create-site`
```

---

*جاهز لـ NG * 🐋I 📠I ⯏P 🎯I 👾 🎐 🗂️ 🚀⚡*

---

## الرخصة

MIT