{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
in {
  config = lib.mkIf config.fastfree.apps.fastfree_pos {

    # ── 1. Shared Podman network ───────────────────────────
    systemd.services."fastfree-pos-network" = {
      description = "Create shared podman network for POS containers";
      wantedBy = [ "multi-user.target" ];
      before = [
        "fastfree-pos-frontend.service"
      ];
      serviceConfig.Type = "oneshot";
      script = ''
        ${pkgs.podman}/bin/podman network inspect fastfree-pos-net >/dev/null 2>&1 || \
          ${pkgs.podman}/bin/podman network create fastfree-pos-net
      '';
    };

    # ── 2. Caddyfile generation ────────────────────────────
    systemd.services."fastfree-pos-caddyfile" = {
      description = "Generate Caddyfile for POS Frontend";
      before = [ "fastfree-pos-frontend.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      script = ''
        mkdir -p /etc/fastfree/caddy
        cat > /etc/fastfree/caddy/pos-Caddyfile << 'CADDY'
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
    virtualisation.oci-containers.containers.fastfree-pos-frontend = {
      image = "ghcr.io/${ghAccount}/fastfree_pos:latest";
      autoStart = true;
      ports = [ "9003:80" ];
      extraOptions = [
        "--network=fastfree-pos-net"
      ];
      volumes = [
        "/etc/fastfree/caddy/pos-Caddyfile:/etc/caddy/Caddyfile:ro"
      ];
    };

    systemd.services."fastfree-pos-frontend" = {
      after = [ "fastfree-pos-network.service" "fastfree-pos-caddyfile.service" ];
      requires = [ "fastfree-pos-network.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };
  };
}
