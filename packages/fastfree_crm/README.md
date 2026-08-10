# @fastfree/crm

> Customer relationship management for FastFree ERP — Leads, Opportunities, Contacts, Campaigns.

[![npm version](https://img.shields.io/badge/npm-0.1.0-blue.svg)](https://npmjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Features](#features)
- [Install](#install)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Reference](#api-reference)
  - [Services](#services)
  - [Types](#types)
  - [Screens](#screens)
- [Shared Utilities](#shared-utilities)
- [Configuration](#configuration)
- [License](#license)

## Features

- **Lead Management** — Create, edit, convert, and track leads through the full lifecycle (New → Contacted → Qualified → Converted).
- **Opportunity Pipeline** — Manage sales opportunities with stage tracking (Prospecting → Qualification → Proposal → Negotiation → Closed Won/Lost).
- **Contact Directory** — Maintain contacts with company, department, and designation metadata.
- **Campaign Tracking** — Plan and measure marketing campaigns across Email, Google Adwords, Social Media, Direct Mail, and Referral channels.
- **CRM Dashboard** — Real-time stats (leads, opportunities, contacts, conversion rate) with lead pipeline breakdown and sales performance metrics.
- **Lead Source Analytics** — Track lead origin by Cold Call, Email Campaign, Web Search, Referral, Social Media, Web Form, and Walk In.
- **Bilingual** — Full English + Arabic translations (227 keys each) with RTL support.
- **Zero Errors** — vue-tsc: 0 errors, lint:check: 0 violations.

## Install

```bash
# From the monorepo root
pnpm install fastfree-crm --filter fastfree-crm

# Or add to your app's package.json
pnpm add fastfree-crm --workspace
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `fastfree-auth` | `workspace:*` | API client + authentication |
| `vue` | `^3.5.22` | Vue 3 framework |
| `vue-router` | `^5.0.6` | Routing |
| `pinia` | `^4.0.2` | State management |
| `quasar` | `^2.23.1` | UI components (q-table, q-dialog, q-form, q-badge, etc.) |
| `@quasar/extras` | `^2.0.0` | Material Design Icons (mdi-*) |

## Quick Start

### 1. Register the CRM module

```typescript
// src/boot/fastfree-crm.ts
import { initFastFreeCrm } from "fastfree-crm";

export default () => {
  initFastFreeCrm();
};
```

### 2. Add to `quasar.config`

```javascript
// quasar.config.js
module.exports = {
  boot: [
    "fastfree-crm",   // register groups + screens
    "i18n",           // load translations AFTER all packages
  ],
};
```

### 3. Use the store in a component

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { useCrmStore } from "fastfree-crm";

const store = useCrmStore();

onMounted(async () => {
  await Promise.all([
    store.fetchLeads(),
    store.fetchOpportunities(),
    store.fetchContacts(),
    store.fetchSummary(),
  ]);
});
</script>

<template>
  <div>
    <div>Total Leads: {{ store.leads.length }}</div>
    <div>Total Opportunities: {{ store.opportunities.length }}</div>
    <div>Conversion Rate: {{ store.summary?.conversion_rate ?? 0 }}%</div>
  </div>
</template>
```

### 4. Call services directly

```typescript
import {
  getLeads,
  createLead,
  convertLeadToOpportunity,
  getOpportunities,
  getSalesPerformance,
  getLeadReport,
} from "fastfree-crm";

// Fetch all leads
const leadsResult = await getLeads();
if (leadsResult.success) {
  console.log(leadsResult.data); // Lead[]
}

// Create a new lead
const newLead = await createLead({
  lead_name: "John Doe",
  company_name: "Acme Corp",
  lead_type: "Company",
  lead_source: "Email Campaign",
  lead_status: "New",
  email_id: "john@acme.com",
  phone: "+1-555-0100",
  posting_date: "2026-08-08",
  address: "123 Main St, Springfield, IL",
});

// Convert lead to opportunity
const opportunity = await convertLeadToOpportunity("LEAD-001", {
  opportunity_amount: 50000,
  stage: "Prospecting",
});

// Get CRM performance summary
const summary = await getSalesPerformance();
if (summary.success) {
  console.log(summary.data); // CrmSummary
}

// Generate a lead report for a date range
const report = await getLeadReport("2026-01-01", "2026-08-08");
```

## Architecture

```
packages/fastfree_crm/
├── package.json
├── tsconfig.json
├── AGENTS.md
├── README.md
└── src/
    ├── index.ts                          # Public API exports
    ├── init.ts                           # Boot registration (lowcode registry)
    ├── screens.ts                        # Screen registration (defineAsyncComponent)
    ├── locales/
    │   ├── en.ts                         # English translations (227 keys)
    │   └── ar.ts                         # Arabic translations (227 keys)
    ├── types/
    │   └── index.ts                      # All TypeScript types/interfaces
    ├── stores/
    │   └── useCrmStore.ts                # Pinia store (Composition API)
    ├── screens/
    │   ├── LeadList.vue                  # Leads table + search + delete confirm
    │   ├── LeadForm.vue                  # Add/Edit lead dialog + validation
    │   ├── OpportunityList.vue           # Opportunities table + search + delete
    │   ├── OpportunityForm.vue           # Add/Edit opportunity dialog + validation
    │   ├── ContactList.vue               # Contacts table + search + delete
    │   ├── ContactForm.vue               # Add/Edit contact dialog + validation
    │   └── CrmDashboard.vue              # Dashboard — stats + lead pipeline
    └── services/
        ├── index.ts                      # Barrel export
        ├── lead.service.ts               # Lead CRUD + convert/submit/cancel
        ├── opportunity.service.ts        # Opportunity CRUD + submit/cancel
        ├── contact.service.ts            # Contact CRUD
        ├── address.service.ts            # Address CRUD
        ├── campaign.service.ts           # Campaign CRUD + submit/cancel
        ├── leadSource.service.ts         # Lead Source CRUD
        ├── crmDashboard.service.ts       # Dashboard API (pipeline, ROI, perf.)
        └── report.service.ts             # Reports (lead, opportunity, campaign)
```

**Total:** 20 source files (8 `.ts` + 7 `.vue` + 2 locales + 2 config + 1 barrel)

### Boot Order

```
fastfree-auth-init        →  API client + auth initialized
fastfree-accounting-init  →  Accounting groups + screens registered
fastfree-inventory-init  →  Inventory groups + screens registered
fastfree-sales-init      →  Sales groups + screens registered
fastfree-purchase-init   →  Purchase groups + screens registered
fastfree-hr-init         →  HR groups + screens registered
fastfree-crm-init        →  CRM groups + screens registered
i18n                     →  Translations loaded AFTER all packages register
```

## API Reference

### Services

#### Lead Service (`lead.service.ts`)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getLeads()` | — | `ApiResponse<Lead[]>` | Fetch all leads |
| `getLead(id)` | `string` | `ApiResponse<Lead>` | Fetch a single lead |
| `createLead(data)` | `Partial<Lead>` | `ApiResponse<Lead>` | Create a new lead |
| `updateLead(id, data)` | `string, Partial<Lead>` | `ApiResponse<Lead>` | Update a lead |
| `deleteLead(id)` | `string` | `ApiResponse<void>` | Delete a lead |
| `convertLeadToOpportunity(leadId, data)` | `string, Partial<Lead>` | `ApiResponse<Opportunity>` | Convert lead to opportunity |
| `submitLead(name)` | `string` | `ApiResponse<void>` | Submit (post) a lead |
| `cancelLead(name)` | `string` | `ApiResponse<void>` | Cancel a lead |

```typescript
import { getLeads, createLead, convertLeadToOpportunity } from "fastfree-crm";

// List leads with status
const result = await getLeads();
result.data?.forEach((lead) => {
  console.log(`${lead.lead_name} — ${lead.lead_status}`);
});

// Create + convert workflow
const created = await createLead({
  lead_name: "Jane Smith",
  company_name: "Globex Corp",
  lead_type: "Company",
  lead_source: "Referral",
  lead_status: "New",
  posting_date: "2026-08-08",
  address: "456 Oak Ave, Shelbyville, IL",
});

if (created.success && created.data) {
  const opp = await convertLeadToOpportunity(created.data.name, {
    opportunity_amount: 75000,
    stage: "Qualification",
  });
  console.log("Opportunity created:", opp.data?.name);
}
```

#### Opportunity Service (`opportunity.service.ts`)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getOpportunities()` | — | `ApiResponse<Opportunity[]>` | Fetch all opportunities |
| `getOpportunity(id)` | `string` | `ApiResponse<Opportunity>` | Fetch a single opportunity |
| `createOpportunity(data)` | `Partial<Opportunity>` | `ApiResponse<Opportunity>` | Create a new opportunity |
| `updateOpportunity(id, data)` | `string, Partial<Opportunity>` | `ApiResponse<Opportunity>` | Update an opportunity |
| `deleteOpportunity(id)` | `string` | `ApiResponse<void>` | Delete an opportunity |
| `submitOpportunity(name)` | `string` | `ApiResponse<void>` | Submit an opportunity |
| `cancelOpportunity(name)` | `string` | `ApiResponse<void>` | Cancel an opportunity |

```typescript
import { getOpportunities, updateOpportunity } from "fastfree-crm";

// Filter opportunities by stage
const result = await getOpportunities();
const negotiation = result.data?.filter((opp) => opp.stage === "Negotiation");

// Advance opportunity to Closed Won
if (negotiation?.length) {
  await updateOpportunity(negotiation[0].name, {
    stage: "Closed Won",
    status: "Won",
  });
}
```

#### Contact Service (`contact.service.ts`)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getContacts()` | — | `ApiResponse<Contact[]>` | Fetch all contacts |
| `getContact(id)` | `string` | `ApiResponse<Contact>` | Fetch a single contact |
| `createContact(data)` | `Partial<Contact>` | `ApiResponse<Contact>` | Create a new contact |
| `updateContact(id, data)` | `string, Partial<Contact>` | `ApiResponse<Contact>` | Update a contact |
| `deleteContact(id)` | `string` | `ApiResponse<void>` | Delete a contact |

```typescript
import { getContacts, createContact } from "fastfree-crm";

const contacts = await getContacts();
console.log(`${contacts.data?.length} contacts found`);

await createContact({
  first_name: "Alice",
  last_name: "Johnson",
  email_id: "alice@example.com",
  company_name: "Initech",
  designation: "CTO",
  department: "Engineering",
});
```

#### Address Service (`address.service.ts`)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getAddresses()` | — | `ApiResponse<Address[]>` | Fetch all addresses |
| `getAddress(id)` | `string` | `ApiResponse<Address>` | Fetch a single address |
| `createAddress(data)` | `Partial<Address>` | `ApiResponse<Address>` | Create a new address |
| `updateAddress(id, data)` | `string, Partial<Address>` | `ApiResponse<Address>` | Update an address |
| `deleteAddress(id)` | `string` | `ApiResponse<void>` | Delete an address |

```typescript
import { createAddress } from "fastfree-crm";

await createAddress({
  address_title: "Office HQ",
  address_line1: "100 Corporate Blvd",
  city: "Metropolis",
  state: "NY",
  country: "US",
  pincode: "10001",
  phone: "+1-555-0200",
  latitude: 40.7128,
  longitude: -74.006,
});
```

#### Campaign Service (`campaign.service.ts`)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getCampaigns()` | — | `ApiResponse<Campaign[]>` | Fetch all campaigns |
| `getCampaign(id)` | `string` | `ApiResponse<Campaign>` | Fetch a single campaign |
| `createCampaign(data)` | `Partial<Campaign>` | `ApiResponse<Campaign>` | Create a new campaign |
| `updateCampaign(id, data)` | `string, Partial<Campaign>` | `ApiResponse<Campaign>` | Update a campaign |
| `deleteCampaign(id)` | `string` | `ApiResponse<void>` | Delete a campaign |
| `submitCampaign(name)` | `string` | `ApiResponse<void>` | Submit a campaign |
| `cancelCampaign(name)` | `string` | `ApiResponse<void>` | Cancel a campaign |

```typescript
import { createCampaign, getCampaigns, submitCampaign } from "fastfree-crm";

// Create a new email campaign
const result = await createCampaign({
  campaign_name: "Q3 Product Launch",
  campaign_type: "Email",
  status: "Planned",
  budget_cost: 5000,
  started_date: "2026-09-01",
  ended_date: "2026-09-30",
  description: "Email campaign for Q3 product launch",
});

// List all campaigns
const all = await getCampaigns();
all.data?.forEach((c) => {
  console.log(`${c.campaign_name} — ${c.status} — $${c.budget_cost}`);
});

// Submit when ready
await submitCampaign("Q3 Product Launch");
```

#### Lead Source Service (`leadSource.service.ts`)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getLeadSources()` | — | `ApiResponse<LeadSourceDoc[]>` | Fetch all lead sources |
| `getLeadSource(id)` | `string` | `ApiResponse<LeadSourceDoc>` | Fetch a single lead source |
| `createLeadSource(data)` | `Partial<LeadSourceDoc>` | `ApiResponse<LeadSourceDoc>` | Create a new lead source |
| `updateLeadSource(id, data)` | `string, Partial<LeadSourceDoc>` | `ApiResponse<LeadSourceDoc>` | Update a lead source |
| `deleteLeadSource(id)` | `string` | `ApiResponse<void>` | Delete a lead source |

> `LeadSourceDoc`: `{ name: string; source_name?: string; creation?: string; modified?: string; owner?: string; }`

#### Dashboard Service (`crmDashboard.service.ts`)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getLeadPipeline(params?)` | `Record<string, unknown>?` | `ApiResponse<Record<string, number>>` | Lead pipeline by status |
| `getOpportunityPipeline(params?)` | `Record<string, unknown>?` | `ApiResponse<Record<string, number>>` | Opportunity pipeline by stage |
| `getLeadsBySource(params?)` | `Record<string, unknown>?` | `ApiResponse<Record<string, number>>` | Leads grouped by source |
| `getSalesPerformance(params?)` | `Record<string, unknown>?` | `ApiResponse<CrmSummary>` | Sales performance summary |
| `getCampaignROI(params?)` | `Record<string, unknown>?` | `ApiResponse<Record<string, number>>` | Campaign ROI metrics |

```typescript
import { getSalesPerformance, getLeadPipeline, getCampaignROI } from "fastfree-crm";

const perf = await getSalesPerformance();
if (perf.success) {
  const s = perf.data!;
  console.log(`Total leads: ${s.total_leads}`);
  console.log(`Conversion rate: ${s.conversion_rate}%`);
  console.log(`Won value: $${s.won_opportunity_value.toLocaleString()}`);
}

const pipeline = await getLeadPipeline();
// { "New": 12, "Contacted": 8, "Qualified": 5, "Converted": 3, ... }

const roi = await getCampaignROI();
// { "Email": 3.2, "Social Media": 1.8, "Referral": 5.1, ... }
```

#### Report Service (`report.service.ts`)

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `getLeadReport(fromDate, toDate)` | `string, string` | `ApiResponse<Record<string, unknown>>` | Lead report |
| `getOpportunityReport(fromDate, toDate)` | `string, string` | `ApiResponse<Record<string, unknown>>` | Opportunity report |
| `getCampaignReport(fromDate, toDate)` | `string, string` | `ApiResponse<Record<string, unknown>>` | Campaign report |

```typescript
import { getLeadReport, getOpportunityReport, getCampaignReport } from "fastfree-crm";

const leadReport = await getLeadReport("2026-01-01", "2026-08-08");
const oppReport = await getOpportunityReport("2026-01-01", "2026-08-08");
const campaignReport = await getCampaignReport("2026-01-01", "2026-08-08");
```

### Types

All types are exported from `fastfree-crm`:

```typescript
import type {
  Lead,
  LeadStatus,
  LeadType,
  LeadSource,
  LeadSourceParams,
  Opportunity,
  OpportunityStatus,
  OpportunityStage,
  Contact,
  ContactType,
  Address,
  Campaign,
  CampaignType,
  CampaignStatus,
  CrmSummary,
  ApiResponse,
} from "fastfree-crm";
```

#### LeadStatus

```typescript
type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Unqualified"
  | "Interested"
  | "Not Interested"
  | "Lost"
  | "Converted";
```

#### LeadType

```typescript
type LeadType = "Company" | "Individual" | "Partnership";
```

#### LeadSource

```typescript
type LeadSource =
  | "Cold Call"
  | "Email Campaign"
  | "Web Search"
  | "Referral"
  | "Social Media"
  | "Web Form"
  | "Walk In";
```

#### Lead

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

#### OpportunityStatus

```typescript
type OpportunityStatus =
  "Open" | "Quotation" | "Ordered" | "Lost" | "Won" | "Replied";
```

#### OpportunityStage

```typescript
type OpportunityStage =
  | "Prospecting"
  | "Qualification"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";
```

#### Opportunity

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

#### Contact

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

#### Address

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

#### Campaign

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

#### CampaignType

```typescript
type CampaignType =
  | "Email"
  | "Google Adwords"
  | "Social Media"
  | "Direct Mail"
  | "Referral"
  | "Other";
```

#### CampaignStatus

```typescript
type CampaignStatus =
  "Planned" | "Active" | "Completed" | "Cancelled" | "Draft";
```

#### CrmSummary

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

#### ApiResponse

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

### Screens

| Screen | Type | Description |
|--------|------|-------------|
| `LeadList.vue` | Table + Dialog | Leads table with search, status badges, delete confirm |
| `LeadForm.vue` | Dialog (Add/Edit) | Lead form with validation, dropdowns, date picker |
| `OpportunityList.vue` | Table + Dialog | Opportunities table with stage/status badges |
| `OpportunityForm.vue` | Dialog (Add/Edit) | Opportunity form with amount, probability, stage |
| `ContactList.vue` | Table + Dialog | Contacts table with search and delete confirm |
| `ContactForm.vue` | Dialog (Add/Edit) | Contact form with email validation |
| `CrmDashboard.vue` | Dashboard | 4 stat cards + lead pipeline breakdown table |

#### Lead List Columns

`lead_name` · `company_name` · `lead_owner` · `email_id` · `phone` · `lead_status` · `lead_source` · `posting_date` · **actions**

#### Opportunity List Columns

`name` · `customer` · `opportunity_from` · `status` · `stage` · `opportunity_amount` · `posting_date` · `lead_source` · **actions**

#### Contact List Columns

`first_name` · `last_name` · `email_id` · `phone` · `company_name` · `designation` · **actions**

#### CRM Dashboard

- **4 stat cards:** Total Leads, Total Opportunities, Total Contacts, Conversion Rate
- **Lead pipeline table:** Breakdown of leads by status with counts
- Data loaded via `Promise.all([fetchLeads, fetchOpportunities, fetchContacts, fetchSummary])`

## Shared Utilities

CRM uses shared composables from `fastfree-lowcode`:

```typescript
// Status badges with translation + color
import { useStatusHelpers } from "quasar-app-extension-fastfree-lowcode/src/runtime/composables/useStatusHelpers";
const { translateStatus, statusColor } = useStatusHelpers("crm");

// Locale-aware number formatting
import { useFormatNumber } from "quasar-app-extension-fastfree-lowcode/src/runtime/composables/useFormatNumber";
const { formatNumber } = useFormatNumber();

// i18n
import { useLcI18n } from "quasar-app-extension-fastfree-lowcode/src/runtime/i18n";
const { t } = useLcI18n();
```

## Configuration

### Store (`useCrmStore`)

```typescript
import { useCrmStore } from "fastfree-crm";

const store = useCrmStore();

// State
store.leads;           // Ref<Lead[]>
store.opportunities;   // Ref<Opportunity[]>
store.contacts;        // Ref<Contact[]>
store.campaigns;       // Ref<Campaign[]>
store.summary;         // Ref<CrmSummary | null>
store.loading;         // Ref<boolean>
store.error;           // Ref<string | null>

// Actions
await store.fetchLeads();
await store.fetchOpportunities();
await store.fetchContacts();
await store.fetchSummary();
store.$reset();  // Reset all state to defaults
```

### API Imports

```typescript
// All services are available from fastfree-auth under the hood
import {
  getDocList, getDoc, createDoc, updateDoc, deleteDoc,
  callPost, callGet,
} from "fastfree-auth";
```

## License

[MIT](https://opensource.org/licenses/MIT) — FastFree ERP
