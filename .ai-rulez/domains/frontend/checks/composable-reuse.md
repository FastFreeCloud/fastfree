---
description: Ensure useFormatNumber and useStatusHelpers are used instead of local duplicates
severity: medium
targets:
  - antigravity
  - opencode
  - claude
---

# Composable Reuse Check

When reviewing Vue screens and components:
- Verify that currency and numeric formatting uses `useFormatNumber()` from `@fastfree/lowcode`.
- Verify that status color mapping and translations use `useStatusHelpers()` from `@fastfree/lowcode`.
- Forbid creating local duplicate functions like `formatCurrency(val)` or `getStatusColor(status)`.
