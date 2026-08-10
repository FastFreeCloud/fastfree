# AGENTS.md — FastFree CRM

## ملاحظات سريعة

```bash
# TypeCheck — صفر أخطاء
cd apps/fastfree_ledger && npx vue-tsc --noEmit

# Lint Check — صفر violations
cd apps/fastfree_ledger && npm run lint:check

# Lint + Auto Fix
cd apps/fastfree_ledger && npm run lint

# Dev Server
cd apps/fastfree_ledger && npm run dev
```

## وصف الحزمة

حزمة إدارة علاقات العملاء (CRM) في نظام FastFree. تدير العملاء المحتميين (Leads)، الفرص البيعية (Opportunities)، جهات الاتصال (Contacts)، الحملات التسويقية (Campaigns)، مصادر العملاء (Lead Sources)، والعناوين (Addresses). تتضمن لوحة معلومات CRM مع إحصائيات وتحاليل الأداء.

- **الاسم:** `fastfree-crm`
- **الإصدار:** `0.0.1`
- **النوع:** `module`
- **النقطة الرئيسية:** `src/index.ts`
- **الشاشة:** 7 شاشات
- **الخدمات:** 8 خدمات
- **الترجمة:** 227 مفتاح (EN + AR)
- **vue-tsc:** 0 errors
- **lint:check:** 0 violations

## هيكل الملفات

```
packages/fastfree_crm/
├── package.json
├── tsconfig.json
├── AGENTS.md
└── src/
    ├── index.ts                          # Main entry — public API exports
    ├── init.ts                           # Boot registration (lowcode registry)
    ├── screens.ts                        # Screen registration (defineAsyncComponent)
    ├── locales/
    │   ├── en.ts                         # English translations (227 keys)
    │   └── ar.ts                         # Arabic translations (227 keys)
    ├── types/
    │   └── index.ts                      # All TypeScript types/interfaces
    ├── stores/
    │   └── useCrmStore.ts                # Pinia store (leads, opportunities, contacts, campaigns, summary)
    ├── screens/
    │   ├── LeadList.vue                  # Leads table + search + delete confirm
    │   ├── LeadForm.vue                  # Add/Edit lead dialog + validation
    │   ├── OpportunityList.vue           # Opportunities table + search + delete confirm
    │   ├── OpportunityForm.vue           # Add/Edit opportunity dialog + validation
    │   ├── ContactList.vue               # Contacts table + search + delete confirm
    │   ├── ContactForm.vue               # Add/Edit contact dialog + validation
    │   └── CrmDashboard.vue              # Dashboard — stats + lead pipeline
    └── services/
        ├── index.ts                      # Barrel export for all services
        ├── lead.service.ts               # Lead CRUD + convert/submit/cancel
        ├── opportunity.service.ts        # Opportunity CRUD + submit/cancel
        ├── contact.service.ts            # Contact CRUD
        ├── address.service.ts            # Address CRUD
        ├── campaign.service.ts           # Campaign CRUD + submit/cancel
        ├── leadSource.service.ts         # Lead Source CRUD
        ├── crmDashboard.service.ts       # Dashboard API (pipeline, ROI, performance)
        └── report.service.ts             # Reports (lead, opportunity, campaign)
```

**إجمالي الملفات:** 20 ملف مصدر (8 .ts + 7 .vue + 2 locales + 2 config + 1 barrel)

## الأنواع (Types)

### LeadStatus
```typescript
type LeadStatus = "New" | "Contacted" | "Qualified" | "Unqualified" | "Interested" | "Not Interested" | "Lost" | "Converted";
```

### LeadType
```typescript
type LeadType = "Company" | "Individual" | "Partnership";
```

### LeadSource
```typescript
type LeadSource = "Cold Call" | "Email Campaign" | "Web Search" | "Referral" | "Social Media" | "Web Form" | "Walk In";
```

### Lead
```typescript
interface Lead {
  name: string;
  lead_name: string;
  lead_status: LeadStatus;
  lead_source: LeadSource;
  lead_type: LeadType;
  company_name?: string;
  lead_owner?: string;
  email_id?: string;
  phone?: string;
  mobile_no?: string;
  gender?: string;
  opportunity_from?: string;
  customer?: string;
  address?: string;
  website?: string;
  industry?: string;
  territory?: string;
  source?: string;
  request_type?: string;
  description?: string;
  posting_date?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}
```

### OpportunityStatus
```typescript
type OpportunityStatus = "Open" | "Quotation" | "Ordered" | "Lost" | "Won" | "Replied";
```

### OpportunityStage
```typescript
type OpportunityStage = "Prospecting" | "Qualification" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";
```

### Opportunity
```typescript
interface Opportunity {
  name: string;
  status: OpportunityStatus;
  lead?: string;
  customer?: string;
  opportunity_from?: string;
  company?: string;
  posting_date?: string;
  opportunity_amount?: number;
  probability?: number;
  stage?: OpportunityStage;
  expected_closing_date?: string;
  lead_source?: LeadSource;
  currency?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}
```

### ContactType
```typescript
type ContactType = "Individual" | "Company";
```

### Contact
```typescript
interface Contact {
  name: string;
  first_name?: string;
  last_name?: string;
  email_id?: string;
  phone?: string;
  mobile_no?: string;
  company_name?: string;
  gender?: string;
  address?: string;
  department?: string;
  designation?: string;
  salutation?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}
```

### Address
```typescript
interface Address {
  name: string;
  address_title?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phone?: string;
  email_id?: string;
  address_type?: string;
  latitude?: number;
  longitude?: number;
  creation?: string;
  modified?: string;
  owner?: string;
}
```

### CampaignType
```typescript
type CampaignType = "Email" | "Google Adwords" | "Social Media" | "Direct Mail" | "Referral" | "Other";
```

### CampaignStatus
```typescript
type CampaignStatus = "Planned" | "Active" | "Completed" | "Cancelled" | "Draft";
```

### Campaign
```typescript
interface Campaign {
  name: string;
  campaign_name?: string;
  campaign_type?: CampaignType;
  status?: CampaignStatus;
  budget_cost?: number;
  actual_cost?: number;
  started_date?: string;
  ended_date?: string;
  description?: string;
  company?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}
```

### LeadSourceParams
```typescript
type LeadSourceParams = {
  from_date?: string;
  to_date?: string;
};
```

### CrmSummary
```typescript
interface CrmSummary {
  total_leads: number;
  total_opportunities: number;
  total_contacts: number;
  total_campaigns: number;
  leads_by_status: Record<string, number>;
  opportunities_by_stage: Record<string, number>;
  total_opportunity_value: number;
  won_opportunity_value: number;
  conversion_rate: number;
}
```

### ApiResponse
```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

## الخدمات (Services)

### lead.service.ts
| الدالة | المعاملات | نوع الإرجاع | الوصف |
|--------|-----------|-------------|-------|
| `getLeads()` | — | `ApiResponse<Lead[]>` | جلب جميع العملاء المحتميين |
| `getLead(id)` | `string` | `ApiResponse<Lead>` | جلب عميل محتمي واحد |
| `createLead(data)` | `Partial<Lead>` | `ApiResponse<Lead>` | إنشاء عميل محتمي جديد |
| `updateLead(id, data)` | `string, Partial<Lead>` | `ApiResponse<Lead>` | تعديل عميل محتمي |
| `deleteLead(id)` | `string` | `ApiResponse<void>` | حذف عميل محتمي |
| `convertLeadToOpportunity(leadId, data)` | `string, Partial<Lead>` | `ApiResponse<Opportunity>` | تحويل عميل محتمي إلى فرصة |
| `submitLead(name)` | `string` | `ApiResponse<void>` | ترحيل العميل المحتمي |
| `cancelLead(name)` | `string` | `ApiResponse<void>` | إلغاء العميل المحتمي |

**DocType:** `Lead` | **API:** `getDocList`, `getDoc`, `createDoc`, `updateDoc`, `deleteDoc`, `callPost`

### opportunity.service.ts
| الدالة | المعاملات | نوع الإرجاع | الوصف |
|--------|-----------|-------------|-------|
| `getOpportunities()` | — | `ApiResponse<Opportunity[]>` | جلب جميع الفرص |
| `getOpportunity(id)` | `string` | `ApiResponse<Opportunity>` | جلب فرصة واحدة |
| `createOpportunity(data)` | `Partial<Opportunity>` | `ApiResponse<Opportunity>` | إنشاء فرصة جديدة |
| `updateOpportunity(id, data)` | `string, Partial<Opportunity>` | `ApiResponse<Opportunity>` | تعديل فرصة |
| `deleteOpportunity(id)` | `string` | `ApiResponse<void>` | حذف فرصة |
| `submitOpportunity(name)` | `string` | `ApiResponse<void>` | ترحيل الفرصة |
| `cancelOpportunity(name)` | `string` | `ApiResponse<void>` | إلغاء الفرصة |

**DocType:** `Opportunity` | **API:** `getDocList`, `getDoc`, `createDoc`, `updateDoc`, `deleteDoc`, `callPost`

### contact.service.ts
| الدالة | المعاملات | نوع الإرجاع | الوصف |
|--------|-----------|-------------|-------|
| `getContacts()` | — | `ApiResponse<Contact[]>` | جلب جميع جهات الاتصال |
| `getContact(id)` | `string` | `ApiResponse<Contact>` | جلب جهة اتصال واحدة |
| `createContact(data)` | `Partial<Contact>` | `ApiResponse<Contact>` | إنشاء جهة اتصال جديدة |
| `updateContact(id, data)` | `string, Partial<Contact>` | `ApiResponse<Contact>` | تعديل جهة اتصال |
| `deleteContact(id)` | `string` | `ApiResponse<void>` | حذف جهة اتصال |

**DocType:** `Contact` | **API:** `getDocList`, `getDoc`, `createDoc`, `updateDoc`, `deleteDoc`

### address.service.ts
| الدالة | المعاملات | نوع الإرجاع | الوصف |
|--------|-----------|-------------|-------|
| `getAddresses()` | — | `ApiResponse<Address[]>` | جلب جميع العناوين |
| `getAddress(id)` | `string` | `ApiResponse<Address>` | جلب عنوان واحد |
| `createAddress(data)` | `Partial<Address>` | `ApiResponse<Address>` | إنشاء عنوان جديد |
| `updateAddress(id, data)` | `string, Partial<Address>` | `ApiResponse<Address>` | تعديل عنوان |
| `deleteAddress(id)` | `string` | `ApiResponse<void>` | حذف عنوان |

**DocType:** `Address` | **API:** `getDocList`, `getDoc`, `createDoc`, `updateDoc`, `deleteDoc`

### campaign.service.ts
| الدالة | المعاملات | نوع الإرجاع | الوصف |
|--------|-----------|-------------|-------|
| `getCampaigns()` | — | `ApiResponse<Campaign[]>` | جلب جميع الحملات |
| `getCampaign(id)` | `string` | `ApiResponse<Campaign>` | جلب حملة واحدة |
| `createCampaign(data)` | `Partial<Campaign>` | `ApiResponse<Campaign>` | إنشاء حملة جديدة |
| `updateCampaign(id, data)` | `string, Partial<Campaign>` | `ApiResponse<Campaign>` | تعديل حملة |
| `deleteCampaign(id)` | `string` | `ApiResponse<void>` | حذف حملة |
| `submitCampaign(name)` | `string` | `ApiResponse<void>` | ترحيل الحملة |
| `cancelCampaign(name)` | `string` | `ApiResponse<void>` | إلغاء الحملة |

**DocType:** `Campaign` | **API:** `getDocList`, `getDoc`, `createDoc`, `updateDoc`, `deleteDoc`, `callPost`

### leadSource.service.ts
| الدالة | المعاملات | نوع الإرجاع | الوصف |
|--------|-----------|-------------|-------|
| `getLeadSources()` | — | `ApiResponse<LeadSourceDoc[]>` | جلب جميع مصادر العملاء |
| `getLeadSource(id)` | `string` | `ApiResponse<LeadSourceDoc>` | جلب مصدر واحد |
| `createLeadSource(data)` | `Partial<LeadSourceDoc>` | `ApiResponse<LeadSourceDoc>` | إنشاء مصدر جديد |
| `updateLeadSource(id, data)` | `string, Partial<LeadSourceDoc>` | `ApiResponse<LeadSourceDoc>` | تعديل مصدر |
| `deleteLeadSource(id)` | `string` | `ApiResponse<void>` | حذف مصدر |

**DocType:** `Lead Source` | **API:** `getDocList`, `getDoc`, `createDoc`, `updateDoc`, `deleteDoc`

> **ملاحظة:** `LeadSourceDoc` نوع محلي في الخدمة: `{ name: string; source_name?: string; creation?: string; modified?: string; owner?: string; }`

### crmDashboard.service.ts
| الدالة | المعاملات | نوع الإرجاع | الوصف |
|--------|-----------|-------------|-------|
| `getLeadPipeline(params?)` | `Record<string, unknown>?` | `ApiResponse<Record<string, number>>` | أنابيب العملاء المحتميين |
| `getOpportunityPipeline(params?)` | `Record<string, unknown>?` | `ApiResponse<Record<string, number>>` | أنابيب الفرص |
| `getLeadsBySource(params?)` | `Record<string, unknown>?` | `ApiResponse<Record<string, number>>` | العملاء حسب المصدر |
| `getSalesPerformance(params?)` | `Record<string, unknown>?` | `ApiResponse<CrmSummary>` | أداء المبيعات |
| `getCampaignROI(params?)` | `Record<string, unknown>?` | `ApiResponse<Record<string, number>>` | عائد الحملات |

**API:** `callGet` — endpoints: `crm.dashboard.lead_pipeline`, `crm.dashboard.opportunity_pipeline`, `crm.dashboard.leads_by_source`, `crm.dashboard.sales_performance`, `crm.dashboard.campaign_roi`

### report.service.ts
| الدالة | المعاملات | نوع الإرجاع | الوصف |
|--------|-----------|-------------|-------|
| `getLeadReport(fromDate, toDate)` | `string, string` | `ApiResponse<Record<string, unknown>>` | تقرير العملاء المحتميين |
| `getOpportunityReport(fromDate, toDate)` | `string, string` | `ApiResponse<Record<string, unknown>>` | تقرير الفرص |
| `getCampaignReport(fromDate, toDate)` | `string, string` | `ApiResponse<Record<string, unknown>>` | تقرير الحملات |

**API:** `callGet` — endpoints: `crm.report.lead_report`, `crm.report.opportunity_report`, `crm.report.campaign_report`

## الشاشات (Screens)

### LeadList.vue
- **النوع:** شاشة قائمة (Table + Dialog)
- **المكونات الفرعية:** LeadForm (dialog), q-dialog (confirm delete)
- **البيانات:** `store.leads`
- **الأعمدة:** lead_name, company_name, lead_owner, email_id, phone, lead_status, lead_source, posting_date, actions
- **الميزات:** بحث, ترجمة status badges (translateLeadStatus), ترجمة source badges (translateLeadSource), ألوان حسب الحالة
- **الأحداث:** openAdd, editLead, deleteLead, confirmDeleteLead, onSaved
- **الأيقونات:** mdi-account-group, mdi-plus, mdi-refresh, mdi-pencil, mdi-delete, mdi-magnify

### LeadForm.vue
- **النوع:** نموذج dialog (Add/Edit)
- **المعاملات:** `modelValue: boolean`, `lead?: Lead | null`
- **الأحداث:** `update:modelValue`, `saved`
- **الحقول:** lead_name (req), company_name, lead_type (select, req), lead_source (select, req), lead_status (select, req), email_id (email validation), phone, mobile_no, gender (select), website, industry, territory, posting_date (date, req), address (textarea, req), description (textarea)
- **الخيارات المحسوبة:** leadStatusOptions (8), leadTypeOptions (3), leadSourceOptions (7), genderOptions (3)
- **الحفظ:** createLead / updateLead مع validation و error handling

### OpportunityList.vue
- **النوع:** شاشة قائمة (Table + Dialog)
- **المكونات الفرعية:** OpportunityForm (dialog), q-dialog (confirm delete)
- **البيانات:** `store.opportunities`
- **الأعمدة:** name, customer, opportunity_from, status, stage, opportunity_amount, posting_date, lead_source, actions
- **الميزات:** بحث, useStatusHelpers("crm") للترجمة والألوان, ترجمة stage badges (translateStage)
- **الأحداث:** openAdd, editOpportunity, deleteOpportunity, confirmDeleteOpportunity, onSaved
- **الأيقونات:** mdi-handshake, mdi-plus, mdi-refresh, mdi-pencil, mdi-delete, mdi-magnify

### OpportunityForm.vue
- **النوع:** نموذج dialog (Add/Edit)
- **المعاملات:** `modelValue: boolean`, `opportunity?: Opportunity | null`
- **الأحداث:** `update:modelValue`, `saved`
- **الحقول:** name (req), status (select, req), stage (select, req), lead_source (select), opportunity_amount (number), probability (number), currency, expected_closing_date (date), posting_date (date, req), opportunity_from (req), customer, company
- **الخيارات المحسوبة:** statusOptions (6), stageOptions (6), leadSourceOptions (7)
- **الحفظ:** createOpportunity / updateOpportunity مع validation و error handling

### ContactList.vue
- **النوع:** شاشة قائمة (Table + Dialog)
- **المكونات الفرعية:** ContactForm (dialog), q-dialog (confirm delete)
- **البيانات:** `store.contacts`
- **الأعمدة:** first_name, last_name, email_id, phone, company_name, designation, actions
- **الأحداث:** openAdd, editContact, deleteContact, confirmDeleteContact, onSaved
- **الأيقونات:** mdi-account-multiple, mdi-plus, mdi-refresh, mdi-pencil, mdi-delete, mdi-magnify

### ContactForm.vue
- **النوع:** نموذج dialog (Add/Edit)
- **المعاملات:** `modelValue: boolean`, `contact?: Contact | null`
- **الأحداث:** `update:modelValue`, `saved`
- **الحقول:** first_name (req), last_name, email_id (email validation), phone, mobile_no, company_name, designation, department, gender (select), address (textarea)
- **الخيارات المحسوبة:** genderOptions (3)
- **الحفظ:** createContact / updateContact مع validation و error handling

### CrmDashboard.vue
- **النوع:** لوحة معلومات
- **البيانات:** `store.leads`, `store.opportunities`, `store.contacts`, `store.summary`
- **المكونات:** 4 بطاقات إحصائية (leads, opportunities, contacts, conversionRate), جدول leadPipelineRows
- **البيانات المحسوبة:** leadPipelineRows (من store.summary.leads_by_status), conversionRate (من store.summary.conversion_rate)
- **التحميل:** `Promise.all([fetchLeads, fetchOpportunities, fetchContacts, fetchSummary])`
- **الأيقونات:** mdi-view-dashboard

## الـ Store

### useCrmStore
- **المعرّف:** `fastfree-crm`
- **المكتبة:** Pinia (defineStore + Composition API)

#### الحالة (State)
| المتغير | النوع | الوصف |
|---------|-------|-------|
| `leads` | `Ref<Lead[]>` | قائمة العملاء المحتميين |
| `opportunities` | `Ref<Opportunity[]>` | قائمة الفرص |
| `contacts` | `Ref<Contact[]>` | قائمة جهات الاتصال |
| `campaigns` | `Ref<Campaign[]>` | قائمة الحملات |
| `summary` | `Ref<CrmSummary \| null>` | ملخص CRM |
| `loading` | `Ref<boolean>` | حالة التحميل |
| `error` | `Ref<string \| null>` | رسالة الخطأ |

#### الإجراءات (Actions)
| الدالة | الوصف |
|--------|-------|
| `fetchLeads()` | جلب العملاء المحتميين وتحديث `leads` |
| `fetchOpportunities()` | جلب الفرص وتحديث `opportunities` |
| `fetchContacts()` | جلب جهات الاتصال وتحديث `contacts` |
| `fetchSummary()` | جلب ملخص CRM (salesPerformance) وتحديث `summary` |
| `$reset()` | إعادة تعيين جميع الحالة للقيم الافتراضية |

#### المساعدات (Helpers)
| الدالة | الوصف |
|--------|-------|
| `setLoading(val)` | تعيين حالة التحميل |
| `setError(e)` | تعيين رسالة الخطأ (يتعامل مع Error و unknown) |

## الترجمات

- **227 مفتاح** في كل من `CRM_MESSAGES_EN` / `CRM_MESSAGES_AR`
- **Namespace:** `crm.*`

### توزيع المفاتيح
| المجموعة | العدد | أمثلة |
|----------|-------|-------|
| Group + Groups | 2 | `crm`, `groups.crm` |
| Screens | 6 | `screens.crm-leads`, `screens.crm-dashboard` |
| Leads | 38 | `leads`, `leadName`, `convertLead`, `leadSaved` |
| Opportunities | 21 | `opportunities`, `opportunityAmount`, `stage`, `opportunitySaved` |
| Contacts | 14 | `contacts`, `firstName`, `designation`, `contactSaved` |
| Addresses | 17 | `addresses`, `addressLine1`, `city`, `pincode` |
| Campaigns | 21 | `campaigns`, `budgetCost`, `submitCampaign`, `campaignSaved` |
| Lead Sources | 8 | `leadSources`, `sourceName`, `leadSourceSaved` |
| Lead Status values | 8 | `leadStatusNew` → `leadStatusConverted` |
| Lead Type values | 3 | `leadTypeCompany`, `leadTypeIndividual`, `leadTypePartnership` |
| Lead Source values | 7 | `sourceColdCall` → `sourceWalkIn` |
| Opportunity Status values | 6 | `oppStatusOpen` → `oppStatusReplied` |
| Status keys (useStatusHelpers) | 13 | `status.open`, `status.new`, `status.converted` |
| Opportunity Stage values | 6 | `stageProspecting` → `stageClosedLost` |
| Campaign Type values | 6 | `campaignTypeEmail` → `campaignTypeOther` |
| Campaign Status values | 5 | `campaignStatusPlanned` → `campaignStatusDraft` |
| Dashboard | 16 | `crmDashboard`, `totalLeads`, `conversionRate`, `pipelineValue` |
| Reports | 7 | `leadReport`, `generateReport`, `noReportData` |
| Common | 22 | `common.add`, `common.save`, `common.error`, `common.paid` |
| Validation | 1 | `validation.fieldRequired` |

### مفاتيح Status لـ useStatusHelpers
```
status.open, status.quotation, status.ordered, status.lost, status.won, status.replied,
status.new, status.contacted, status.qualified, status.unqualified, status.interested,
status.not_interested, status.converted
```

## التبعيات

### Dependencies
| الحزمة | الإصدار | الوصف |
|--------|---------|-------|
| `fastfree-auth` | `workspace:*` | API client + auth (getDocList, getDoc, createDoc, updateDoc, deleteDoc, callPost, callGet) |
| `vue` | `^3.5.22` | Vue 3 framework |
| `vue-router` | `^5.0.6` | التوجيه |
| `pinia` | `^4.0.2` | State management |
| `quasar` | `^2.23.1` | UI framework (q-table, q-dialog, q-form, q-input, q-select, q-badge, q-btn, q-card) |
| `@quasar/extras` | `^2.0.0` | أيقونات Material Design (mdi-*) |

### Imports من fastfree-auth
```typescript
import { getDocList, getDoc, createDoc, updateDoc, deleteDoc, callPost, callGet } from "fastfree-auth";
```

### Imports من fastfree-lowcode
```typescript
import { useLcI18n } from "quasar-app-extension-fastfree-lowcode/src/runtime/i18n";
import { useStatusHelpers } from "quasar-app-extension-fastfree-lowcode/src/runtime/composables/useStatusHelpers";
import { useFormatNumber } from "quasar-app-extension-fastfree-lowcode/src/runtime/composables/useFormatNumber";
```

## سجل التغييرات

### 2026-08-08 — بناء الحزمة الأولي
1. إنشاء Types كاملة (Lead, Opportunity, Contact, Address, Campaign, CrmSummary)
2. 8 خدمات (lead, opportunity, contact, address, campaign, leadSource, crmDashboard, report)
3. 7 شاشات (LeadList, LeadForm, OpportunityList, OpportunityForm, ContactList, ContactForm, CrmDashboard)
4. 227 مفتاح ترجمة (EN + AR)
5. useCrmStore (Pinia) بـ 4 fetch methods
6. Boot file (init.ts) + screen registration (screens.ts)
7. vue-tsc: 0 errors | lint:check: 0 violations

### 2026-08-08 — إصلاحات الجودة
1. OpportunityList — ترجمة status badge مع useStatusHelpers("crm")
2. ContactList — ترجمة "Designation" label
3. CrmDashboard — Promise.all لـ 4 API calls + useFormatNumber
4. locales/en.ts — إضافة 13 status key لـ useStatusHelpers
5. locales/ar.ts — إضافة 13 status key لـ useStatusHelpers
