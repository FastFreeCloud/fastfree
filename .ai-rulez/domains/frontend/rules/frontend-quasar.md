---
title: Quasar Vue 3 & LowCode Standards
priority: high
paths:
  - "apps/fastfree_panel/**"
  - "apps/fastfree_ledger/**"
  - "packages/**"
activation: glob
---

# FastFree Frontend & Quasar Standards

When working on Vue/TypeScript apps and packages:
- **Zero Errors**: Maintain 0 TypeScript errors (`vue-tsc --noEmit`) and clean ESLint.
- **Shared Composables**: Always reuse `useStatusHelpers` (for badges/colors) and `useFormatNumber` (for currency/numbers) instead of duplicating local functions.
- **Form Submissions**: Every form dialog must have `@submit.prevent` wired to its save method, with buttons having `type="submit"`.
- **RTL & i18n**: Support bidirectional layouts (use logical CSS properties like `inset-inline-start/end`) and load translations from i18n package registries.
