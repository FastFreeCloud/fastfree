{ config, lib, pkgs, ... }:

let
  pw = config.fastfree.passwords;
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
in {
  config = lib.mkIf config.fastfree.apps.fastfree_backend {

    # ── 1. Create fastfree_backend DB + user ────────────────
    systemd.services."fastfree-backend-db" = {
      description = "Create FastFree Backend database and user in MariaDB";
      after       = [ "mysql.service" ];
      before      = [ "fastfree-backend-app.service" ];
      wantedBy    = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      script = ''
        for i in $(seq 1 30); do
          if ${config.services.mysql.package}/bin/mysqladmin ping -h localhost --silent 2>/dev/null; then
            break
          fi
          if [ "$i" -eq 30 ]; then
            echo "[fastfree-backend-db] ERROR: MariaDB not ready after 30s"
            exit 1
          fi
          sleep 1
        done
        ${config.services.mysql.package}/bin/mysql <<SQL
          CREATE DATABASE IF NOT EXISTS fastfree_backend;
          CREATE USER IF NOT EXISTS 'fastfree_backend'@'%' IDENTIFIED VIA mysql_native_password USING PASSWORD('${pw.mariadbUser}');
          GRANT ALL PRIVILEGES ON fastfree_backend.* TO 'fastfree_backend'@'%';
          FLUSH PRIVILEGES;
        SQL
      '';
    };

    # ── 2. Shared Podman network ───────────────────────────
    systemd.services."fastfree-backend-network" = {
      description = "Create shared podman network for Backend containers";
      wantedBy = [ "multi-user.target" ];
      before = [
        "fastfree-backend-app.service"
        "fastfree-backend-frontend.service"
        "fastfree-backend-websocket.service"
        "fastfree-backend-queue-short.service"
        "fastfree-backend-queue-long.service"
        "fastfree-backend-scheduler.service"
      ];
      serviceConfig.Type = "oneshot";
      script = ''
        ${pkgs.podman}/bin/podman network inspect fastfree-net >/dev/null 2>&1 || \
          ${pkgs.podman}/bin/podman network create fastfree-net
      '';
    };

    # ── 3. Redis containers ────────────────────────────────
    virtualisation.oci-containers.containers.fastfree-redis-cache = {
      image = "redis:8.6-alpine";
      pullPolicy = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" ];
    };

    virtualisation.oci-containers.containers.fastfree-redis-queue = {
      image = "redis:8.6-alpine";
      pullPolicy = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" ];
    };

    systemd.services."fastfree-redis-cache" = {
      after = [ "fastfree-backend-network.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };

    systemd.services."fastfree-redis-queue" = {
      after = [ "fastfree-backend-network.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };

    # ── 4. Configurator (common_site_config) ────────────────
    virtualisation.oci-containers.containers.fastfree-backend-configurator = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pullPolicy = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" "--add-host=host.containers.internal:host-gateway" ];
      entrypoint = "bash";
      cmd = [ "-c" ''
        ls -1 apps > sites/apps.txt;
        bench set-config -g db_host host.containers.internal;
        bench set-config -gp db_port 3306;
        bench set-config -g redis_cache "redis://fastfree-redis-cache:6379";
        bench set-config -g redis_queue "redis://fastfree-redis-queue:6379";
        bench set-config -g redis_socketio "redis://fastfree-redis-queue:6379";
        bench set-config -gp socketio_port 9000;
      '' ];
      environment = {
        DB_HOST = "host.containers.internal";
        DB_PORT = "3306";
        REDIS_CACHE = "fastfree-redis-cache:6379";
        REDIS_QUEUE = "fastfree-redis-queue:6379";
        SOCKETIO_PORT = "9000";
      };
    };

    systemd.services."fastfree-backend-configurator" = {
      after = [ "fastfree-backend-network.service" "mysql.service" ];
      requires = [ "mysql.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      serviceConfig.RemainAfterExit = true;
    };

    # ── 5. Create site (one-shot) ───────────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-create-site = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pullPolicy = "always";
      autoStart = false;
      extraOptions = [ "--network=fastfree-net" "--add-host=host.containers.internal:host-gateway" ];
      entrypoint = "bash";
      cmd = [ "-c" ''
        set -e
        echo "Waiting for MariaDB...";
        for i in $(seq 1 30); do
          if mysqladmin ping -h host.containers.internal --silent 2>/dev/null; then break; fi
          sleep 2;
        done;
        echo "Waiting for Redis...";
        for i in $(seq 1 15); do
          if redis-cli -h fastfree-redis-cache ping 2>/dev/null | grep -q PONG; then break; fi
          sleep 2;
        done;
        if bench --site $FRAPPE_SITE_NAME_HEADER ping 2>/dev/null; then
          echo "Site already exists, skipping creation.";
        else
          bench new-site \
            --mariadb-user-host-login-scope='%' \
            --admin-password=$ADMIN_PASSWORD \
            --db-root-username=root \
            --db-root-password=$DB_PASSWORD \
            --install-app erpnext \
            --install-app fastfree_backend \
            --set-default $FRAPPE_SITE_NAME_HEADER;
        fi;
      '' ];
      environment = {
        DB_PASSWORD = pw.mariadbRoot;
        ADMIN_PASSWORD = pw.admin;
        FRAPPE_SITE_NAME_HEADER = "backend.${config.fastfree.identity.domain}";
      };
      volumes = [
        "fastfree-backend-sites:/home/frappe/frappe-bench/sites"
        "fastfree-backend-logs:/home/frappe/frappe-bench/logs"
      ];
    };

    systemd.services."fastfree-backend-create-site" = {
      after = [
        "fastfree-backend-network.service"
        "mysql.service"
        "fastfree-backend-configurator.service"
        "fastfree-redis-cache.service"
        "fastfree-redis-queue.service"
      ];
      requires = [ "mysql.service" "fastfree-backend-configurator.service" ];
      serviceConfig.Type = "oneshot";
      serviceConfig.RemainAfterExit = true;
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "10";
    };

    # ── 6. Backend (Gunicorn) ───────────────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-app = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pullPolicy = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" "--add-host=host.containers.internal:host-gateway" ];
      environment = {
        GUNICORN_THREADS = "4";
        GUNICORN_WORKERS = "2";
        GUNICORN_TIMEOUT = "120";
      };
      volumes = [
        "fastfree-backend-sites:/home/frappe/frappe-bench/sites"
        "fastfree-backend-logs:/home/frappe/frappe-bench/logs"
      ];
    };

    systemd.services."fastfree-backend-app" = {
      after = [
        "fastfree-backend-network.service"
        "fastfree-backend-db.service"
        "fastfree-backend-create-site.service"
        "fastfree-redis-cache.service"
        "fastfree-redis-queue.service"
      ];
      requires = [ "mysql.service" "fastfree-backend-create-site.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };

    # ── 7. Frontend (Nginx) ─────────────────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-frontend = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pullPolicy = "always";
      autoStart = true;
      ports = [ "8080:8080" ];
      extraOptions = [ "--network=fastfree-net" ];
      cmd = [ "nginx-entrypoint.sh" ];
      environment = {
        BACKEND = "fastfree-backend-app:8000";
        SOCKETIO = "fastfree-backend-websocket:9000";
        FRAPPE_SITE_NAME_HEADER = "backend.${config.fastfree.identity.domain}";
        UPSTREAM_REAL_IP_ADDRESS = "127.0.0.1";
        UPSTREAM_REAL_IP_HEADER = "X-Forwarded-For";
        UPSTREAM_REAL_IP_RECURSIVE = "off";
        PROXY_READ_TIMEOUT = "120";
        CLIENT_MAX_BODY_SIZE = "50m";
      };
      volumes = [
        "fastfree-backend-sites:/home/frappe/frappe-bench/sites"
      ];
    };

    systemd.services."fastfree-backend-frontend" = {
      after = [ "fastfree-backend-network.service" "fastfree-backend-app.service" ];
      requires = [ "fastfree-backend-app.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };

    # ── 8. WebSocket (Socket.IO) ───────────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-websocket = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pullPolicy = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" ];
      cmd = [ "node" "/home/frappe/frappe-bench/apps/frappe/socketio.js" ];
      volumes = [
        "fastfree-backend-sites:/home/frappe/frappe-bench/sites"
      ];
    };

    systemd.services."fastfree-backend-websocket" = {
      after = [ "fastfree-backend-network.service" "fastfree-backend-configurator.service" "fastfree-backend-create-site.service" ];
      requires = [ "fastfree-backend-create-site.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };

    # ── 9. Queue Short (Celery worker) ─────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-queue-short = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pullPolicy = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" ];
      cmd = [ "bench" "worker" "--queue" "short,default" ];
      volumes = [
        "fastfree-backend-sites:/home/frappe/frappe-bench/sites"
        "fastfree-backend-logs:/home/frappe/frappe-bench/logs"
      ];
    };

    systemd.services."fastfree-backend-queue-short" = {
      after = [ "fastfree-backend-network.service" "fastfree-backend-create-site.service" ];
      requires = [ "mysql.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };

    # ── 10. Queue Long (Celery worker) ─────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-queue-long = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pullPolicy = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" ];
      cmd = [ "bench" "worker" "--queue" "long,default,short" ];
      volumes = [
        "fastfree-backend-sites:/home/frappe/frappe-bench/sites"
        "fastfree-backend-logs:/home/frappe/frappe-bench/logs"
      ];
    };

    systemd.services."fastfree-backend-queue-long" = {
      after = [ "fastfree-backend-network.service" "fastfree-backend-create-site.service" ];
      requires = [ "mysql.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };

    # ── 11. Scheduler ──────────────────────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-scheduler = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pullPolicy = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" ];
      cmd = [ "bench" "schedule" ];
      volumes = [
        "fastfree-backend-sites:/home/frappe/frappe-bench/sites"
        "fastfree-backend-logs:/home/frappe/frappe-bench/logs"
      ];
    };

    systemd.services."fastfree-backend-scheduler" = {
      after = [ "fastfree-backend-network.service" "fastfree-backend-create-site.service" ];
      requires = [ "mysql.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };

    # ── 12. Backup ──────────────────────────────────────────
    systemd.tmpfiles.rules = [
      "d /var/lib/fastfree/backups 0750 root root -"
    ];

    systemd.services."fastfree-backend-backup" = {
      description = "Automated daily backup of Backend database";
      after = [ "mysql.service" ];
      requires = [ "mysql.service" ];
      path = [ pkgs.mariadb pkgs.gzip ];
      serviceConfig.Type = "oneshot";
      script = ''
        set -e
        DB_HOST="localhost"
        DB_USER="fastfree_backend"
        DB_PASS="${pw.mariadbUser}"
        DB_NAME="fastfree_backend"

        BACKUP_DIR="/var/lib/fastfree/backups"
        mkdir -p "$BACKUP_DIR"

        TIMESTAMP=$(date +%Y%m%d_%H%M%S_%p)
        FILENAME="fastfree_backend_backup_''${TIMESTAMP}.sql.gz"
        FILEPATH="$BACKUP_DIR/$FILENAME"

        MYCNF=$(mktemp /tmp/.my-backend-backup-XXXXXX.cnf)
        chmod 600 "$MYCNF"
        cat > "$MYCNF" << EOF
        [client]
        password=$DB_PASS
        EOF

        mysqldump -h "$DB_HOST" -u "$DB_USER" --defaults-extra-file "$MYCNF" \
          --single-transaction --routines --triggers --events \
          --add-drop-table --complete-insert "$DB_NAME" 2>/dev/null \
          | gzip -9 > "$FILEPATH"

        rm -f "$MYCNF"

        cd "$BACKUP_DIR"
        ls -1t fastfree_backend_backup_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm -f

        echo "Backup completed: $FILENAME ($(stat -c%s "$FILEPATH") bytes)"
      '';
    };

    systemd.timers."fastfree-backend-backup" = {
      description = "Run Backend backup daily at 04:00";
      wantedBy = [ "timers.target" ];
      timerConfig = {
        OnCalendar = "*-*-* 04:00:00";
        Persistent = true;
        RandomizedDelaySec = "15min";
      };
    };
  };
}
