# FastFree ERP

> Modular ERP platform built with Quasar, Vue 3, TypeScript, and Frappe/ERPNext backend.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3-42b883.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)
[![Quasar](https://img.shields.io/badge/Quasar-2-1976d2.svg)](https://quasar.dev/)

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Packages](#packages)
- [Quick Start](#quick-start)
- [Development](#development)
- [Boot Order](#boot-order)
- [Quality](#quality)
- [Contributing](#contributing)
- [License](#license)

## Overview

FastFree ERP is a modular enterprise resource planning system composed of independent npm packages in a pnpm monorepo. Each package handles a specific business domain (accounting, inventory, sales, etc.) and can be developed, tested, and versioned independently.

**Key Technologies:**
- **Frontend:** Vue 3 + Quasar Framework + Pinia
- **Language:** TypeScript (strict mode)
- **Build:** Vite (via Quasar CLI)
- **Backend:** Frappe Framework / ERPNext
- **Package Manager:** pnpm workspaces
- **Database:** IndexedDB (Dexie) for offline caching

## Architecture

```mermaid
graph TD
    A[fastfree_ledger] --> B[fastfree_lowcode]
    A --> C[fastfree_auth]
    A --> D[fastfree_accounting]
    A --> E[fastfree_inventory]
    A --> F[fastfree_sales]
    A --> G[fastfree_purchase]
    A --> H[fastfree_hr]
    A --> I[fastfree_crm]

    C --> J[Frappe/ERPNext Server]
    D --> C
    E --> C
    F --> C
    G --> C
    H --> C
    I --> C

    B --> K[Pinia Stores]
    B --> L[Dynamic Tables]
    B --> M[Window Manager]
    B --> N[Shared Composables]
```

## Packages

| Package | Description | Screens | Services | i18n Keys |
|---------|-------------|---------|----------|-----------|
| [`fastfree_lowcode`](packages/fastfree_lowcode) | Core engine — window manager, CRUD table, dynamic forms, shared composables | 12 | — | 383 |
| [`fastfree_auth`](packages/fastfree_auth) | Authentication, user management, roles, licensing | 5 | 3 | 131 |
| [`fastfree_accounting`](packages/fastfree_accounting) | Chart of accounts, journal entries, payments, cost centers, fiscal years, reports | 13 | 8 | 135 |
| [`fastfree_inventory`](packages/fastfree_inventory) | Products, categories, warehouses, stock entries, suppliers | 8 | 5 | 80 |
| [`fastfree_sales`](packages/fastfree_sales) | Customers, quotations, sales orders, invoices, delivery notes | 7 | 6 | 150 |
| [`fastfree_purchase`](packages/fastfree_purchase) | Suppliers, purchase orders, receipts, invoices | 7 | 5 | 140 |
| [`fastfree_hr`](packages/fastfree_hr) | Employees, departments, attendance, leave, payroll | 7 | 9 | 114 |
| [`fastfree_crm`](packages/fastfree_crm) | Leads, opportunities, contacts, campaigns | 6 | 8 | 108 |
| **Total** | | **65** | **44** | **1,241** |

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 9
- Frappe/ERPNext server (for API calls)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd fastfree-lowcode-roadmap/fastfree

# Install dependencies
pnpm install

# Start development server
cd apps/fastfree_ledger
pnpm dev
```

### Using a Package

```typescript
// Import services
import { getAccounts, createJournalEntry } from 'fastfree-accounting'

// Import types
import type { Account, JournalEntry } from 'fastfree-accounting'

// Import store
import { useAccountingStore } from 'fastfree-accounting'

// Import shared utilities
import { useFormatNumber, useStatusHelpers } from 'fastfree-lowcode'
```

## Development

### Commands

```bash
# From the monorepo root
cd apps/fastfree_ledger

# Development server (port 9001)
pnpm dev

# TypeCheck — must be 0 errors
pnpm vue-tsc --noEmit

# Lint — must be 0 violations
pnpm eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"

# Lint + Auto Fix
pnpm eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}" --fix
```

### Project Structure

```
fastfree/
├── apps/
│   └── fastfree_ledger/          # Main Quasar application
│       ├── src/
│       │   ├── boot/             # Boot files (init each package)
│       │   ├── pages/            # Vue pages
│       │   └── ...
│       ├── quasar.config.ts
│       └── package.json
├── packages/
│   ├── fastfree_lowcode/         # Core engine
│   ├── fastfree_auth/            # Authentication
│   ├── fastfree_accounting/      # Accounting module
│   ├── fastfree_inventory/       # Inventory module
│   ├── fastfree_sales/           # Sales module
│   ├── fastfree_purchase/        # Purchase module
│   ├── fastfree_hr/              # HR module
│   └── fastfree_crm/             # CRM module
├── pnpm-workspace.yaml
└── AGENTS.md
```

## Boot Order

Packages must be initialized in a specific order:

```
1. fastfree-auth-init         → API client + auth
2. fastfree-accounting-init   → Accounting groups + screens
3. fastfree-inventory-init    → Inventory groups + screens
4. fastfree-sales-init        → Sales groups + screens
5. fastfree-purchase-init     → Purchase groups + screens
6. fastfree-hr-init           → HR groups + screens
7. fastfree-crm-init          → CRM groups + screens
8. i18n                       → Translations loaded
9. register-service-worker    → PWA registration
```

## Quality

| Metric | Target | Status |
|--------|--------|--------|
| TypeScript Errors | 0 | ✅ |
| ESLint Violations | 0 | ✅ |
| ESLint Warnings | 0 | ✅ |
| Screen Count | 65 | ✅ |
| Service Count | 44 | ✅ |
| i18n Keys | 1,241 | ✅ |

### Shared Utilities

The `fastfree-lowcode` package provides shared composables:

- **`useFormatNumber()`** — Locale-aware number, currency, and percentage formatting
- **`useStatusHelpers(namespace)`** — Status translation, color mapping, and options generation

```typescript
import { useFormatNumber, useStatusHelpers } from 'fastfree-lowcode'

const { formatNumber, formatCurrency } = useFormatNumber()
const { translateStatus, statusColor } = useStatusHelpers('sales')
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes in the relevant package
3. Ensure `pnpm vue-tsc --noEmit` passes with 0 errors
4. Ensure `pnpm eslint` passes with 0 violations
5. Update the package's `AGENTS.md` and `README.md`
6. Submit a pull request

### Code Standards

- **TypeScript strict mode** — no `any` types, exact optional properties
- **Named exports only** — no default exports for services
- **try/catch** — all async operations must handle errors
- **i18n** — all user-facing text must use `t()` calls
- **ARIA** — all interactive elements must have `aria-label`
- **No console.log** — use proper error handling

## License

MIT — FastFree
