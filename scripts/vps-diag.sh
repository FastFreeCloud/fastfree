#!/bin/bash
echo "=== 1. mysql-user service status ==="
systemctl status fastfree-backend-mysql-user.service --no-pager 2>&1 | head -20

echo ""
echo "=== 2. mysql-user service journal ==="
journalctl -u fastfree-backend-mysql-user.service --no-pager -n 30 2>&1

echo ""
echo "=== 3. site_config.json location ==="
find /var/lib/containers/storage/volumes/fastfree-backend-sites/_data -name site_config.json 2>/dev/null

echo ""
echo "=== 4. site_config.json content ==="
cat /var/lib/containers/storage/volumes/fastfree-backend-sites/_data/backend.fastfree.cloud/site_config.json 2>/dev/null | head -20

echo ""
echo "=== 5. MySQL users starting with _4d ==="
mysql -u root -p'Fastfree@2026' -e "SELECT user, host FROM mysql.user WHERE user LIKE '_4d%';" 2>&1

echo ""
echo "=== 6. All MySQL users ==="
mysql -u root -p'Fastfree@2026' -e "SELECT user, host FROM mysql.user;" 2>&1

echo ""
echo "=== 7. Backend container env (DB related) ==="
podman exec fastfree-backend-app env 2>/dev/null | grep -iE 'db|mysql|password' || echo "Cannot exec into container"

echo ""
echo "=== 8. Nix store path for mysql ==="
which mysql 2>/dev/null || find /nix/store -name mysql -type f 2>/dev/null | head -3
