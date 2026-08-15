{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
in {
  config = lib.mkIf config.fastfree.apps.fastfree_erp {

    # ── 1. Caddyfile generation ────────────────────────────
    systemd.services."fastfree-erp-caddyfile" = {
      description = "Generate Caddyfile for ERP Frontend";
      before = [ "fastfree-erp-frontend.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      script = ''
        mkdir -p /etc/fastfree/caddy
        cat > /etc/fastfree/caddy/erp-Caddyfile << 'CADDY'
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
    virtualisation.oci-containers.containers.fastfree-erp-frontend = {
      image = "ghcr.io/${ghAccount}/fastfree_erp:latest";
      autoStart = true;
      ports = [ "9001:80" ];
      extraOptions = [
        "--network=fastfree-net"
      ];
      volumes = [
        "/etc/fastfree/caddy/erp-Caddyfile:/etc/caddy/Caddyfile:ro"
      ];
    };

    systemd.services."fastfree-erp-frontend" = {
      after = [ "fastfree-network.service" "fastfree-erp-caddyfile.service" ];
      requires = [ "fastfree-network.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };
  };
}
