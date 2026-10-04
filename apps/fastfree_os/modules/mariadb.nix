{ config, lib, pkgs, ... }:

{
  config = lib.mkIf config.fastfree.apps.mariadb {

    # DB root password via Clan vars (official sops/age backend).
    # Value kept as before (Fastfree@2026) — only the storage is new.
    # Set with: clan vars set <machine> mariadb-root/password
    clan.core.vars.generators.mariadb-root = {
      files.password.secret = true;
      files.password.neededFor = "services";
      prompts.password.description = "MariaDB root password";
      prompts.password.type = "hidden";
      prompts.password.persist = false;
      script = ''
        cat $prompts/password > $out/password
      '';
      runtimeInputs = [ pkgs.coreutils ];
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
  };
}
