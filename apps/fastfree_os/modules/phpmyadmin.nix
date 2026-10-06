{ config, lib, ... }:

{
  config = lib.mkIf config.fastfree.apps.phpmyadmin {

    # DB root password via the mariadb vars generator (same machine).
    # environmentFiles are read by podman at service start from
    # /run/secrets — the value never enters /nix/store.
    # Requires fastfree.apps.mariadb on the same machine.
    virtualisation.oci-containers.containers.phpmyadmin = {
      image = "docker.io/phpmyadmin:5.2.1";
      # Pinned tag on quota-limited docker.io: pull once, never on every
      # restart (2026-10-05: pull="always" burned the anonymous quota and
      # start-limit-hit the unit). Use --regenerate-style manual pull for updates.
      pull = "missing";
      autoStart = true;
      ports = [ "127.0.0.1:8082:80" ];
      extraOptions = [
        "--add-host=host.containers.internal:host-gateway"
      ];
      environment = {
        TZ = config.fastfree.extra.timezone;
        PMA_HOST = "host.containers.internal";
        PMA_PORT = "3306";
        UPLOAD_LIMIT = "50M";
      };
      environmentFiles = [
        config.clan.core.vars.generators.mariadb-root.files.pma-env.path
      ];
    };

    systemd.services."phpmyadmin" = {
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };
  };
}
