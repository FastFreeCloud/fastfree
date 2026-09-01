{ config, lib, pkgs, ... }:

let
  pw = config.fastfree.passwords;
in {
  config = lib.mkIf config.fastfree.apps.mariadb {

    services.mysql = {
      enable = true;
      package = lib.mkForce pkgs.mariadb;
      settings.mysqld = {
        port = 3306;
        bind-address = "0.0.0.0";
        "skip-name-resolve" = true;
        "max-connect-errors" = "10000";
      };
      initialScript = pkgs.writeText "mariadb-init.sql" ''
        DROP DATABASE IF EXISTS test;
        CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('${pw.mariadbRoot}');
        CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED VIA mysql_native_password USING PASSWORD('${pw.mariadbRoot}');
        GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
        GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
        FLUSH PRIVILEGES;
      '';
    };

    systemd.services.mysql.serviceConfig.ExecStop =
      lib.mkForce "${config.services.mysql.package}/bin/mysqladmin shutdown";
  };
}
