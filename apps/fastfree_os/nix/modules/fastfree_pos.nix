{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
in {
  config = lib.mkIf config.fastfree.apps.fastfree_pos {

    # ── 1. Caddyfile generation ────────────────────────────
    systemd.services."fastfree-pos-caddyfile" = {
      description = "Generate Caddyfile for POS Frontend";
      before = [ "fastfree-pos-frontend.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      script = ''
        mkdir -p /etc/fastfree/caddy
        cat > /etc/fastfree/caddy/pos-Caddyfile << 'CADDY'
:9003 {
    root * /srv

    @api path /api/*
    handle @api {
        reverse_proxy 127.0.0.1:8000
    }

    @socketio path /socket.io/*
    handle @socketio {
        reverse_proxy 127.0.0.1:9000
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
      pull = "always";
      autoStart = true;
      extraOptions = [
        "--network=host"
      ];
      volumes = [
        "/etc/fastfree/caddy/pos-Caddyfile:/etc/caddy/Caddyfile:ro"
      ];
    };

    systemd.services."fastfree-pos-frontend" = {
      after = [ "fastfree-backend-network.service" "fastfree-pos-caddyfile.service" ];
      requires = [ "fastfree-backend-network.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };
  };
}
