#!/usr/bin/env bash
set -e
echo "=========================================================="
echo "          FastFree Lint Check (apps/fastfree_ledger)       "
echo "=========================================================="
cd /home/fastfree/Desktop/fastfree/apps/fastfree_ledger
if command -v npm >/dev/null 2>&1; then
    npm run lint:check
else
    flox activate -d /home/fastfree/Desktop/fastfree -- npm run lint:check
fi
echo "=========================================================="
echo "Lint Check Finished! Press Enter to exit."
read -r
