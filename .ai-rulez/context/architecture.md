---
title: FastFree Monorepo Architecture
priority: high
---

# FastFree Monorepo Architecture

FastFree is a sovereign, offline-first enterprise multi-agent monorepo and operating system ecosystem.

## Directory Structure

- **apps/**: Independent deployable application targets:
  - `fastfree_panel`: Clan Panel SPA (Quasar 2 + Vue 3 + TypeScript + Vite) with private Node/Hono backend (`apps/fastfree_panel/backend`).
  - `fastfree_ledger`: Unified business ledger (Accounting, Sales, Inventory) built on LowCode.
  - `fastfree_erp`, `fastfree_pos`, `fastfree_hr`: Standalone Quasar apps with Capacitor mobile builds (`src-capacitor`).
  - `fastfree_website`: FastFree public portal.
  - `fastfree_backend`: Custom Frappe v15 app (Python / MariaDB).
  - `apps/fastfree_os`: Sovereign NixOS Clan 26.05 infrastructure (VPS `client1`, Hyper-V appliances `client2..11`, WireGuard).
- **packages/**: Core shared modular domain packages (0 TypeScript errors required):
  - `fastfree_lowcode`: UI engine, dynamic forms, datatables, 38 components, 27 composables, RTL/i18n engine.
  - `fastfree_auth`: Identity, licenses, role-based access control (Has Role child tables), API client.
  - `fastfree_accounting`: General ledger, chart of accounts, journal/payment entries, fiscal years, cost centers.
  - `fastfree_inventory`: Items, warehouses, stock entries, bin levels.
  - `fastfree_sales`: Quotations, sales orders, invoices, delivery notes.
  - `fastfree_purchase`: Suppliers, purchase orders, purchase receipts, purchase invoices.
  - `fastfree_hr`: Employees, departments, attendance, leave applications, payroll.
  - `fastfree_crm`: Leads, opportunities, contacts, campaigns.
  - `fastfree_update`: Update orchestration and playground.
- **scripts/**: Automation scripts for brand assets, Android keystores, and store automation.
- **.github/workflows/**: CI/CD deployment pipelines for Clan hosts, Android releases, and web builds.

## Key Principles & Invariants

- **Zero TS Errors**: Enforce `vue-tsc --noEmit` across all apps and packages before push.
- **Zero Raw CSS Offsets in RTL**: Always use logical properties (`inset-inline-start/end`) instead of `left/right`.
- **Reusable Composables**: Reuse `useFormatNumber` (currency/number) and `useStatusHelpers` (badges/status) instead of local helpers.
- **Form Submissions**: Every dialog form must wire `@submit.prevent` to its save function with `type="submit"` buttons.
- **Clan Secrets**: Zero plaintext passwords in Git or Nix expressions; use Clan Vars (`clan vars`).
