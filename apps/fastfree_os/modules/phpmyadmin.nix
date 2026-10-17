{ config, lib, pkgs, ... }:

let
  docroot = pkgs.runCommand "db-admin-docroot" {} ''
    mkdir -p $out
    ln -s ${pkgs.adminer}/share/adminer/adminer.php $out/index.php
  '';
in
{
  config = lib.mkIf config.fastfree.apps.phpmyadmin {

    # Native Database Admin web service running on 127.0.0.1:8082 (Zero Podman)
    systemd.services.phpmyadmin = {
      description = "Database Admin Web Interface";
      after = [ "network.target" "mysql.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "simple";
        DynamicUser = true;
        Restart = "on-failure";
        RestartSec = "5s";
        ExecStart = "${pkgs.php.withExtensions ({ enabled, all }: enabled ++ [ all.mysqli all.session ])}/bin/php -S 127.0.0.1:8082 -t ${docroot}";
      };
    };
  };
}
