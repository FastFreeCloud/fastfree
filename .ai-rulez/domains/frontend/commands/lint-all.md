---
description: Run ESLint across FastFree frontend applications in check mode
---

# Lint FastFree Frontend Apps

Run read-only lint checks without modifying code:

```powershell
cd apps/fastfree_panel; npx eslint -c ./eslint.config.js "./src*/**/*.{ts,js,cjs,mjs,vue}"; cd ../..
cd apps/fastfree_ledger; npx eslint -c ./eslint.config.js "./src*/**/*.{ts,js,cjs,mjs,vue}"; cd ../..
```
