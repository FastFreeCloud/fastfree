---
name: quasar-quality-gates
description: Run Quasar prepare, vue-tsc typecheck, and lint across the four apps (pos, erp, hr, ledger) before any push or tag. Use for validation failures and pre-push checks.
---

# Quasar Quality Gates

Run from the **repo root**. All four apps must show **0 errors, 0 warnings** before push/tag.

## Commands

```powershell
pnpm install --no-frozen-lockfile --ignore-scripts
pnpm --filter fastfree_pos exec quasar prepare
pnpm --filter fastfree_erp exec quasar prepare
pnpm --filter fastfree_hr exec quasar prepare
pnpm --filter fastfree_ledger exec quasar prepare
cd apps/fastfree_pos; npx vue-tsc --noEmit; npm run lint:check; cd ../..
# repeat for fastfree_erp, fastfree_hr, fastfree_ledger
```

Short form per app (`apps/fastfree_ledger` is the canonical host):

```powershell
cd apps/fastfree_ledger
npx vue-tsc --noEmit
npm run lint:check   # prettier + eslint, max-warnings 0
npm run dev          # :9000/9001/9002
```

## First-aid fixes

| Failure | Fix |
|---------|-----|
| Missing `.quasar/tsconfig.json` | `mkdir -p .quasar; echo '{"compilerOptions":{}}' > .quasar/tsconfig.json; pnpm exec quasar prepare --silent` |
| `ERR_FS_FILE_OUTSIDE_ROOT` (Vite) | add `extendViteConf.server.fs.allow` (see `apps/fastfree_ledger/README.md` pitfalls) |
| `process.env` in client code | use `import.meta.env` instead |
| `console.error` in code | remove it — lint fails on it |
| Missing `aria-label` on interactive elements | add it — required |

## CI equivalent

`.github/workflows/00-validate-all.yaml` (`workflow_dispatch`) runs the same matrix.
Monitor runs: `gh run list --limit 10`, `gh run watch <id>`.

## Rules

- Never push/tag with red gates. Fix, re-run, then push.
- `npm run lint` (with auto-fix) is allowed locally, but review the diff before committing.
- Details per package live in `packages/*/AGENTS.md` — link, don't paste.
