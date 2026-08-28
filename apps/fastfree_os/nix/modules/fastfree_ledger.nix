{ config, lib, pkgs, ... }:

let
  ghAccount = lib.strings.toLower config.fastfree.githubAccount;
in {
  config = lib.mkIf config.fastfree.apps.fastfree_ledger {

    # ── 1. Caddyfile generation ────────────────────────────
    systemd.services."fastfree-ledger-caddyfile" = {
      description = "Generate Caddyfile for Ledger Frontend";
      before = [ "fastfree-ledger-frontend.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig.Type = "oneshot";
      script = ''
        mkdir -p /etc/fastfree/caddy
        cat > /etc/fastfree/caddy/ledger-Caddyfile << 'CADDY'
{
    admin off
}
:9000 {
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
    virtualisation.oci-containers.containers.fastfree-ledger-frontend = {
      image = "ghcr.io/${ghAccount}/fastfree_ledger:latest";
      pull = "always";
      autoStart = true;
      extraOptions = [
        "--network=host"
      ];
      volumes = [
        "/etc/fastfree/caddy/ledger-Caddyfile:/etc/caddy/Caddyfile:ro"
      ];
    };

    systemd.services."fastfree-ledger-frontend" = {
      after = [ "fastfree-backend-network.service" "fastfree-ledger-caddyfile.service" ];
      requires = [ "fastfree-backend-network.service" ];
      serviceConfig.Restart = "on-failure";
      serviceConfig.RestartSec = "5";
    };
  };
}
