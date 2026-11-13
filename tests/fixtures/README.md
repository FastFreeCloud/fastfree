# Test data fixtures & factories

One framework-agnostic library for generating test data, shared by **Vitest**
unit tests and **Cypress** E2E/component specs.

```
tests/fixtures/
├── core.ts        factory primitives (defineFactory, buildList, seq, unique)
├── api.ts         API envelope factories (apiSuccess / apiFailure / paginated)
├── auth.ts        user, session, license, settings, permission check
├── accounting.ts  account, journal entry, payment, ledger, cost center, FY, tax
├── crm.ts         lead, opportunity, contact, address, campaign
├── hr.ts          employee, department, designation, attendance, leave, slip
├── inventory.ts   product, category, warehouse, supplier, stock entry/balance
├── purchase.ts    supplier, purchase order/receipt/invoice
├── sales.ts       customer, quotation, order, invoice, delivery note
├── panel.ts       Clan Panel machine fixture (the /api/v1/machines contract)
├── scenarios.ts   composed scenarios + deliberate edge cases
└── index.ts       barrel
```

## Import

Unit tests import the library with a relative path (the root Vitest project
config does not propagate `resolve.alias` into every workspace project):

```ts
import { accounting, apiSuccess, buildList, resetFactories } from '../../../tests/fixtures/index'

const entries = buildList(accounting.journalEntry, 3)
```

Cypress specs import through the browser-safe re-export
(`packages/fastfree_panel/test/cypress/fixtures/factories.ts`), which keeps the
existing `../fixtures/factories` import path working:

```ts
import { apiFailure, machine, type MachineFixture } from '../fixtures/factories'
```

The library has **no runtime imports** — domain types are pulled in with
`import type` only, so it bundles into a Cypress spec without pulling in the
Frappe SDK, Dexie or Vue.

## Conventions

- Factories return fully-populated, internally consistent records (journal
  entries balance, document totals equal the sum of their lines).
- Override only what a test cares about: `employee({ status: 'Left' })`.
- Call `resetFactories()` in a global `beforeEach` when a test asserts on
  generated ids/names.
- Deliberately invalid/edge-case data lives in `scenarios.ts`
  (`unbalancedJournalEntry`, `expiredLicense`, `negativeStockProduct`,
  `overBudgetCostCenter`, `overdueSalesInvoice`, ...), not in the base
  factories.

## Domain namespaces

Several modules expose the same entity name (e.g. `supplier` exists in both
inventory and purchase), so domain factories are namespaced at the barrel:

```ts
import { inventory, purchase } from '@fastfree/test-fixtures'
inventory.supplier({ supplierName: 'Stock Supplier' })
purchase.supplier({ supplierName: 'Vendor Supplier' })
```

Core helpers, API envelopes, the machine fixture and scenarios are exported
directly because their names are collision-free.
