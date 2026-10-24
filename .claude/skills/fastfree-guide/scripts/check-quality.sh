#!/usr/bin/env bash
set -euo pipefail

# FastFree Quality Check Script (TypeScript vue-tsc & ESLint)
REPO_ROOT="/home/fastfree/Desktop/fastfree"
APP_TARGET="${1:-apps/fastfree_ledger}"

echo "=========================================================="
echo " [FastFree Quality Gate] Checking: $APP_TARGET"
echo "=========================================================="

cd "$REPO_ROOT"

echo ">> 1. Running TypeScript TypeCheck (vue-tsc --noEmit)..."
flox activate -- sh -c "cd '$APP_TARGET' && npx vue-tsc --noEmit"
echo "✅ TypeScript check PASSED (0 errors)!"

echo ">> 2. Running ESLint Check (npm run lint:check)..."
flox activate -- sh -c "cd '$APP_TARGET' && npm run lint:check"
echo "✅ ESLint check PASSED (0 errors, 0 warnings)!"

echo "=========================================================="
echo "🎉 All quality checks PASSED successfully!"
echo "=========================================================="
