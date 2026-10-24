---
title: FastFree ERP Domain Invariants
priority: high
paths:
  - "packages/fastfree_accounting/**"
  - "packages/fastfree_inventory/**"
  - "packages/fastfree_sales/**"
  - "packages/fastfree_purchase/**"
  - "packages/fastfree_hr/**"
  - "packages/fastfree_crm/**"
activation: glob
---

# FastFree ERP Domain Invariants

When working within ERP domain packages:
1. **Shared Composables**: Always reuse `@fastfree/lowcode` composables:
   - `useFormatNumber` for all currency, amount, and quantity formatting.
   - `useStatusHelpers` for badges and status translations.
2. **Form Submissions**: Every modal form dialog must wire `@submit.prevent` to its save method, with primary action buttons having `type="submit"`.
3. **Save Success Verification**: Always check `result.success` before closing dialogs or resetting form data.
4. **Clean Error Handling**: Always wrap API calls in `try/catch/finally` blocks with user-facing notification via `$q.notify`.
5. **Zero Hardcoded Strings**: All table headers, form labels, tooltips, and status values must be retrieved from the package i18n translation registry.
