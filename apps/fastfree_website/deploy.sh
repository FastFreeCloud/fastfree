#!/usr/bin/env bash
set -e

SOURCE_DIR="/root/fastfree-source/apps/fastfree_website"
TARGET_DIR="/srv/fastfree-website"

echo "=========================================="
echo "  Deploying FastFree Website (Next.js)    "
echo "=========================================="

mkdir -p "$TARGET_DIR"

if [ ! -d "$SOURCE_DIR/.next/standalone" ]; then
    echo "==> Building Next.js standalone application..."
    cd "$SOURCE_DIR"
    nix-shell -p nodejs_22 pnpm --run "pnpm install && pnpm run build"
fi

echo "==> Syncing standalone server files to $TARGET_DIR..."
cp -rf "$SOURCE_DIR/.next/standalone/." "$TARGET_DIR/"

echo "==> Ensuring node_modules are linked and resolvable..."
if [ -d "$SOURCE_DIR/node_modules" ]; then
    ln -sfn "$SOURCE_DIR/node_modules" "$TARGET_DIR/node_modules"
fi

echo "==> Copying static assets..."
mkdir -p "$TARGET_DIR/.next"
cp -rf "$SOURCE_DIR/.next/static" "$TARGET_DIR/.next/"

if [ -d "$SOURCE_DIR/public" ]; then
    cp -rf "$SOURCE_DIR/public" "$TARGET_DIR/"
fi

echo "==> Restarting fastfree-website & caddy services..."
systemctl restart fastfree-website caddy

echo "==> Verifying service status..."
sleep 2
systemctl status fastfree-website --no-pager

echo "==> Testing local HTTP response on port 9004..."
curl -I http://127.0.0.1:9004 || true

echo "=========================================="
echo "  FastFree Website deployed successfully! "
echo "=========================================="
