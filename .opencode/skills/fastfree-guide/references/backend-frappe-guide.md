# FastFree Backend (Frappe v15) Guide

يوثق هذا المرجع مواصفات الخادم الخلفي المبني على إطار عمل **Frappe Framework v15**، وهيكل حاويات الإنتاج وشبكتها المعزولة، وتكامل الواجهة الأمامية مع واجهات البرمجة الخلفية.

---

## 1. نظرة عامة وتقنيات الخادم الخلفي

- **الإطار**: Frappe Framework v15 (Python >= 3.10).
- **قاعدة البيانات**: MariaDB 11.8 مع محرك Barracuda وترميز UTF8MB4.
- **إدارة الطوابير والكاش**: Redis (خادمان منفصلان: `redis-cache` و `redis-queue`).
- **المعالجة بالوقت الحقيقي**: Socket.IO / Frappe Realtime Service.
- **إدارة الحزم**: Flit / Bench.
- **التشغيل والإنتاج**: Podman / Docker Compose بشبكة داخلية ثابتة العناوين.

---

## 2. بنية حاويات الإنتاج والشبكة الداخلية (`10.0.1.0/24`)

تعتمد بيئة النشر لخادم Frappe في FastFree على شبكة داخلية معزولة تماماً (`10.0.1.0/24`) ذات عناوين IP ثابتة لكل خدمة لتجنب مشاكل دقة أسماء النطاقات والـ DNS:

| عنوان الـ IP | اسم الخدمة | الوصف والدور |
|---|---|---|
| `10.0.1.10` | `configurator` | تهيئة إعدادات الموقع ومفاتيح الربط |
| `10.0.1.11` | `create-site` | سكريبت التشغيل الأولي وإنشاء موقع `erp.fastfree.cloud` |
| `10.0.1.20` | `backend` | خادم تطبيق Frappe Gunicorn (WSGI) |
| `10.0.1.30` | `frontend` | خادم الويب العكسي Caddy / Nginx للأصول الثابتة |
| `10.0.1.31` | `websocket` | خادم Socket.IO للتحديثات اللحظية |
| `10.0.1.40` | `queue-short` | طابور المهام السريعة والقصيرة عبر Redis Worker |
| `10.0.1.41` | `queue-long` | طابور المهام الثقيلة والمجدولة (Reports / Sync) |
| `10.0.1.42` | `scheduler` | خادم الجدولة Cron الداخلي لـ Frappe |
| `10.0.1.50` | `db` | خادم قاعدة البيانات MariaDB 11.8 |
| `10.0.1.60` | `redis-cache` | كاش الذاكرة اللحظي لتسريع الاستعلامات |
| `10.0.1.61` | `redis-queue` | وسيط طوابير الرسائل |
| `10.0.1.70` | `dbgate` | واجهة إدارة قاعدة البيانات (MariaDB + Redis) |

---

## 3. تكامل الحزم الأمامية مع الخادم (`fastfree-auth`)

تتواصل كافة حزم الواجهة الأمامية (`fastfree_accounting`, `fastfree_inventory`, etc.) مع Frappe حصرياً عبر طبقة الخدمات في `fastfree-auth`:

```typescript
import { apiService } from 'fastfree-auth'

// 1. جلب قائمة مستندات مع فلاتر وحقول محددة
const customers = await apiService.getDocList<Customer>('Customer', {
  fields: ['name', 'customer_name', 'customer_group'],
  filters: { disabled: 0 },
  limit: 50,
})

// 2. إنشاء مستند جديد
const newOrder = await apiService.createDoc<SalesOrder>('Sales Order', orderData)

// 3. تحديث مستند
await apiService.updateDoc<SalesOrder>('Sales Order', orderName, updatedFields)

// 4. استدعاء دوال بايثون المخصصة المعتمدة بـ @frappe.whitelist
const report = await apiService.callPost('fastfree_backend.api.reports.get_financial_summary', {
  fiscal_year: '2026',
})
```

---

## 4. إرشادات وقواعد التطوير مع Frappe

1. **فحص الصلاحيات الإلزامي**:
   قبل تنفيذ أي عملية حذف أو تعديل أو اعتماد، يتم استدعاء `permission.service`:
   ```typescript
   if (!permissionService.can('write', 'Sales Invoice')) {
     notifyError('ليس لديك صلاحية تعديل فاتورة المبيعات')
     return
   }
   ```
2. **المستندات المعتمدة (Submitted Documents)**:
   المستندات المحاسبية والقانونية التي تم ترحيلها (`docstatus === 1`) لا يمكن حذفها؛ يجب استخدام إجراء الإلغاء (`Cancel`) متبوعاً بالتعديل (`Amend`).
3. **الفلاتر ككائنات فقط**:
   يجب تمرير الفلاتر في استعلامات Frappe كـ `Record<string, unknown>` وليس كمصفوفات arrays.
