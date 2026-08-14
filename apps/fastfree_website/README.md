<div dir="rtl">

# FastFree — منصة إدارة الأعمال المتكاملة

</div>

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss)
![Docker](https://img.shields.io/badge/Docker-24-2496ED?style=for-the-badge&logo=docker)

**منصة إدارة أعمال متكاملة للمطورين وشركات البرمجيات**

[![Deploy](https://img.shields.io/badge/Deploy-Portainer-green?style=for-the-badge)](https://fastfree.cloud)
[![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)](#)
[![Version](https://img.shields.io/badge/Version-1.0.22-blue?style=for-the-badge)](#)

</div>

---

## المميزات الرئيسية

### الموقع العام
- تصميم داكن احترافي مع تأثيرات Glassmorphism
- دعم اللغتين العربية والإنجليزية بالكامل (RTL)
- وضع ليلي/نهاري مع حفظ التفضيلات
- متجاوب مع جميع الأجهزة (Mobile-First)
- تحسين SEO مع إعدادات OG Meta و Twitter Cards
- أداء عالي مع Next.js 15 App Router

### لوحة التحكم (Dashboard)
- تصميم داكن موحد عبر جميع الشاشات (13 شاشة)
- Sidebar متجاوب — Desktop: قابل للطي، Mobile: Drawer
- إحصائيات حية — عدد العملاء، الأخطاء، الترجمات
- رسم بياني لحالة العملاء الأسبوعية

### الأقسام (13 شاشة)

| القسم | الوصف |
|-------|-------|
| **لوحة التحكم** | نظرة عامة على الإحصائيات والنشاط |
| **إدارة العملاء (CRM)** | تتبع العملاء المحتملين وحالاتهم |
| **الخدمات** | إضافة وتعديل خدمات الشركة مع features_ar/en |
| **سابقة الأعمال** | معرض المشاريع مع الصور والتقنيات |
| **المدونة** | كتابة ونشر المقالات مع التصنيفات |
| **الرسائل الواردة** | إدارة رسائل التواصل |
| **التوظيف** | نشر الوظائف ومراجعة الطلبات |
| **الآراء** | إدارة شهادات العملاء والتقييمات |
| **العدادات** | تعديل الإحصائيات المعروضة |
| **الترجمات** | إدارة ترجمات الموقع |
| **سجل الأخطاء** | مراقبة الأخطاء مع فلترة وتصدير |
| **الإعدادات** | تخصيص معلومات الموقع |
| **الذكاء الاصطناعي** | إعدادات Gemini AI |

---

## البنية التقنية

### Tech Stack

```
├── Frontend
│   ├── Next.js 15 (App Router)
│   ├── React 19
│   ├── TypeScript 5 (Strict Mode)
│   ├── Tailwind CSS 3
│   └── Lucide Icons (Named Imports)
│
├── Backend
│   ├── Next.js API Routes (18+ endpoints)
│   ├── Prisma ORM 5
│   ├── MySQL 8
│   └── JWT Auth (jose)
│
├── Performance
│   ├── next/font (Self-hosted Google Fonts)
│   ├── optimizePackageImports
│   ├── Cache Headers (Immutable + ISR)
│   ├── AVIF/WebP Image Formats
│   └── Dynamic Imports (ReactMarkdown, Framer Motion)
│
├── Infrastructure
│   ├── Docker & Docker Compose
│   ├── Caddy Reverse Proxy (Auto SSL)
│   ├── GitHub Actions CI/CD
│   └── Portainer Stack
│
└── AI Integration
    └── Google Gemini API
```

### Docker Services

| Service | Container | Port | IP |
|---------|-----------|------|-----|
| **Next.js App** | `fastfree_web` | 3000 | `10.0.0.12` |
| **MySQL** | `fastfree_db` | 3306 | `10.0.0.10` |
| **phpMyAdmin** | `fastfree_phpmyadmin` | 8080 | `10.0.0.11` |
| **Caddy Proxy** | `fastfree_proxy` | 80/443 | `10.0.0.13` |

---

## الأداء والتحسينات (Performance)

### next.config.ts

```typescript
experimental: {
  // تحسين barrel imports — يوفر ~89KB
  optimizePackageImports: ['lucide-react', 'react-icons', 'date-fns'],
  
  // Client Router Cache
  staleTimes: { static: 180, dynamic: 30 },
},

// إخراج المكتبات الثقيلة من client bundle
serverExternalPackages: ['@google/genai', 'bcrypt', 'prisma'],

// Cache Headers
headers: [
  { source: '/(assets)', Cache-Control: 'public, max-age=1year, immutable' },
  { source: '/api/public/*', Cache-Control: 'public, s-maxage=60, stale-while-revalidate=300' },
],

// صور AVIF + WebP + 30 يوم cache
images: { formats: ['image/avif', 'image/webp'], minimumCacheTTL: 2592000 },
```

### التحسينات المنفذة

| التحسين | التأثير |
|---------|---------|
| **next/font** (El_Messiri + Tajawal) | حذف 2 blocking requests من Google Fonts |
| **optimizePackageImports** | تقليل bundle ~89KB من lucide-react |
| **serverExternalPackages** | حذف @google/genai من client bundle |
| **Cache Headers** | ملفات ثابتة cached 1 سنة، API cached 60 ثانية |
| **staleTimes** | صفحات ثابتة 3 دقائق، ديناميكية 30 ثانية |
| **Image formats** | AVIF + WebP بدلاً من PNG/JPG |
| **Named imports** | حذف barrel imports في 13 ملف |
| **sizes props** | صور responsive محسّنة |
| **priority** | LCP image loaded instantly |
| **loading/error/404** | تجربة مستخدم أفضل |
| **unoptimized removed** | تفعيل تحسين الصور التلقائي |

---

## الوصول

### الروابط

| الخدمة | الرابط |
|--------|--------|
| **الموقع العام** | [https://fastfree.cloud](https://fastfree.cloud) |
| **لوحة التحكم** | [https://fastfree.cloud/login](https://fastfree.cloud/login) |
| **phpMyAdmin** | [https://db.fastfree.cloud](https://db.fastfree.cloud) |

### بيانات الدخول

| الحساب | البريد الإلكتروني | كلمة المرور |
|--------|------------------|-------------|
| **Admin** | `admin@fastfree.cloud` | `FastFree@Admin2026!` |
| **phpMyAdmin** | `root` | `FastFree@Secure2026!` |

### اختصار مخفي للدخول
- اضغط `Ctrl + Shift + A` للذهاب لصفحة تسجيل الدخول

---

## بنية قاعدة البيانات (Prisma Schema)

### النماذج (18 Model)

```
├── AdminUser          → المستخدمون والمشرفون
├── Lead               → العملاء المحتملون (CRM)
├── Service            → خدمات الشركة (features_ar/en)
├── Product            → المنتجات والبرامج
├── BlogPost           → مقالات المدونة
├── Comment            → تعليقات المقالات
├── ContactMessage     → رسائل التواصل
├── JobPosting         → الوظائف الشاغرة
├── JobApplication     → طلبات التوظيف
├── Testimonial        → شهادات العملاء
├── Counter            → عدادات الإحصائيات
├── Translation        → الترجمات
├── ErrorLog           → سجل الأخطاء
├── SiteSetting        → إعدادات الموقع + AI (Singleton)
├── Tag                → الوسوم
├── ProductTag         → وسوم المنتجات
├── PostTag            → وسوم المقالات
└── SEOMeta            → بيانات SEO
```

### Enums

```
├── Role             → USER | ADMIN | SUPER_ADMIN
├── ProductType      → PROGRAM | APP | WEBSITE
├── BlogCategory     → TECHNOLOGY | TUTORIALS | ...
├── MessageStatus    → UNREAD | READ | REPLIED | ARCHIVED
├── JobType          → FULL_TIME | PART_TIME | FREELANCE | INTERNSHIP
├── ApplicationStatus → PENDING | REVIEWED | ACCEPTED | REJECTED
└── TagType          → PROGRAM | APP | WEBSITE | POST
```

### ملاحظات مهمة
- `SiteSetting` يحتوي على AI fields: `aiGeminiKey`, `aiModel`, `aiSystemPrompt`
- `Service` يحتوي على `features_ar` و `features_en` كـ `@db.Text`
- لا يوجد جدول `SiteSettings` منفصل (تم دمجه في `SiteSetting`)

---

## الإعداد المحلي

### المتطلبات
- Node.js 22+
- MySQL 8+
- npm أو yarn

### خطوات التثبيت

```bash
# 1. استخراج المشروع
git clone https://github.com/fastfreecloud/fastfree_website.git
cd fastfree_website

# 2. تثبيت التبعيات
npm install

# 3. إنشاء ملف .env
cp .env.example .env
# عدّل DATABASE_URL حسب إعداداتك

# 4. إعداد قاعدة البيانات
npx prisma generate
npx prisma db push
npx prisma db seed

# 5. تشغيل المشروع
npm run dev
```

### متغيرات البيئة (.env)

```env
DATABASE_URL="mysql://root:password@localhost:3306/fastfree"
JWT_SECRET="your-secret-key"
APP_URL="http://localhost:3000"
```

---

## أوامر مهمة

```bash
# تشغيل التطوير
npm run dev

# بناء المشروع
npm run build

# تشغيل الإنتاج
npm start

# فحص الأخطاء (Prisma + TypeScript + ESLint)
npm run diagnose

# Prisma
npx prisma generate
npx prisma db push
npx prisma db seed
npx prisma studio

# تحليل Bundle Size
ANALYZE=true npm run build
```

---

## بنية API

### Public Endpoints
| Endpoint | Method | الوصف |
|----------|--------|-------|
| `/api/public/settings` | GET | إعدادات الموقع |
| `/api/public/services` | GET | الخدمات |
| `/api/public/products` | GET | المنتجات |
| `/api/public/blog` | GET | المقالات |
| `/api/public/testimonials` | GET | الآراء |
| `/api/public/tags` | GET | الوسوم |
| `/api/public/seo` | GET | بيانات SEO |
| `/api/public/contact` | POST | إرسال رسالة |
| `/api/public/views` | POST | تسجيل مشاهدة |

### Admin Endpoints
| Endpoint | Method | الوصف |
|----------|--------|-------|
| `/api/admin/products` | CRUD | إدارة المنتجات |
| `/api/admin/services` | CRUD | إدارة الخدمات |
| `/api/admin/blog` | CRUD | إدارة المدونة |
| `/api/admin/messages` | CRUD | إدارة الرسائل |
| `/api/admin/testimonials` | CRUD | إدارة الآراء |
| `/api/admin/counters` | CRUD | إدارة العدادات |
| `/api/admin/tags` | CRUD | إدارة الوسوم |
| `/api/admin/seo` | CRUD | إدارة SEO |
| `/api/errors` | CRUD | سجل الأخطاء |
| `/api/translations` | CRUD | إدارة الترجمات |
| `/api/crm` | CRUD | إدارة العملاء |
| `/api/settings` | GET/POST | إعدادات الموقع |
| `/api/dashboard/stats` | GET | إحصائيات Dashboard |
| `/api/ai/chat` | POST | محادثة Gemini AI |
| `/api/ai/settings` | GET/POST | إعدادات AI |
| `/api/auth/login` | POST | تسجيل الدخول |

---

## CI/CD Pipeline

```mermaid
graph LR
    A[Developer Push] --> B[GitHub Actions]
    B --> C[Build Docker Image]
    C --> D[Push to GHCR]
    D --> E[Portainer Webhook]
    E --> F[Pull & Deploy]
```

### النشر على السيرفر

```bash
# تنظيف قديم (إن لزم)
docker rm -f fastfree_db fastfree_phpmyadmin fastfree_web fastfree_proxy
docker network rm fastfree_network

# نشر جديد عبر Portainer
docker compose up -d
```

---

## DNS Records

| Type | Name | Value |
|------|------|-------|
| A | `@` | Server IP |
| A | `www` | Server IP |
| A | `db` | Server IP |

---

## الملفات المهمة

```
├── app/
│   ├── layout.tsx          → Root layout (next/font, ThemeProvider, LanguageProvider)
│   ├── page.tsx            → Homepage
│   ├── loading.tsx         → Root loading skeleton
│   ├── error.tsx           → Root error boundary
│   ├── not-found.tsx       → Custom 404 page
│   ├── globals.css         → Design system + light/dark themes
│   ├── about/page.tsx      → About page
│   ├── contact/page.tsx    → Contact page
│   ├── services/page.tsx   → Services listing
│   ├── products/page.tsx   → Products listing
│   ├── blog/page.tsx       → Blog listing
│   ├── erp/page.tsx        → ERP/CRM showcase
│   ├── login/page.tsx      → Admin login
│   └── dashboard/
│       ├── layout.tsx      → Dashboard layout with Sidebar
│       ├── page.tsx        → Dashboard main (stats)
│       ├── crm/page.tsx    → CRM leads management
│       ├── services/page.tsx → Services CRUD
│       ├── products/page.tsx → Products CRUD
│       ├── blog/page.tsx   → Blog CRUD
│       ├── messages/page.tsx → Messages management
│       ├── testimonials/page.tsx → Testimonials CRUD
│       ├── counters/page.tsx → Counters CRUD
│       ├── translations/page.tsx → Translations CRUD
│       ├── errors/page.tsx → Error logs
│       ├── settings/page.tsx → Site settings
│       ├── ai/page.tsx     → AI settings
│       ├── seo/page.tsx    → SEO management
│       └── tags/page.tsx   → Tags CRUD
├── components/
│   ├── SharedNavbar.tsx     → Shared navbar with theme toggle
│   ├── SharedFooter.tsx     → Shared compact footer
│   ├── AdminShortcut.tsx    → Ctrl+Shift+A keyboard shortcut
│   ├── LanguageSwitcher.tsx → AR/EN language toggle
│   └── dashboard/
│       └── Sidebar.tsx      → Responsive sidebar
├── lib/
│   ├── prisma.ts           → Prisma client singleton
│   ├── auth.ts             → JWT authentication
│   ├── error-logger.ts     → Error logging utility
│   ├── theme-provider.tsx  → Dark/light theme context
│   └── language-provider.tsx → AR/EN language context
├── prisma/
│   ├── schema.prisma       → Database schema (18 models)
│   └── seed.ts             → Seed data
├── scripts/
│   └── diagnose.js         → Prisma + TypeScript + ESLint checks
├── next.config.ts          → Next.js config (performance optimized)
├── tailwind.config.ts      → Tailwind config
└── tsconfig.json           → TypeScript strict config
```

---

## البريد الإلكتروني

- **الموقع**: [fastfree.cloud](https://fastfree.cloud)
- **البريد**: [contact@fastfree.cloud](mailto:contact@fastfree.cloud)
- **الهاتف**: [+201091999937](https://wa.me/201091999937)

---

## الترخيص

هذا المشروع خاص ومتاح فقط للمستخدمين المصرح لهم.

---

<div align="center">

**Built with ❤️ by FastFree Team**

[![GitHub](https://img.shields.io/badge/GitHub-FastFree-181717?style=for-the-badge&logo=github)](https://github.com/fastfreecloud)

</div>
