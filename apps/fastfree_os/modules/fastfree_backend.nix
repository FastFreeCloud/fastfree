{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
  # Secrets via Clan vars (only .path interpolated, never values).
  dbRootPassFile = config.clan.core.vars.generators.mariadb-root.files.password.path;
  dbUserPassFile = config.clan.core.vars.generators.fastfree-backend.files.db-password.path;
  frappeAdminPassFile = config.clan.core.vars.generators.fastfree-backend.files.admin-password.path;
  siteName = "backend.${config.fastfree.identity.domain}";

  # Native FHS runtime environment for Frappe Bench
  frappeFHS = pkgs.buildFHSEnv {
    name = "frappe-env";
    targetPkgs = pkgs: (with pkgs; [
      python311
      python311Packages.pip
      python311Packages.virtualenv
      python311Packages.setuptools
      python311Packages.wheel
      nodejs_22
      git
      mariadb
      mariadb-connector-c
      gcc
      gnumake
      pkg-config
      libffi
      openssl
      zlib
      redis
      curl
      gnused
      gawk
      coreutils
      bash
      which
      patch
      stdenv.cc.cc.lib
      procps
      findutils
      jq
    ]);
    runScript = "bash";
  };
in {
  config = lib.mkIf config.fastfree.apps.fastfree_backend {

    # ── Secrets (Clan vars generators, no prompts) ──────────
    clan.core.vars.generators.fastfree-backend = {
      files.db-password.secret = true;
      files.db-password.neededFor = "services";
      files.admin-password.secret = true;
      files.admin-password.neededFor = "services";
      runtimeInputs = [ pkgs.openssl ];
      script = ''
        openssl rand -hex 24 > $out/db-password
        openssl rand -hex 24 > $out/admin-password
      '';
    };

    # ── Native Redis Services ──────────────────────────────
    services.redis.servers."fastfree-redis-cache" = {
      enable = true;
      bind = "127.0.0.1";
      port = 11000;
    };

    services.redis.servers."fastfree-redis-queue" = {
      enable = true;
      bind = "127.0.0.1";
      port = 11001;
    };

    # ── Dedicated System User & Group ──────────────────────
    users.users.frappe = {
      isSystemUser = true;
      group = "frappe";
      home = "/var/lib/frappe";
      createHome = true;
      description = "Frappe Bench system user";
      shell = "${pkgs.bash}/bin/bash";
    };

    users.groups.frappe = {};

    # Allow Caddy to access Frappe sites assets
    users.users.caddy.extraGroups = lib.mkIf config.fastfree.apps.caddy [ "frappe" ];

    # ── Runtime dynamic linker support (nix-ld) ────────────
    programs.nix-ld.enable = true;
    programs.nix-ld.libraries = with pkgs; [
      stdenv.cc.cc.lib
      zlib
      openssl
      libffi
      mariadb-connector-c
      mariadb
      curl
    ];

    # ── State for borgbackup: frappe sites directly ────────
    clan.core.state."fastfree-backend" = {
      folders = [
        "/var/lib/frappe/frappe-bench/sites"
      ];
      preRestoreScript = ''
        systemctl stop fastfree-backend-web.service fastfree-backend-websocket.service fastfree-backend-worker-short.service fastfree-backend-worker-long.service fastfree-backend-scheduler.service 2>/dev/null || true
      '';
      postRestoreScript = ''
        systemctl start fastfree-backend-web.service fastfree-backend-websocket.service fastfree-backend-worker-short.service fastfree-backend-worker-long.service fastfree-backend-scheduler.service 2>/dev/null || true
      '';
    };

    # ── Ensure directory permissions ───────────────────────
    systemd.tmpfiles.rules = [
      "d /var/lib/frappe 0755 frappe frappe -"
      "d /var/lib/frappe/frappe-bench 0755 frappe frappe -"
      "d /var/lib/frappe/frappe-bench/sites 0755 frappe frappe -"
      "d /var/lib/frappe/frappe-bench/logs 0755 frappe frappe -"
      "d /var/lib/frappe/frappe-bench/config 0755 frappe frappe -"
      "d /var/lib/fastfree/backups 0750 root root -"
    ];

    # ── 1. Create fastfree_backend DB + user ────────────────
    systemd.services."fastfree-backend-db" = {
      description = "Create FastFree Backend database and user in MariaDB";
      after       = [ "mysql.service" ];
      before      = [ "fastfree-backend-setup.service" ];
      wantedBy    = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
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
        ROOT_PASS=$(cat "${dbRootPassFile}")
        USER_PASS=$(cat "${dbUserPassFile}")
        ${config.services.mysql.package}/bin/mysql <<SQL
          CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('$ROOT_PASS');
          GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
          FLUSH PRIVILEGES;
          CREATE DATABASE IF NOT EXISTS fastfree_backend;
          CREATE USER IF NOT EXISTS 'fastfree_backend'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('$USER_PASS');
          GRANT ALL PRIVILEGES ON fastfree_backend.* TO 'fastfree_backend'@'localhost';
          FLUSH PRIVILEGES;
        SQL
      '';
    };

    # ── 1b. Ensure Frappe MySQL user matches site_config.json ──
    systemd.services."fastfree-backend-mysql-user" = {
      description = "Ensure Frappe MySQL user exists and password matches site_config.json";
      after       = [ "mysql.service" "fastfree-backend-setup.service" ];
      before      = [ "fastfree-backend-web.service" ];
      wantedBy    = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      path = [ pkgs.coreutils pkgs.gnused ];
      script = ''
        for i in $(seq 1 30); do
          if ${config.services.mysql.package}/bin/mysqladmin ping -h localhost --silent 2>/dev/null; then break; fi
          sleep 1
        done

        SITE_CFG="/var/lib/frappe/frappe-bench/sites/${siteName}/site_config.json"
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
        SQL="DROP USER IF EXISTS '$FRAPPE_DB_NAME'@'localhost'; CREATE USER '$FRAPPE_DB_NAME'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('$FRAPPE_DB_PASS'); GRANT ALL PRIVILEGES ON \`$FRAPPE_DB_NAME\`.* TO '$FRAPPE_DB_NAME'@'localhost'; FLUSH PRIVILEGES;"

        ROOT_PW=$(cat "${dbRootPassFile}")
        ${config.services.mysql.package}/bin/mysql --user=root --password="$ROOT_PW" -e "$SQL" 2>&1 && echo "[mysql-user] Done." || echo "[mysql-user] FAILED"
      '';
    };

    # ── 2. Setup site (configure globals + ensure site exists + bench migrate) ──
    systemd.services."fastfree-backend-setup" = {
      description = "Configure bench globals and ensure Frappe site exists";
      after = [
        "mysql.service"
        "fastfree-backend-db.service"
        "redis-fastfree-redis-cache.service"
        "redis-fastfree-redis-queue.service"
      ];
      requires = [
        "mysql.service"
        "fastfree-backend-db.service"
        "redis-fastfree-redis-cache.service"
        "redis-fastfree-redis-queue.service"
      ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        Restart = "on-failure";
        RestartSec = "15";
        StartLimitIntervalSec = "300";
        StartLimitBurst = "5";
        User = "frappe";
        Group = "frappe";
        WorkingDirectory = "/var/lib/frappe/frappe-bench";
      };
      path = [ pkgs.coreutils pkgs.gnused pkgs.jq pkgs.curl pkgs.git ];
      script = ''
        SITE="${siteName}"
        DB_PASSWORD=$(cat "${dbRootPassFile}")
        ADMIN_PASSWORD=$(cat "${frappeAdminPassFile}")
        BENCH_DIR="/var/lib/frappe/frappe-bench"
        SITES_DIR="$BENCH_DIR/sites"
        COMMON_CFG="$SITES_DIR/common_site_config.json"

        echo "[setup] Waiting for MariaDB..."
        for i in $(seq 1 60); do
          if ${config.services.mysql.package}/bin/mysqladmin ping -h localhost --silent 2>/dev/null; then break; fi
          if [ "$i" -eq 60 ]; then echo "[setup] ERROR: MariaDB timeout"; exit 1; fi
          sleep 1
        done

        echo "[setup] Waiting for Redis servers..."
        for i in $(seq 1 30); do
          if ${pkgs.redis}/bin/redis-cli -h 127.0.0.1 -p 11000 ping 2>/dev/null | grep -q PONG && \
             ${pkgs.redis}/bin/redis-cli -h 127.0.0.1 -p 11001 ping 2>/dev/null | grep -q PONG; then
            break
          fi
          if [ "$i" -eq 30 ]; then echo "[setup] WARNING: Redis timeout, continuing"; fi
          sleep 1
        done

        mkdir -p "$SITES_DIR" "$BENCH_DIR/logs" "$BENCH_DIR/config"

        echo "[setup] Writing / updating common_site_config.json..."
        if [ ! -f "$COMMON_CFG" ]; then
          cat > "$COMMON_CFG" << 'EOF'
{
  "db_host": "127.0.0.1",
  "db_port": 3306,
  "redis_cache": "redis://127.0.0.1:11000",
  "redis_queue": "redis://127.0.0.1:11001",
  "redis_socketio": "redis://127.0.0.1:11001",
  "socketio_port": 9000,
  "webserver_port": 8000
}
EOF
        else
          TMP_CFG=$(mktemp)
          ${pkgs.jq}/bin/jq '
            .db_host = "127.0.0.1" |
            .db_port = 3306 |
            .redis_cache = "redis://127.0.0.1:11000" |
            .redis_queue = "redis://127.0.0.1:11001" |
            .redis_socketio = "redis://127.0.0.1:11001" |
            .socketio_port = 9000 |
            .webserver_port = 8000
          ' "$COMMON_CFG" > "$TMP_CFG" && mv "$TMP_CFG" "$COMMON_CFG"
          chmod 644 "$COMMON_CFG"
        fi

        echo "[setup] Executing bench setup via FHS environment..."
        ${frappeFHS}/bin/frappe-env -c "
          set -e
          cd \"$BENCH_DIR\"

          # Ensure python virtual environment exists
          if [ ! -d \"$BENCH_DIR/env\" ]; then
            echo '[setup] Initializing Python virtualenv...'
            python3 -m venv \"$BENCH_DIR/env\"
            ./env/bin/pip install --upgrade pip setuptools wheel
          fi

          source env/bin/activate

          SITE_DIR=\"$SITES_DIR/$SITE\"
          if [ -d \"$SITE_DIR\" ] && [ -f \"$SITE_DIR/site_config.json\" ]; then
            echo '[setup] Existing site detected for $SITE. Running bench migrate...'
            # Ensure site config points to localhost
            sed -i 's/\"db_host\"[[:space:]]*:[[:space:]]*\"[^\"]*\"/\"db_host\": \"127.0.0.1\"/' \"$SITE_DIR/site_config.json\"
            bench --site \"$SITE\" set-config db_host 127.0.0.1 || true
            bench --site \"$SITE\" set-config db_port 3306 || true
            bench --site \"$SITE\" migrate || echo '[setup] Warning: bench migrate had non-zero exit code'
          else
            echo '[setup] Site $SITE not found or uninitialized.'
            if command -v bench >/dev/null 2>&1; then
              echo '[setup] Creating new Frappe site $SITE...'
              INSTALL_ARGS=\"\"
              [ -d \"$BENCH_DIR/apps/erpnext\" ] && INSTALL_ARGS=\"\$INSTALL_ARGS --install-app erpnext\"
              [ -d \"$BENCH_DIR/apps/fastfree_backend\" ] && INSTALL_ARGS=\"\$INSTALL_ARGS --install-app fastfree_backend\"
              bench new-site \"$SITE\" \
                --mariadb-user-host-login-scope=\"localhost\" \
                --admin-password=\"$ADMIN_PASSWORD\" \
                --db-root-username=root \
                --db-root-password=\"$DB_PASSWORD\" \
                \$INSTALL_ARGS \
                --set-default || echo '[setup] bench new-site completed with exit code: \$?'
            else
              echo '[setup] bench executable not yet installed in env; skipping bench new-site.'
            fi
          fi

          # Ensure assets directory is linked or created for Caddy
          mkdir -p \"$SITES_DIR/assets\"
          if command -v bench >/dev/null 2>&1; then
            bench build --force 2>/dev/null || true
          fi
        "

        echo "[setup] Done."
      '';
    };

    # ── 3. Backend (Gunicorn Web Server on 127.0.0.1:8000) ───
    systemd.services."fastfree-backend-web" = {
      description = "FastFree Backend Web (Gunicorn)";
      after = [
        "network.target"
        "fastfree-backend-setup.service"
        "fastfree-backend-mysql-user.service"
        "redis-fastfree-redis-cache.service"
      ];
      requires = [
        "fastfree-backend-setup.service"
      ];
      wantedBy = [ "multi-user.target" ];
      environment = {
        FRAPPE_SITE_NAME_HEADER = siteName;
        PYTHONUNBUFFERED = "1";
      };
      serviceConfig = {
        Type = "simple";
        User = "frappe";
        Group = "frappe";
        WorkingDirectory = "/var/lib/frappe/frappe-bench";
        Restart = "always";
        RestartSec = "5";
        ExecStart = ''
          ${frappeFHS}/bin/frappe-env -c "
            cd /var/lib/frappe/frappe-bench
            [ -f env/bin/activate ] && source env/bin/activate
            if command -v gunicorn >/dev/null 2>&1; then
              exec gunicorn -b 127.0.0.1:8000 -w 2 -t 120 --threads 4 -e FRAPPE_SITE_NAME_HEADER=${siteName} frappe.app:application --preload
            else
              exec bench serve --port 8000
            fi
          "
        '';
      };
    };

    # ── 4. WebSocket (SocketIO on 127.0.0.1:9000) ────────────
    systemd.services."fastfree-backend-websocket" = {
      description = "FastFree Backend SocketIO Service";
      after = [
        "network.target"
        "fastfree-backend-setup.service"
        "redis-fastfree-redis-queue.service"
      ];
      requires = [
        "fastfree-backend-setup.service"
      ];
      wantedBy = [ "multi-user.target" ];
      environment = {
        NODE_ENV = "production";
      };
      serviceConfig = {
        Type = "simple";
        User = "frappe";
        Group = "frappe";
        WorkingDirectory = "/var/lib/frappe/frappe-bench";
        Restart = "always";
        RestartSec = "5";
        ExecStart = ''
          ${frappeFHS}/bin/frappe-env -c "
            cd /var/lib/frappe/frappe-bench
            exec node apps/frappe/socketio.js
          "
        '';
      };
    };

    # ── 5. Queue Worker Short ────────────────────────────────
    systemd.services."fastfree-backend-worker-short" = {
      description = "FastFree Backend Worker Short";
      after = [
        "network.target"
        "fastfree-backend-setup.service"
        "redis-fastfree-redis-queue.service"
      ];
      requires = [
        "fastfree-backend-setup.service"
      ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "simple";
        User = "frappe";
        Group = "frappe";
        WorkingDirectory = "/var/lib/frappe/frappe-bench";
        Restart = "always";
        RestartSec = "10";
        ExecStart = ''
          ${frappeFHS}/bin/frappe-env -c "
            cd /var/lib/frappe/frappe-bench
            [ -f env/bin/activate ] && source env/bin/activate
            exec bench worker --queue short,default
          "
        '';
      };
    };

    # ── 6. Queue Worker Long ─────────────────────────────────
    systemd.services."fastfree-backend-worker-long" = {
      description = "FastFree Backend Worker Long";
      after = [
        "network.target"
        "fastfree-backend-setup.service"
        "redis-fastfree-redis-queue.service"
      ];
      requires = [
        "fastfree-backend-setup.service"
      ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "simple";
        User = "frappe";
        Group = "frappe";
        WorkingDirectory = "/var/lib/frappe/frappe-bench";
        Restart = "always";
        RestartSec = "10";
        ExecStart = ''
          ${frappeFHS}/bin/frappe-env -c "
            cd /var/lib/frappe/frappe-bench
            [ -f env/bin/activate ] && source env/bin/activate
            exec bench worker --queue long,default,short
          "
        '';
      };
    };

    # ── 7. Scheduler ─────────────────────────────────────────
    systemd.services."fastfree-backend-scheduler" = {
      description = "FastFree Backend Scheduler";
      after = [
        "network.target"
        "fastfree-backend-setup.service"
        "redis-fastfree-redis-queue.service"
      ];
      requires = [
        "fastfree-backend-setup.service"
      ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "simple";
        User = "frappe";
        Group = "frappe";
        WorkingDirectory = "/var/lib/frappe/frappe-bench";
        Restart = "always";
        RestartSec = "10";
        ExecStart = ''
          ${frappeFHS}/bin/frappe-env -c "
            cd /var/lib/frappe/frappe-bench
            [ -f env/bin/activate ] && source env/bin/activate
            exec bench schedule
          "
        '';
      };
    };

    # ── 8. Backup ───────────────────────────────────────────
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
        DB_PASS=$(cat "${dbUserPassFile}")
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

        mysqldump -h "$DB_HOST" -u "$DB_USER" --defaults-extra-file="$MYCNF" \
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
