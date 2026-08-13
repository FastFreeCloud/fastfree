{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
in {
  config = lib.mkIf config.fastfree.apps.fastfree_hr {

    # ── 1. Shared Podman network ───────────────────────────
    systemd.services."fastfree-hr-network" = {
      description = "Create shared podman network for HR containers";
      wantedBy = [ "multi-user.target" ];
      before = [
        "fastfree-hr-frontend.service"
      ];
      serviceConfig.Type = "oneshot";
      script = ''
        ${pkgs.podman}/bin/podman network inspect fastfree-hr-net >/dev/null 2>&1 || \
          ${pkgs.podman}/bin/podman network create fastfree-hr-net
      '';
    };

    # ── 2. Caddyfile generation ────────────────────────────
    systemd.services."fastfree-hr-caddyfile" = {
      description = "Generate Caddyfile for HR Frontend";
      before = [ "fastfree-hr-frontend.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      script = ''
        mkdir -p /etc/fastfree/caddy
        cat > /etc/fastfree/caddy/hr-Caddyfile << 'CADDY'
:80 {
    root * /srv

    @api path /api/*
    handle @api {
        reverse_proxy fastfree-backend-app:8000
    }

    @socketio path /socket.io/*
    handle @socketio {
        reverse_proxy fastfree-backend-websocket:9000
    }

    handle {
        try_files {path} /index.html
        file_server
    }

    log {
        output stdout
        format console
        level info
    }
}
CADDY
      '';
    };

    # ── 3. Frontend container (Caddy + built assets) ───────
    virtualisation.oci-containers.containers.fastfree-hr-frontend = {
      image = "ghcr.io/${ghAccount}/fastfree_hr:latest";
      autoStart = true;
      ports = [ "9002:80" ];
      extraOptions = [
        "--network=fastfree-hr-net"
      ];
      volumes = [
        "/etc/fastfree/caddy/hr-Caddyfile:/etc/caddy/Caddyfile:ro"
      ];
    };

    systemd.services."fastfree-hr-frontend" = {
      after = [ "fastfree-hr-network.service" "fastfree-hr-caddyfile.service" ];
      requires = [ "fastfree-hr-network.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };
  };
}
