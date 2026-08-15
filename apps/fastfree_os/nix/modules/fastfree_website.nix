{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
in {
  config = lib.mkIf config.fastfree.apps.fastfree_website {

    # ── 1. Shared Podman network ───────────────────────────
    systemd.services."fastfree-website-network" = {
      description = "Create shared podman network for Website containers";
      wantedBy = [ "multi-user.target" ];
      before = [
        "fastfree-website-frontend.service"
      ];
      serviceConfig.Type = "oneshot";
      script = ''
        ${pkgs.podman}/bin/podman network inspect fastfree-website-net >/dev/null 2>&1 || \
          ${pkgs.podman}/bin/podman network create fastfree-website-net
      '';
    };

    # ── 2. Frontend container (Next.js standalone server) ─
    virtualisation.oci-containers.containers.fastfree-website-frontend = {
      image = "ghcr.io/${ghAccount}/fastfree_website:latest";
      autoStart = true;
      ports = [ "9004:3000" ];
      extraOptions = [
        "--network=fastfree-website-net"
      ];
      environment = {
        NODE_ENV = "production";
        PORT = "3000";
        HOSTNAME = "0.0.0.0";
      };
    };

    systemd.services."fastfree-website-frontend" = {
      after = [ "fastfree-website-network.service" ];
      requires = [ "fastfree-website-network.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };
  };
}
