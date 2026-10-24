---
description: Run TypeScript typecheck across all applications and packages
---

# TypeCheck All FastFree Monorepo Packages and Apps

Execute this procedure to verify that all packages and apps have exactly 0 TypeScript errors:

```powershell
# 1. TypeCheck FastFree Panel
cd apps/fastfree_panel; npx vue-tsc --noEmit; cd ../..

# 2. TypeCheck FastFree Ledger
cd apps/fastfree_ledger; npx vue-tsc --noEmit; cd ../..

# 3. TypeCheck All Modular Packages
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
foreach($p in @('fastfree_lowcode','fastfree_auth','fastfree_accounting','fastfree_inventory','fastfree_sales','fastfree_purchase','fastfree_hr','fastfree_crm')){
  cd "C:\Users\FastFree\Desktop\fastfree\packages\$p"
  Write-Output "$p = $((npx vue-tsc --noEmit 2>&1 | Select-String 'error TS' | Measure-Object).Count) errors"
}
cd "C:\Users\FastFree\Desktop\fastfree"
```
