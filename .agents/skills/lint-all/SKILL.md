---
name: lint-all
description: "Run ESLint across FastFree frontend applications in check mode"
disable-model-invocation: true
# Content-Hash: blake3:5e387e6124f926849fd882b31aef22f0022d67aa8471991838770d5b10ae9172
---

Run read-only lint checks without modifying code:

```powershell
cd apps/fastfree_panel; npx eslint -c ./eslint.config.js "./src*/**/*.{ts,js,cjs,mjs,vue}"; cd ../..
cd apps/fastfree_ledger; npx eslint -c ./eslint.config.js "./src*/**/*.{ts,js,cjs,mjs,vue}"; cd ../..
```
