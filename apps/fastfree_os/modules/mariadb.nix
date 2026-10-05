{ config, lib, pkgs, ... }:

{
  config = lib.mkIf config.fastfree.apps.mariadb {

    # DB credentials via Clan vars (official sops/age backend).
    # Fully non-interactive: NO prompts — random values from openssl
    # (official pattern: docs/guides/vars/vars-advanced-examples).
    # Stored encrypted in vars/, deployed to /run/secrets.
    # pma-env derives from the same value (docs: combine related files
    # in one generator) for phpmyadmin's environmentFiles.
    clan.core.vars.generators.mariadb-root = {
      files.password.secret = true;
      files.password.neededFor = "services";
      files.pma-env.secret = true;
      files.pma-env.neededFor = "services";
      runtimeInputs = [ pkgs.openssl ];
      script = ''
        openssl rand -hex 24 > $out/password
        printf 'MYSQL_ROOT_PASSWORD=%s\n' "$(cat $out/password)" > $out/pma-env
      '';
    };

    services.mysql = {
      enable = true;
      package = lib.mkForce pkgs.mariadb;
      settings.mysqld = {
        port = 3306;
        bind-address = "0.0.0.0";
        "skip-name-resolve" = true;
        "max-connect-errors" = "10000";
      };
    };

    # Runtime DB init (replaces build-time initialScript so the password
    # never bakes into /nix/store). Idempotent: IF NOT EXISTS + GRANT.
    systemd.services.mariadb-init = {
      description = "Initialize MariaDB root users from vars secret";
      wantedBy = [ "multi-user.target" ];
      after = [ "mysql.service" ];
      requires = [ "mysql.service" ];
      environment.MYSQL_UNIX_PORT = "/run/mysqld/mysqld.sock";
      script = ''
        PASS=$(cat "${config.clan.core.vars.generators.mariadb-root.files.password.path}")
        ${config.services.mysql.package}/bin/mysql -u root -e "
          CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('$PASS');
          CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED VIA mysql_native_password USING PASSWORD('$PASS');
          GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
          GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
          FLUSH PRIVILEGES;"
      '';
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
    };

    systemd.services.mysql.serviceConfig.ExecStop =
      lib.mkForce "${config.services.mysql.package}/bin/mysqladmin shutdown";

    # ── State for borgbackup (every mariadb machine) ────────
    # Online dump via mariadb-dump (no service stop); the dump folder is
    # part of state so borg archives it; postBackupScript cleans staging.
    clan.core.state."mariadb" = {
      folders = [ "/var/lib/mysql" "/var/lib/mariadb-dump" ];
      preBackupScript = ''
        mkdir -p /var/lib/mariadb-dump
        MYSQL_PWD=$(cat "${config.clan.core.vars.generators.mariadb-root.files.password.path}") \
          ${config.services.mysql.package}/bin/mariadb-dump --all-databases --single-transaction --quick > /var/lib/mariadb-dump/all-databases.sql
      '';
      postBackupScript = ''
        rm -f /var/lib/mariadb-dump/all-databases.sql
      '';
      # Restore safety (docs: reference/clan.core/state): stop MySQL while
      # files are replaced, start it afterwards. Never restore onto live InnoDB.
      preRestoreScript = ''
        systemctl stop mysql.service 2>/dev/null || true
      '';
      postRestoreScript = ''
        systemctl start mysql.service 2>/dev/null || true
      '';
    };
  };
}
