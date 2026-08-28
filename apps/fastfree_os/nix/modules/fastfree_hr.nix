{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
in {
  config = lib.mkIf config.fastfree.apps.fastfree_hr {

    # ── 1. Caddyfile generation ────────────────────────────
    systemd.services."fastfree-hr-caddyfile" = {
      description = "Generate Caddyfile for HR Frontend";
      before = [ "fastfree-hr-frontend.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      script = ''
        mkdir -p /etc/fastfree/caddy
        cat > /etc/fastfree/caddy/hr-Caddyfile << 'CADDY'
:9002 {
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
      pull = "always";
      autoStart = true;
      extraOptions = [
        "--network=host"
      ];
      volumes = [
        "/etc/fastfree/caddy/hr-Caddyfile:/etc/caddy/Caddyfile:ro"
      ];
    };

    systemd.services."fastfree-hr-frontend" = {
      after = [ "fastfree-backend-network.service" "fastfree-hr-caddyfile.service" ];
      requires = [ "fastfree-backend-network.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };
  };
}
