{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
in {
  config = lib.mkIf config.fastfree.apps.fastfree_ledger {

    # ── 1. Shared Podman network ───────────────────────────
    systemd.services."fastfree-ledger-network" = {
      description = "Create shared podman network for Ledger containers";
      wantedBy = [ "multi-user.target" ];
      before = [
        "fastfree-ledger-frontend.service"
      ];
      serviceConfig.Type = "oneshot";
      script = ''
        ${pkgs.podman}/bin/podman network inspect fastfree-ledger-net >/dev/null 2>&1 || \
          ${pkgs.podman}/bin/podman network create fastfree-ledger-net
      '';
    };

    # ── 2. Caddyfile generation ────────────────────────────
    systemd.services."fastfree-ledger-caddyfile" = {
      description = "Generate Caddyfile for Ledger Frontend";
      before = [ "fastfree-ledger-frontend.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      script = ''
        mkdir -p /etc/fastfree/caddy
        cat > /etc/fastfree/caddy/ledger-Caddyfile << 'CADDY'
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
    virtualisation.oci-containers.containers.fastfree-ledger-frontend = {
      image = "ghcr.io/${ghAccount}/fastfree_ledger:latest";
      autoStart = true;
      ports = [ "9000:80" ];
      extraOptions = [
        "--network=fastfree-ledger-net"
      ];
      volumes = [
        "/etc/fastfree/caddy/ledger-Caddyfile:/etc/caddy/Caddyfile:ro"
      ];
    };

    systemd.services."fastfree-ledger-frontend" = {
      after = [ "fastfree-ledger-network.service" "fastfree-ledger-caddyfile.service" ];
      requires = [ "fastfree-ledger-network.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };
  };
}
