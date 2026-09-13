---
name: erp-domain-development
description: Add or fix a screen, service, store, or locale in any fastfree_* domain package following architecture invariants and shared utilities. Use for ERP feature work and code review.
---

# ERP Domain Development

## New-file template (per screen / service / store)

1. **Types first**: extend the domain `types.ts` (`Customer`, `SalesInvoice`, …). Never use
   `Record<string, unknown>` for documents — use `Partial<DocType>`.
2. **Service layer**: put all Frappe calls in `*.service.ts` via `api.service`
   (`getDocList/getDoc/createDoc/updateDoc/callPost`). No direct HTTP in screens.
3. **Screen**: dynamic `LcTable`/`LcForm` (lowcode shell), `@submit.prevent` + `type="submit"`,
   programmatic `v-close-popup`, try/catch + `$q.notify` on every save, `else` branch on
   `result.success === false`.
4. **Store** (Pinia): `fetch*` actions with loading state; parallelize independent calls
   with `Promise.all`.
5. **Locales**: add EN + AR keys together; reuse `translateStatus`/shared helpers.
6. **Registration**: register screens in the package `init.ts`/`screens.ts`
   (typed `AsyncComponentLoader`), respecting boot order (below).

## Hard invariants (from `packages/fastfree-quasar-architecture.md`)

- Boot order: `fastfree-auth-init` → accounting/inventory/sales/purchase/hr/crm-init →
  `i18n` → `register-service-worker`.
- Permissions only via `permission.service` (`can(action, doctype)`); submitted docs use
  submit/cancel flows, never delete.
- Shared utils, never local copies: `useFormatNumber`, `useStatusHelpers`.
- RTL: `left/right` → `inset-inline-start/end`; add `aria-label` to interactive elements.
- `filters` are `Record` objects, never arrays. Respect `exactOptionalPropertyTypes`
  (`string|undefined` handling).
- No `console.log`/`console.error` in shipped code.

## Before finishing

1. Add/extend EN+AR locale keys (both, always).
2. Run the `quasar-quality-gates` skill (vue-tsc + lint must be green).
3. Per-package tables (screens/services/stores/key counts) stay in
   `packages/*/AGENTS.md` — read them, don't copy them here.

## Stop conditions

- New DocType mapping or pricing-model duplication → ask for review first.
- Production data migration or permission-model change → human approval required.
