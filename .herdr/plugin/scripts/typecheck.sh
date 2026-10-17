#!/usr/bin/env bash
set -e
echo "=========================================================="
echo "          FastFree TypeCheck (apps/fastfree_ledger)        "
echo "=========================================================="
cd /home/fastfree/Desktop/fastfree/apps/fastfree_ledger
if command -v npx >/dev/null 2>&1; then
    npx vue-tsc --noEmit
else
    echo "npx not found in standard PATH, attempting flox environment..."
    flox activate -d /home/fastfree/Desktop/fastfree -- npx vue-tsc --noEmit
fi
echo "=========================================================="
echo "TypeCheck Finished Successfully! Press Enter to exit."
read -r
