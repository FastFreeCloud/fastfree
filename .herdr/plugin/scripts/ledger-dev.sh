#!/usr/bin/env bash
echo "=========================================================="
echo "          Starting FastFree Ledger Dev Server             "
echo "=========================================================="
cd /home/fastfree/Desktop/fastfree/apps/fastfree_ledger
if command -v npm >/dev/null 2>&1; then
    npm run dev
else
    flox activate -d /home/fastfree/Desktop/fastfree -- npm run dev
fi
