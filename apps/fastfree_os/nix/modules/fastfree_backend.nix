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
      before      = [ "podman-fastfree-backend-app.service" ];
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

    # ── 1b. Ensure Frappe MySQL user matches site_config.json ──
    systemd.services."fastfree-backend-mysql-user" = {
      description = "Ensure Frappe MySQL user exists and password matches site_config.json";
      after       = [ "mysql.service" "fastfree-backend-setup.service" ];
      before      = [ "podman-fastfree-backend-app.service" ];
      wantedBy    = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      path = [ pkgs.podman pkgs.coreutils pkgs.gnused ];
      script = let siteName = "backend.${config.fastfree.identity.domain}"; in ''
        for i in $(seq 1 30); do
          if ${config.services.mysql.package}/bin/mysqladmin ping -h localhost --silent 2>/dev/null; then break; fi
          sleep 1
        done

        SITE_CFG="/var/lib/containers/storage/volumes/fastfree-backend-sites/_data/${siteName}/site_config.json"
        if [ ! -f "$SITE_CFG" ]; then
          echo "[mysql-user] site_config.json not found — skipping"
          exit 0
        fi

        FRAPPE_DB_NAME=$(grep -o '"db_name"[[:space:]]*:[[:space:]]*"[^"]*"' "$SITE_CFG" | head -1 | grep -o '"[^"]*"$' | tr -d '"')
        FRAPPE_DB_PASS=$(grep -o '"db_password"[[:space:]]*:[[:space:]]*"[^"]*"' "$SITE_CFG" | head -1 | grep -o '"[^"]*"$' | tr -d '"')

        if [ -z "$FRAPPE_DB_NAME" ] || [ -z "$FRAPPE_DB_PASS" ]; then
          echo "[mysql-user] db_name or db_password empty — skipping"
          exit 0
        fi

        echo "[mysql-user] Ensuring user $FRAPPE_DB_NAME exists with correct password..."

        SQL="CREATE DATABASE IF NOT EXISTS \`$FRAPPE_DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; DROP USER IF EXISTS '$FRAPPE_DB_NAME'@'%'; DROP USER IF EXISTS '$FRAPPE_DB_NAME'@'localhost'; CREATE USER '$FRAPPE_DB_NAME'@'%' IDENTIFIED VIA mysql_native_password USING PASSWORD('$FRAPPE_DB_PASS'); CREATE USER '$FRAPPE_DB_NAME'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('$FRAPPE_DB_PASS'); GRANT ALL PRIVILEGES ON \`$FRAPPE_DB_NAME\`.* TO '$FRAPPE_DB_NAME'@'%'; GRANT ALL PRIVILEGES ON \`$FRAPPE_DB_NAME\`.* TO '$FRAPPE_DB_NAME'@'localhost'; FLUSH PRIVILEGES;"

        ${config.services.mysql.package}/bin/mysql --user=root --password="${pw.mariadbRoot}" -e "$SQL" 2>&1 && echo "[mysql-user] Done." || echo "[mysql-user] FAILED"
      '';
    };

    # ── 2. Ensure fastfree-net network exists with DNS ──
    systemd.services."fastfree-backend-network" = {
      description = "Create fastfree-net podman network with DNS for backend containers";
      wantedBy = [ "multi-user.target" ];
      before = [
        "podman-fastfree-backend-app.service"
        "podman-fastfree-backend-frontend.service"
        "podman-fastfree-backend-websocket.service"
        "podman-fastfree-backend-queue-short.service"
        "podman-fastfree-backend-queue-long.service"
        "podman-fastfree-backend-scheduler.service"
      ];
      serviceConfig.Type = "oneshot";
      script = ''
        # Destroy and recreate network with DNS
        ${pkgs.podman}/bin/podman network rm fastfree-net 2>/dev/null || true
        ${pkgs.podman}/bin/podman network create \
          --driver bridge \
          --subnet 10.89.0.0/24 \
          --dns 10.89.0.1 \
          fastfree-net 2>/dev/null || true
        # Enable DNS on the network (podman 4+ supports this via network reload)
        ${pkgs.podman}/bin/podman network reload fastfree-net 2>/dev/null || true
      '';
    };

    # ── 3. Redis containers ────────────────────────────────
    virtualisation.oci-containers.containers.fastfree-redis-cache = {
      image = "redis:8.6-alpine";
      pull = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" ];
    };

    virtualisation.oci-containers.containers.fastfree-redis-queue = {
      image = "redis:8.6-alpine";
      pull = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" ];
    };

    systemd.services."podman-fastfree-redis-cache" = {
      after = [ "fastfree-backend-network.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };

    systemd.services."podman-fastfree-redis-queue" = {
      after = [ "fastfree-backend-network.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };

    # ── 4+5. Setup site (configure + create in one service) ──
    systemd.services."fastfree-backend-setup" = {
      description = "Configure bench globals and create Frappe site";
      after = [
        "fastfree-backend-network.service"
        "mysql.service"
        "podman-fastfree-redis-cache.service"
        "podman-fastfree-redis-queue.service"
      ];
      requires = [ "mysql.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        Restart = "on-failure";
        RestartSec = "15";
        StartLimitIntervalSec = "300";
        StartLimitBurst = "5";
      };
      path = [ pkgs.podman pkgs.coreutils pkgs.gnused ];
      script = let
        siteName = "backend.${config.fastfree.identity.domain}";
        dbPass = pw.mariadbRoot;
        adminPass = pw.admin;
        ghAcc = ghAccount;
      in ''
        SITE="${siteName}"
        IMAGE="ghcr.io/${ghAcc}/fastfree_backend:latest"

        echo "[setup] Pulling image..."
        ${pkgs.podman}/bin/podman pull --quiet "$IMAGE" || true

        echo "[setup] Running setup container..."
        ${pkgs.podman}/bin/podman run --rm \
          --network fastfree-net \
          --add-host=host.containers.internal:host-gateway \
          -v fastfree-backend-sites:/home/frappe/frappe-bench/sites \
          -v fastfree-backend-logs:/home/frappe/frappe-bench/logs \
          -e "DB_PASSWORD=${dbPass}" \
          -e "ADMIN_PASSWORD=${adminPass}" \
          -e "FRAPPE_SITE_NAME_HEADER=$SITE" \
          "$IMAGE" bash -c '
            set -e
            echo "[setup] Waiting for MariaDB..."
            for i in $(seq 1 60); do
              if mysqladmin ping -h host.containers.internal --silent 2>/dev/null; then break; fi
              if [ "$i" -eq 60 ]; then echo "[setup] ERROR: MariaDB timeout"; exit 1; fi
              sleep 2
            done
            echo "[setup] MariaDB ready."

            echo "[setup] Waiting for Redis..."
            for i in $(seq 1 30); do
              if redis-cli -h fastfree-redis-cache ping 2>/dev/null | grep -q PONG; then break; fi
              if [ "$i" -eq 30 ]; then echo "[setup] WARNING: Redis not reachable, continuing anyway"; fi
              sleep 2
            done

            echo "[setup] Configuring bench globals..."
            bench set-config -g db_host host.containers.internal
            bench set-config -gp db_port 3306
            bench set-config -g redis_cache "redis://fastfree-redis-cache:6379"
            bench set-config -g redis_queue "redis://fastfree-redis-queue:6379"
            bench set-config -g redis_socketio "redis://fastfree-redis-queue:6379"
            bench set-config -gp socketio_port 9000

            echo "[setup] Checking if site $FRAPPE_SITE_NAME_HEADER exists and is healthy..."
            SITE_DIR="/home/frappe/frappe-bench/sites/$FRAPPE_SITE_NAME_HEADER"
            SITE_BROKEN=false
            
            if [ -d "$SITE_DIR" ]; then
              echo "[setup] Site directory exists, checking if apps are installed..."
              # Check if site_config.json exists and has proper DB settings
              if [ ! -f "$SITE_DIR/site_config.json" ]; then
                echo "[setup] WARNING: site_config.json missing — site is broken"
                SITE_BROKEN=true
              elif ! grep -q "db_host" "$SITE_DIR/site_config.json" 2>/dev/null; then
                echo "[setup] WARNING: site_config.json missing db_host — site is broken"
                SITE_BROKEN=true
              fi
              
              # Check if erpnext app is installed
              if [ -d "$SITE_DIR/apps/erpnext" ]; then
                echo "[setup] erpnext app found."
              else
                echo "[setup] WARNING: erpnext app NOT installed — site is broken"
                SITE_BROKEN=true
              fi
              
              if [ "$SITE_BROKEN" = true ]; then
                echo "[setup] Dropping broken site $FRAPPE_SITE_NAME_HEADER..."
                bench drop-site "$FRAPPE_SITE_NAME_HEADER" \
                  --db-root-username=root \
                  --db-root-password="$DB_PASSWORD" || true
                rm -rf "$SITE_DIR" || true
              fi
            fi
            
            if [ ! -d "$SITE_DIR" ] || [ "$SITE_BROKEN" = true ]; then
              echo "[setup] Creating site $FRAPPE_SITE_NAME_HEADER..."
              bench new-site "$FRAPPE_SITE_NAME_HEADER" \
                --mariadb-user-host-login-scope="%" \
                --admin-password="$ADMIN_PASSWORD" \
                --db-root-username=root \
                --db-root-password="$DB_PASSWORD" \
                --install-app erpnext \
                --install-app fastfree_backend \
                --set-default || {
                echo "[setup] bench new-site exited non-zero, checking if site was created anyway..."
                if [ -d "$SITE_DIR" ]; then
                  echo "[setup] Site exists on disk, continuing."
                else
                  echo "[setup] ERROR: Site creation failed."
                  exit 1
                fi
              }
              echo "[setup] Site $FRAPPE_SITE_NAME_HEADER created successfully."
            else
              echo "[setup] Site $FRAPPE_SITE_NAME_HEADER is healthy, skipping creation."
            fi

            echo "[setup] Done."
          '
        echo "[setup] Setup container finished."
      '';
    };

    # ── 6. Backend (Gunicorn) ───────────────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-app = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pull = "always";
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

    systemd.services."podman-fastfree-backend-app" = {
      after = [
        "fastfree-backend-network.service"
        "fastfree-backend-db.service"
        "fastfree-backend-mysql-user.service"
        "fastfree-backend-setup.service"
        "podman-fastfree-redis-cache.service"
        "podman-fastfree-redis-queue.service"
      ];
      requires = [ "mysql.service" "fastfree-backend-setup.service" "fastfree-backend-mysql-user.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };

    # ── 7. Frontend (Nginx) ─────────────────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-frontend = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pull = "always";
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

    systemd.services."podman-fastfree-backend-frontend" = {
      after = [ "fastfree-backend-network.service" "podman-fastfree-backend-app.service" "fastfree-backend-setup.service" ];
      requires = [ "podman-fastfree-backend-app.service" "fastfree-backend-setup.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };

    # ── 8. WebSocket (Socket.IO) ───────────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-websocket = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pull = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" ];
      cmd = [ "node" "/home/frappe/frappe-bench/apps/frappe/socketio.js" ];
      volumes = [
        "fastfree-backend-sites:/home/frappe/frappe-bench/sites"
      ];
    };

    systemd.services."podman-fastfree-backend-websocket" = {
      after = [ 
        "fastfree-backend-network.service" 
        "fastfree-backend-setup.service"
        "podman-fastfree-backend-app.service"
        "podman-fastfree-redis-queue.service"
      ];
      requires = [ "fastfree-backend-setup.service" "mysql.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "10";
      serviceConfig.StartLimitIntervalSec = "300";
      serviceConfig.StartLimitBurst = "10";
    };

    # ── 9. Queue Short (Celery worker) ─────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-queue-short = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pull = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" ];
      cmd = [ "bench" "worker" "--queue" "short,default" ];
      volumes = [
        "fastfree-backend-sites:/home/frappe/frappe-bench/sites"
        "fastfree-backend-logs:/home/frappe/frappe-bench/logs"
      ];
    };

    systemd.services."podman-fastfree-backend-queue-short" = {
      after = [ 
        "fastfree-backend-network.service" 
        "fastfree-backend-setup.service"
        "podman-fastfree-redis-queue.service"
      ];
      requires = [ "mysql.service" "podman-fastfree-redis-queue.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "10";
      serviceConfig.StartLimitIntervalSec = "300";
      serviceConfig.StartLimitBurst = "10";
    };

    # ── 10. Queue Long (Celery worker) ─────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-queue-long = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pull = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" ];
      cmd = [ "bench" "worker" "--queue" "long,default,short" ];
      volumes = [
        "fastfree-backend-sites:/home/frappe/frappe-bench/sites"
        "fastfree-backend-logs:/home/frappe/frappe-bench/logs"
      ];
    };

    systemd.services."podman-fastfree-backend-queue-long" = {
      after = [ 
        "fastfree-backend-network.service" 
        "fastfree-backend-setup.service"
        "podman-fastfree-redis-queue.service"
      ];
      requires = [ "mysql.service" "podman-fastfree-redis-queue.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "10";
      serviceConfig.StartLimitIntervalSec = "300";
      serviceConfig.StartLimitBurst = "10";
    };

    # ── 11. Scheduler ──────────────────────────────────────
    virtualisation.oci-containers.containers.fastfree-backend-scheduler = {
      image = "ghcr.io/${ghAccount}/fastfree_backend:latest";
      pull = "always";
      autoStart = true;
      extraOptions = [ "--network=fastfree-net" ];
      cmd = [ "bench" "schedule" ];
      volumes = [
        "fastfree-backend-sites:/home/frappe/frappe-bench/sites"
        "fastfree-backend-logs:/home/frappe/frappe-bench/logs"
      ];
    };

    systemd.services."podman-fastfree-backend-scheduler" = {
      after = [ 
        "fastfree-backend-network.service" 
        "fastfree-backend-setup.service"
        "podman-fastfree-redis-queue.service"
      ];
      requires = [ "mysql.service" "podman-fastfree-redis-queue.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "10";
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
