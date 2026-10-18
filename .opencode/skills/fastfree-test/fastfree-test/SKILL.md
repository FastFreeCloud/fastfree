---
name: fastfree-test
description: >-
  Mandatory verification, typechecking, and testing procedures for the FastFree Monorepo.
  Use before declaring any task complete or pushing changes to Git. Ensures zero TypeScript errors,
  clean linting, and valid NixOS evaluations.
---

# FastFree Test & Quality Verification Skill

No task in FastFree is complete without passing verification. A green build with zero TypeScript errors and zero lint violations is non-negotiable.

---

## 1. Primary Applications Verification

Always prepare Quasar environment first if `quasar.config.ts` or routes change, then run strict typechecking and linting.

### A. FastFree Panel (`apps/fastfree_panel`):
```powershell
cd apps/fastfree_panel
npx quasar prepare          # Generates .quasar types; run after config changes
npx vue-tsc --noEmit        # Must return exactly 0 errors
npx eslint -c ./eslint.config.js "./src*/**/*.{ts,js,cjs,mjs,vue}"
```

### B. FastFree Ledger (`apps/fastfree_ledger`):
```powershell
cd apps/fastfree_ledger
npx quasar prepare          # Generates .quasar types
npx vue-tsc --noEmit        # Must return exactly 0 errors
npx eslint -c ./eslint.config.js "./src*/**/*.{ts,js,cjs,mjs,vue}"
```

> ⚠️ **Linting Note**: Avoid running `npm run lint:check` as it triggers Prettier with write operations. Use `npx eslint` for read-only verification, and `npm run lint` for auto-fixing issues.

---

## 2. Shared Packages Verification (`packages/`)

### A. Single Package Check:
```powershell
cd packages/<package_name>
npx vue-tsc --noEmit
```

### B. Full Batch Check Across All Packages:
Run this PowerShell loop from the monorepo root to verify zero TS errors across all core packages:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
foreach($p in @('fastfree_lowcode','fastfree_auth','fastfree_accounting','fastfree_inventory','fastfree_sales','fastfree_purchase','fastfree_hr','fastfree_crm')){
  cd "C:\Users\FastFree\Desktop\fastfree\packages\$p"
  Write-Output "$p = $((npx vue-tsc --noEmit 2>&1 | Select-String 'error TS' | Measure-Object).Count)"
}
```

### C. Flox Hermetic Quality Check (Linux / WSL / Flox):
```bash
flox activate -d C:/Users/FastFree/Desktop/fastfree -- bash .gemini/skills/fastfree-guide/scripts/check-quality.sh apps/fastfree_ledger
```

---

## 3. NixOS & Clan Fleet Verification (`apps/fastfree_os`)

When touching Nix files, flake configurations, or host definitions:

### A. Flake Syntax & Dry Run Evaluation:
```bash
# Verify flake definitions without building packages
nix flake check --no-build

# Evaluate Clan schema and machine configurations
nix eval .#clan --json
```

### B. Clan Inventory & Machine Validation:
```bash
# Check Clan fleet machines and network status
bash .gemini/skills/fastfree-guide/scripts/clan-ops.sh check
```

### C. Git Integrity & Module Check:
Ensure no deleted or renamed nix modules are referenced in `clan.nix` or `flake.nix`:
```powershell
git status --ignored
```

---

## 4. End-to-End & Integration Tests (Cypress)

Run Cypress tests when modifying desktop window managers, dock components, or live MCP endpoints:
```powershell
cd apps/fastfree_panel
npx cypress run --spec "test/cypress/e2e/clan-desktop.cy.ts"
```

---

## 5. Pre-Completion Quality Invariants Checklist

Before finalizing any task or pushing to Git:
- [ ] **TypeScript**: `0` errors across modified packages and host applications.
- [ ] **ESLint**: Clean linting with zero warnings/errors.
- [ ] **No Dead Logs**: Zero `console.log` or `console.error` left in production code.
- [ ] **Form Handling**: All forms wire `@submit.prevent` with explicit submit buttons.
- [ ] **RTL Styling**: Logical CSS properties used exclusively (`inset-inline-start/end`, `margin-inline`, `padding-inline`).
- [ ] **Accessibility**: Every `<q-btn>` possesses a descriptive `aria-label`.
- [ ] **Internationalization**: Bilingual keys present in both `locales/en.ts` and `locales/ar.ts`.
