#!/usr/bin/env bash
set -euo pipefail

# FastFree OS CLI — main entry point
# Manages NixOS system updates, backups, and services

CONFIG_NAME=$(cat /etc/fastfree/flake-config 2>/dev/null || echo "")
GITHUB_REPO=$(cat /etc/fastfree/github-repo 2>/dev/null || echo "")
GIT_ORIGIN=$(cat /etc/fastfree/git-origin 2>/dev/null || echo "")

usage() {
  cat <<EOF
FastFree OS — System Management CLI

Usage: fastfree <command> [options]

Commands:
  update        Update the system from the latest flake
  rebuild       Rebuild the current configuration
  status        Show system status and configuration
  backup        Create a backup of the current system
  restore       Restore from a backup
  login         Login to GHCR (container registry)
  doctor        Run system health checks
  version       Show version information

Examples:
  fastfree update
  fastfree status
  fastfree login
EOF
}

cmd_update() {
  echo "Updating FastFree OS..."
  if [ -z "$GITHUB_REPO" ]; then
    echo "Error: GitHub repo not configured" >&2
    exit 1
  fi
  cd /tmp
  if [ ! -d /tmp/fastfree_os ]; then
    git clone "$GITHUB_REPO" /tmp/fastfree_os
  else
    cd /tmp/fastfree_os
    git pull
  fi
  cd /tmp/fastfree_os
  sudo nixos-rebuild switch --flake ".#$CONFIG_NAME"
  echo "Update complete."
}

cmd_rebuild() {
  echo "Rebuilding current configuration..."
  if [ -z "$CONFIG_NAME" ]; then
    echo "Error: Configuration name not found in /etc/fastfree/flake-config" >&2
    exit 1
  fi
  if [ -z "$GIT_ORIGIN" ]; then
    echo "Error: Git origin not configured" >&2
    exit 1
  fi
  cd /tmp
  if [ ! -d /tmp/fastfree_os ]; then
    git clone "$GIT_ORIGIN" /tmp/fastfree_os
  fi
  cd /tmp/fastfree_os
  git pull
  sudo nixos-rebuild switch --flake ".#$CONFIG_NAME"
  echo "Rebuild complete."
}

cmd_status() {
  echo "=== FastFree OS Status ==="
  echo ""
  echo "Configuration: $CONFIG_NAME"
  echo "GitHub Repo:   $GITHUB_REPO"
  echo "Git Origin:    $GIT_ORIGIN"
  echo ""
  echo "System:"
  echo "  Hostname:     $(hostname)"
  echo "  NixOS:        $(nixos-version 2>/dev/null || echo 'unknown')"
  echo "  Kernel:       $(uname -r)"
  echo ""
  echo "Services:"
  systemctl list-units --type=service --state=running --no-pager 2>/dev/null | head -20
}

cmd_backup() {
  echo "Creating system backup..."
  BACKUP_DIR="/var/backups/fastfree"
  mkdir -p "$BACKUP_DIR"
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  echo "Backup location: $BACKUP_DIR/backup_$TIMESTAMP"
  sudo nix-env --list-generations > "$BACKUP_DIR/generations_$TIMESTAMP.txt"
  echo "Backup complete."
}

cmd_login() {
  echo "Logging in to GHCR..."
  TOKEN_FILE="/etc/fastfree/github-token"
  if [ ! -f "$TOKEN_FILE" ]; then
    echo "Error: GitHub token not found at $TOKEN_FILE" >&2
    exit 1
  fi
  TOKEN=$(cat "$TOKEN_FILE")
  ACCOUNT=$(cat /etc/fastfree/github-account 2>/dev/null || echo "")
  if [ -z "$ACCOUNT" ]; then
    echo "Error: GitHub account not configured" >&2
    exit 1
  fi
  echo "$TOKEN" | podman login ghcr.io -u "$ACCOUNT" --password-stdin
  echo "Login complete."
}

cmd_doctor() {
  echo "Running system health checks..."
  echo ""
  CHECKS=0
  PASSED=0
  for svc in sshd mysql podman; do
    CHECKS=$((CHECKS + 1))
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
      echo "  [PASS] $svc is running"
      PASSED=$((PASSED + 1))
    else
      echo "  [FAIL] $svc is not running"
    fi
  done
  echo ""
  echo "Results: $PASSED/$CHECKS checks passed"
}

cmd_version() {
  echo "FastFree OS"
  echo "  Config: $CONFIG_NAME"
  echo "  NixOS:  $(nixos-version 2>/dev/null || echo 'unknown')"
}

case "${1:-help}" in
  update)   cmd_update ;;
  rebuild)  cmd_rebuild ;;
  status)   cmd_status ;;
  backup)   cmd_backup ;;
  restore)  echo "Restore not yet implemented" ;;
  login)    cmd_login ;;
  doctor)   cmd_doctor ;;
  version)  cmd_version ;;
  help|-h|--help) usage ;;
  *)
    echo "Unknown command: $1" >&2
    echo ""
    usage
    exit 1
    ;;
esac
