#!/usr/bin/env bash
set -euo pipefail

# FastFree Clan 26.05 Operations & Audit Script
CLAN_DIR="/home/fastfree/Desktop/fastfree/apps/fastfree_os"
ACTION="${1:-audit}"

cd "$CLAN_DIR"

case "$ACTION" in
  audit)
    echo "=========================================================="
    echo " [Clan 26.05 Audit] Validating Flake, Inventory, & Config"
    echo "=========================================================="
    echo ">> 1. Parsing Flake & Clan syntax..."
    nix-instantiate --parse flake.nix clan.nix machines/*/configuration.nix > /dev/null
    echo "✅ Syntax valid!"

    echo ">> 2. Evaluating machines in inventory..."
    nix eval .#clan.inventory.machines --apply 'builtins.attrNames'
    echo "✅ Machines inventory valid!"

    echo ">> 3. Checking official instances..."
    nix eval .#clan.inventory.instances --apply 'builtins.attrNames'
    echo "✅ Official services valid!"
    ;;

  vars)
    echo ">> Checking Clan vars and secrets..."
    clan vars check
    ;;

  deploy)
    TARGET="${2:-client2}"
    echo ">> Deploying machine: $TARGET ..."
    clan machines update "$TARGET"
    ;;

  *)
    echo "Usage: $0 {audit|vars|deploy [machine]}"
    exit 1
    ;;
esac
