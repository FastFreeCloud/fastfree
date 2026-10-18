---
name: fastfree-test
description: >-
  Mandatory verification, typechecking, and testing procedures for the FastFree Monorepo.
  Use before declaring any task complete or pushing changes to Git. Ensures zero TypeScript errors,
  clean linting, and valid NixOS evaluations.
---

# FastFree Test & Verification Skill

No task in FastFree is complete without passing verification. A green build is non-negotiable.

## 1. Frontend & Apps Verification (Zero TS Errors)

When modifying any package or app:

### A. FastFree Panel:
```powershell
cd apps/fastfree_panel
npx vue-tsc --noEmit        # Must return 0 errors
npx eslint -c ./eslint.config.js "./src/**/*.{ts,vue}"
```

### B. FastFree Packages:
```powershell
foreach($p in @('fastfree_lowcode','fastfree_auth','fastfree_accounting','fastfree_inventory','fastfree_sales','fastfree_purchase','fastfree_hr','fastfree_crm')){
  cd "C:\Users\FastFree\Desktop\fastfree\packages\$p"
  npx vue-tsc --noEmit
}
```

## 2. NixOS & Clan Verification

When modifying `apps/fastfree_os/`:
1. Check syntax and module references (never import deleted files).
2. Flake dry run verification:
   Verify that all module imports exist within the flake directory.
   ```powershell
   git status
   ```

## 3. End-to-End Testing (Cypress)
Run Cypress tests when modifying desktop windows or live MCP endpoints:
```powershell
cd apps/fastfree_panel
npx cypress run --spec "test/cypress/e2e/clan-desktop.cy.ts"
```
