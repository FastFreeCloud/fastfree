{ config, lib, ... }:

let
  pw = config.fastfree.passwords;
in {
  config = lib.mkIf config.fastfree.apps.phpmyadmin {

    virtualisation.oci-containers.containers.phpmyadmin = {
      image = "docker.io/phpmyadmin:5.2.1";
      pull = "always";
      autoStart = true;
      ports = [ "8082:80" ];
      extraOptions = [
        "--add-host=host.containers.internal:host-gateway"
      ];
      environment = {
        TZ = config.fastfree.extra.timezone;
        MYSQL_ROOT_PASSWORD = pw.mariadbRoot;
        PMA_HOST = "host.containers.internal";
        PMA_PORT = "3306";
        UPLOAD_LIMIT = "50M";
      };
    };

    systemd.services."phpmyadmin" = {
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };
  };
}
