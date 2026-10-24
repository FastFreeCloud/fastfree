---
description: Run ESLint across FastFree frontend applications in check mode
name: lint-all
user-invocable: true
# Content-Hash: blake3:25268571693017288df4b0d28fa91943cbfdee084b7da77651bb43ec53939438
---

# Lint FastFree Frontend Apps

Run read-only lint checks without modifying code:

```powershell
cd apps/fastfree_panel; npx eslint -c ./eslint.config.js "./src*/**/*.{ts,js,cjs,mjs,vue}"; cd ../..
cd apps/fastfree_ledger; npx eslint -c ./eslint.config.js "./src*/**/*.{ts,js,cjs,mjs,vue}"; cd ../..
```
