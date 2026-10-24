---
name: typecheck-all
description: "Run TypeScript typecheck across all applications and packages"
disable-model-invocation: true
# Content-Hash: blake3:3026b84c371fd86d864af0d00a12fc4375e93edb2ce1cbdd8c95f8b135c03b17
---

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
